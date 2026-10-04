# Pause Detection — Integration Guide

**Model used:** pretrained Silero VAD (not the custom-trained CRNN from the course project)
**Consumed by:** this is also the upstream dependency for filler detection — see `01_filler_detection_integration.md`. Load it once, use it in both places.

---

## 1. Pretrained Silero VAD vs. your custom-trained CRNN — which to ship

**Use the pretrained Silero VAD in the product.** A few things worth being precise about, since "custom trained Silero VAD" isn't quite the right framing:

- Silero VAD isn't normally fine-tuned by downstream users — it ships as a fixed, already-trained model (via `torch.hub` or the `silero-vad` pip package), and that's the intended way to consume it. There isn't a standard "retrain Silero on our data" workflow the way there is for, say, a wav2vec2 classifier head.
- What **is** the correct way to adapt a pretrained VAD to a specific use case — and exactly what you already did — is calibrating its **decision threshold and hysteresis/hangover durations** on your own labeled dev data, rather than touching the network weights at all. That's precisely what the hyperparameter sweep you ran produced.
- This matches the tradeoff already written into the project: your own trained CRNN exists to satisfy the *course* requirement of building and evaluating a model yourselves, and to benchmark against Silero. For the actual *product*, Silero remains the better choice — it's more robustly validated across accents/noise/devices than a model trained on one corpus (LibriParty) with a specific calibration set, and it carries no ongoing maintenance burden.

**Bottom line:** ship pretrained Silero, calibrated with your own thresholds. That's not a compromise — it's the standard, correct way to use a pretrained VAD in production.

## 2. Your calibrated hyperparameters, explained

```
threshold:         0.35   (default is 0.5)
min_speech_ms:     400    (minimum duration for a detected speech segment to count)
min_silence_ms:    400    (minimum duration for a detected silence gap to count as a real pause)

dev_frame_f1:          0.887   — frame-by-frame speech/silence agreement with ground truth
dev_pause_f1:          0.714   — whole-pause-event agreement (stricter: a pause has to be detected
                                 as a matching event, not just overlap on some frames)
dev_pause_precision:   0.639   — of the pauses flagged, 64% are real
dev_pause_recall:      0.824   — of the real pauses, 82% get caught
```

**Why threshold 0.35, not the default 0.5:** lowering the threshold makes Silero more willing to call a frame "speech," which — combined with the 400ms minimum-silence requirement — was evidently what worked best on your dev set for distinguishing genuine pauses from micro-gaps in spontaneous speech. This is exactly the dual-threshold/hysteresis behavior discussed earlier in the project (persistence-based debouncing), just expressed through Silero's own built-in parameters rather than a hand-rolled state machine.

**What the precision/recall gap means for the product:** recall (0.82) is noticeably higher than precision (0.64) — the calibrated settings catch most real pauses, at the cost of also flagging some non-pauses. For a coaching tool, that's the right side to err on: missing a real hesitation is worse for the user than occasionally over-flagging a borderline one, especially since pause feedback is framed as "here's something to look at," not an infallible verdict.

## 3. Where it sits in the pipeline

```
Raw audio (resampled 16kHz mono)
        │
        ▼
Silero VAD (threshold=0.35, min_speech_ms=400, min_silence_ms=400)
        │
        ▼
Speech-active segments  ──────────────┬─────────────────────────────┐
        │                              │                             │
        ▼                              ▼                             │
Invert → pause segments      (consumed by filler detection,          │
        │                      doc 1, for gap-finding)                │
        ▼                                                             │
Pause classification (micro / natural / hesitation / lost-thought)    │
        │                                                             │
        ▼                                                             │
Pause feedback signal ──► feedback generation (Gemini) + Supabase ◄───┘
```

## 4. Build steps

### 4a. Dependencies

```bash
pip install silero-vad torch
```

(This is the modern, pip-installable Silero VAD package — no `torch.hub` network call needed at runtime, which matters for a production deploy where you don't want a cold-start dependent on GitHub being reachable.)

### 4b. Load once, as a singleton

```python
# app/speech_processing/vad_service.py
import numpy as np
from silero_vad import load_silero_vad, get_speech_timestamps

SAMPLE_RATE = 16000

# calibrated on dev set — see docs for what these were tuned against
VAD_THRESHOLD = 0.35
MIN_SPEECH_MS = 400
MIN_SILENCE_MS = 400

PAUSE_MICRO_MAX_S = 0.25
PAUSE_NATURAL_MAX_S = 1.00
PAUSE_HESITATION_MAX_S = 2.50


class VADService:
    """Loads once at app startup — reused by both the standalone pause-feedback
    feature and the filler-detection gap finder."""
    def __init__(self):
        self.model = load_silero_vad()

    def get_speech_segments(self, audio: np.ndarray, sr: int = SAMPLE_RATE):
        """audio: 1D float32 numpy array. Returns [(start_s, end_s), ...]."""
        if sr != SAMPLE_RATE:
            raise ValueError(f"Expected {SAMPLE_RATE}Hz audio, got {sr}Hz — resample first.")
        timestamps = get_speech_timestamps(
            audio, self.model,
            threshold=VAD_THRESHOLD,
            min_speech_duration_ms=MIN_SPEECH_MS,
            min_silence_duration_ms=MIN_SILENCE_MS,
            sampling_rate=SAMPLE_RATE,
            return_seconds=True,
        )
        return [(t["start"], t["end"]) for t in timestamps]
```

```python
# app/main.py
from app.speech_processing.vad_service import VADService

@app.on_event("startup")
def load_models():
    app.state.vad_service = VADService()
    # app.state.filler_detector = FillerDetector(...)   # from doc 1
```

### 4c. Invert speech segments into pauses, then classify them

```python
# app/speech_processing/pause_classifier.py
from .vad_service import PAUSE_MICRO_MAX_S, PAUSE_NATURAL_MAX_S, PAUSE_HESITATION_MAX_S

def speech_segments_to_pauses(speech_segments, total_duration_s):
    """speech_segments: [(start_s, end_s), ...], sorted. Returns the gaps
    between/around them as raw pause candidates."""
    pauses = []
    cursor = 0.0
    for start, end in speech_segments:
        if start > cursor:
            pauses.append((cursor, start))
        cursor = end
    if total_duration_s > cursor:
        pauses.append((cursor, total_duration_s))
    return pauses


def classify_pause(duration_s: float) -> str | None:
    """Returns None for micro-pauses (not worth reporting), else a pause_type."""
    if duration_s < PAUSE_MICRO_MAX_S:
        return None
    elif duration_s < PAUSE_NATURAL_MAX_S:
        return "natural"
    elif duration_s < PAUSE_HESITATION_MAX_S:
        return "hesitation"
    return "lost_train_of_thought"


def get_classified_pauses(speech_segments, total_duration_s):
    events = []
    for start, end in speech_segments_to_pauses(speech_segments, total_duration_s):
        pause_type = classify_pause(end - start)
        if pause_type is not None:
            events.append({"start": round(start, 2), "end": round(end, 2),
                            "duration": round(end - start, 2), "type": pause_type})
    return events
```

### 4d. Wire into the existing analysis endpoint

```python
vad_segments = app.state.vad_service.get_speech_segments(audio, sr)
pauses = get_classified_pauses(vad_segments, total_duration_s=len(audio) / sr)

# shared with filler detection (doc 1) — same vad_segments, no second VAD pass
non_lexical_fillers = detect_non_lexical_fillers(
    audio, sr, vad_segments, word_timestamps, app.state.filler_detector,
)
```

### 4e. What to store / send downstream

- **Supabase:** a `pause_events` table (or JSONB column) with `start`, `end`, `duration`, `type`. This feeds the delivery-score portion of the EMA error profile the same way filler events do.
- **Gemini feedback step:** pass the classified pause list (not just a count) so feedback can be specific — "a 2.1s hesitation right before your conclusion" is more actionable than "you paused 4 times."

## 5. Known limitations to flag, not hide

- These thresholds were calibrated on **your dev set** — if that dev set doesn't closely resemble your actual users' recording conditions (device mic, background noise, accent), re-validate before fully trusting the numbers. The same "measure before assuming it transfers" principle applies here as it did for the filler classifier.
- Precision of 0.64 at the pause-event level means roughly one in three flagged pauses isn't a "real" one by your dev-set ground truth. Combined with the deliberately generous recall, expect some over-flagging — worth deciding whether the product should show every flagged pause or only ones above a certain duration/confidence as a first filter.
- Silero VAD, like any VAD, detects **voice activity**, not **speech content** — a sustained non-speech vocal sound (humming, a long "mmm") will register as speech, not as a pause, same as it would for any VAD.

## 6. Before shipping — quick checklist

- [ ] Confirm `VADService` is instantiated once at startup, not per-request.
- [ ] Confirm the same `vad_segments` output is reused for both pause feedback and filler-detection gap-finding — don't run Silero twice per recording.
- [ ] Spot-check `get_classified_pauses` output against a few recordings by ear before trusting the "hesitation" / "lost train of thought" labels.
- [ ] Decide whether to surface low-precision edge cases (near the 400ms minimum) to users at all, or filter them more conservatively than the dev-calibrated defaults for a first release.
