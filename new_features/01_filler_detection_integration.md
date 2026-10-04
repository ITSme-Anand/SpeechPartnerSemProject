# Filler Detection — Integration Guide

**Model file:** `filler_classifier_head_best.pt`
**Depends on:** the pause-detection VAD service (see `02_pause_detection_integration.md`) — filler detection cannot run standalone, it needs VAD output as an input. Read that doc's "Pause segments → gap candidates" handoff before wiring this one in.

---

## 1. What this model actually is

| | |
|---|---|
| **Task** | 6-way clip classification: `Words`, `Uh`, `Um`, `Breath`, `Laughter`, `Music` (PodcastFillers consolidated vocabulary) |
| **Input** | One 768-dim embedding per ~1-second audio clip |
| **Embedding source** | `facebook/wav2vec2-base`, frozen, mean-pooled over the last hidden state |
| **Trained component** | Only the head — `Linear(768→128) → ReLU → Dropout(0.2) → Linear(128→6)` |
| **Checkpoint** | `filler_classifier_head_best.pt` (head weights only — wav2vec2 itself is not saved in this file, it's loaded fresh from Hugging Face each time) |
| **Measured performance** | Test accuracy ≈ 77.5%, macro-F1 ≈ 0.78. Strongest: Music (0.91), Um (0.84). Weakest: Breath (0.71), Words (0.72) |

**The one thing to get right:** this model does **not** take raw audio or a full recording as input. It classifies short, pre-isolated ~1-second candidate clips — the same way it was trained on PodcastFillers' pre-cut event clips. In production, something upstream has to decide *which* 1-second windows of the user's recording are worth classifying at all. That's the VAD-ASR gap step below, not this model's job.

## 2. Where it sits in the pipeline

```
Raw audio
   │
   ├──► Groq Whisper (existing) ──► transcript + word timestamps
   │
   └──► Silero VAD (see doc 2)  ──► speech-active segments
                    │
                    ▼
        Gap detection: VAD says speech, transcript has no word here
                    │
                    ▼
        Candidate clips (~1s, padded, centered on the gap)
                    │
                    ▼
        wav2vec2 (frozen) ──► 768-dim embedding
                    │
                    ▼
        filler_classifier_head_best.pt ──► class probabilities
                    │
                    ▼
        Keep only "Uh" / "Um" predictions ──► non-lexical filler events
                    │
                    ▼
        Merge with lexical filler detection (transcript-side, separate — "like",
        "you know", "so" — handled by your existing Gemini call, not this model)
                    │
                    ▼
        Combined filler report ──► feedback generation (Gemini) + Supabase
```

## 3. Build steps

### 3a. Dependencies

```bash
pip install torch transformers soundfile numpy
```

### 3b. Place the checkpoint

Put `filler_classifier_head_best.pt` somewhere the backend can read at startup — e.g. `app/speech_processing/models/filler_classifier_head_best.pt`. Don't put it under version control if it's large; load it from object storage (Supabase storage, S3, etc.) on deploy if your deployment pipeline doesn't ship local files.

### 3c. Define the head and load it once (singleton, not per-request)

```python
# app/speech_processing/filler_model.py
import torch
import torch.nn as nn
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2Model

CLASSES = ["Words", "Uh", "Um", "Breath", "Laughter", "Music"]
FILLER_CLASSES = {"Uh", "Um"}          # the only classes that count as a "filler" downstream
SAMPLE_RATE = 16000
CHECKPOINT_PATH = "app/speech_processing/models/filler_classifier_head_best.pt"
WAV2VEC_MODEL_NAME = "facebook/wav2vec2-base"


class FillerClassifierHead(nn.Module):
    """Must match the training notebook's architecture exactly — this is a
    state_dict load, not a full pickled model, so any shape mismatch here
    will fail to load silently-wrong or raise a key-mismatch error."""
    def __init__(self, in_dim=768, hidden=128, n_classes=len(CLASSES)):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(hidden, n_classes),
        )
    def forward(self, x):
        return self.net(x)


class FillerDetector:
    """Loads once at app startup. Holds the frozen encoder + trained head."""
    def __init__(self, device="cpu"):
        self.device = torch.device(device)
        self.extractor = Wav2Vec2FeatureExtractor.from_pretrained(WAV2VEC_MODEL_NAME)
        self.encoder = Wav2Vec2Model.from_pretrained(WAV2VEC_MODEL_NAME).to(self.device)
        self.encoder.eval()
        for p in self.encoder.parameters():
            p.requires_grad = False

        self.head = FillerClassifierHead().to(self.device)
        self.head.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=self.device))
        self.head.eval()

    @torch.no_grad()
    def _embed(self, clip_waveform):
        """clip_waveform: 1D float32 numpy array, 16kHz, ~1 second."""
        inputs = self.extractor(clip_waveform, sampling_rate=SAMPLE_RATE, return_tensors="pt")
        hidden = self.encoder(inputs["input_values"].to(self.device)).last_hidden_state
        return hidden.mean(dim=1)   # (1, 768)

    @torch.no_grad()
    def classify_clip(self, clip_waveform, confidence_threshold=0.5):
        """Returns (predicted_class: str, confidence: float, is_filler: bool)."""
        embedding = self._embed(clip_waveform)
        logits = self.head(embedding)
        probs = torch.softmax(logits, dim=1).squeeze(0)
        pred_idx = int(probs.argmax())
        pred_class = CLASSES[pred_idx]
        confidence = float(probs[pred_idx])
        is_filler = pred_class in FILLER_CLASSES and confidence >= confidence_threshold
        return pred_class, confidence, is_filler
```

Instantiate **one** `FillerDetector` at app startup (FastAPI `lifespan`/`on_startup`, stored on `app.state`), never per-request — loading wav2vec2 fresh on every call is the single easiest way to make this endpoint unusably slow. for new audio in production, you must also load:

facebook/wav2vec2-base


and use the same preprocessing:

- 16 kHz audio
- Mono waveform
- Approximately 1-second clip
- wav2vec2 feature extractor
- Mean-pool `last_hidden_state`
- Pass the resulting 768-dimensional vector to the classifier


```python
# app/main.py (or wherever your app factory lives)
from app.speech_processing.filler_model import FillerDetector

@app.on_event("startup")
def load_models():
    app.state.filler_detector = FillerDetector(device="cuda" if torch.cuda.is_available() else "cpu")
```

### 3d. Gap detection (the step that decides *what* to classify)

This needs the VAD speech segments (doc 2) and the Whisper word timestamps you already have.

```python
# app/speech_processing/gap_detection.py
import numpy as np

CLIP_DURATION_S = 1.0
MIN_GAP_S = 0.15   # ignore gaps shorter than this — not worth a forward pass

def find_candidate_gaps(vad_speech_segments, word_timestamps, total_duration_s):
    """
    vad_speech_segments: [(start_s, end_s), ...] from Silero VAD
    word_timestamps: [(word, start_s, end_s), ...] from Whisper/Groq, word-aligned
    Returns: [(gap_start_s, gap_end_s), ...] — VAD says speech, transcript has no word
    """
    word_spans = [(w[1], w[2]) for w in word_timestamps]
    gaps = []
    for seg_start, seg_end in vad_speech_segments:
        cursor = seg_start
        for w_start, w_end in word_spans:
            if w_end <= cursor or w_start >= seg_end:
                continue
            if w_start > cursor + MIN_GAP_S:
                gaps.append((cursor, w_start))
            cursor = max(cursor, w_end)
        if seg_end > cursor + MIN_GAP_S:
            gaps.append((cursor, seg_end))
    return gaps


def extract_candidate_clip(audio, sr, gap_start_s, gap_end_s):
    """Center a CLIP_DURATION_S window on the gap, padding with surrounding
    audio if the gap itself is shorter than the window (matches how
    PodcastFillers' own 1-second clips are centered on each event)."""
    gap_center = (gap_start_s + gap_end_s) / 2
    clip_start = max(0, gap_center - CLIP_DURATION_S / 2)
    clip_end = clip_start + CLIP_DURATION_S
    start_sample, end_sample = int(clip_start * sr), int(clip_end * sr)
    clip = audio[start_sample:end_sample]
    if len(clip) < int(CLIP_DURATION_S * sr):
        clip = np.pad(clip, (0, int(CLIP_DURATION_S * sr) - len(clip)))
    return clip
```

### 3e. End-to-end function

```python
# app/speech_processing/filler_pipeline.py
from .gap_detection import find_candidate_gaps, extract_candidate_clip

def detect_non_lexical_fillers(audio, sr, vad_speech_segments, word_timestamps, filler_detector):
    gaps = find_candidate_gaps(vad_speech_segments, word_timestamps, len(audio) / sr)
    events = []
    for gap_start, gap_end in gaps:
        clip = extract_candidate_clip(audio, sr, gap_start, gap_end)
        pred_class, confidence, is_filler = filler_detector.classify_clip(clip)
        if is_filler:
            events.append({
                "start": round(gap_start, 2),
                "end": round(gap_end, 2),
                "type": pred_class.lower(),       # "uh" / "um"
                "confidence": round(confidence, 3),
            })
    return events
```

### 3f. Wire into the existing analysis endpoint

Wherever the current flow calls Groq for transcription and Gemini for grammar, add the delivery-analysis call alongside it:

```python
transcript, word_timestamps = transcribe_with_groq(audio_path)          # existing
grammar_feedback = analyze_grammar_with_gemini(transcript)                # existing

vad_segments = vad_service.get_speech_segments(audio, sr)                 # doc 2
non_lexical_fillers = detect_non_lexical_fillers(
    audio, sr, vad_segments, word_timestamps, app.state.filler_detector,
)
lexical_fillers = detect_lexical_fillers(transcript)                      # your existing Gemini/regex path

all_fillers = non_lexical_fillers + lexical_fillers
```

### 3g. What to store / send downstream

- **Supabase:** a `filler_events` table (or JSONB column on the session row) with `start`, `end`, `type`, `confidence`, `source` (`"acoustic"` vs `"lexical"`) — this is what your EMA error-profiling update reads from for the filler-related error category.
- **Gemini feedback step:** pass the filler count/rate and the specific timestamped list (not just a raw count) so the generated coaching feedback can reference exact moments ("you said 'um' right before your main point at 1:42") rather than a bare number.

## 4. Known limitations to flag, not hide

- **~78% accuracy, not nearly-perfect.** Expect real false positives/negatives in production. The `confidence_threshold` parameter in `classify_clip` exists specifically so you can tune precision vs. recall for the product's needs (e.g. raise it if users complain about false "um" flags) without retraining.
- **Weakest classes are Words and Breath** — meaning a real word spoken quietly, or a breath sound, is the most likely thing to get mistaken for a filler right now. If you start seeing complaints about wrong filler flags, check those two confusions first.
- **Trained on podcast audio**, not phone-mic recordings of Indian-accented English. Validate on a handful of your own/Toastmasters-peer recordings before trusting numbers for your actual users — this was flagged as a risk from the start and hasn't been separately verified yet.

## 5. Before shipping — quick checklist

- [ ] Confirm `FillerClassifierHead` architecture in code matches exactly what produced `filler_classifier_head_best.pt` (same hidden size, same layer order) — a silent shape mismatch won't always error loudly.
- [ ] Load `FillerDetector` once at startup, confirm it isn't being re-instantiated per-request (check latency on the second request vs. the first).
- [ ] Run a handful of real user recordings through `find_candidate_gaps` and sanity-check the gaps visually/by ear before trusting the classifier's output on them.
- [ ] Decide and document a `confidence_threshold` default before launch, not after the first user complaint.
