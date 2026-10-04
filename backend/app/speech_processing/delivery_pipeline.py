"""Speech delivery feedback pipeline — prosodic analysis + LLM coaching.

Adapted from the speech_delivery_feedback_pipeline.ipynb notebook.
Analyzes pace, pitch, loudness per sentence and generates Toastmasters-style feedback.

Pipeline:
    1. Segment transcript into sentence-level units (using word timestamps)
    2. Extract prosodic features per unit: pitch (F0), loudness, speaking rate
    3. Compute baselines (global, rolling, neighbour deltas)
    4. Apply perceptual thresholds to generate labeled events
    5. Detect multi-unit patterns (monotone stretches, sustained fast/slow runs)
    6. Generate coaching feedback via Groq LLM

No audio-input LLM is used — all acoustic analysis is classical DSP.
"""

import json
import logging
import math
import re
from dataclasses import dataclass, asdict
from typing import List, Optional

import numpy as np
import librosa

try:
    import parselmouth
    HAVE_PARSELMOUTH = True
except ImportError:
    HAVE_PARSELMOUTH = False

from groq import Groq
from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Perceptual thresholds ──
PACE_REL_THRESHOLD = 0.20       # 20% relative change in syllables/sec
PITCH_SEMITONE_THRESHOLD = 1.5  # semitones
LOUDNESS_DB_THRESHOLD = 2.5     # dB
MONOTONE_RUN_LENGTH = 4         # consecutive 'no-change' units to flag
SUSTAINED_RUN_LENGTH = 3        # consecutive same-direction units to flag
ROLLING_WINDOW = 3              # units, for the rolling local baseline


# ── Data classes ──

@dataclass
class Unit:
    index: int
    text: str
    start: float
    end: float
    words: List[dict]
    pause_before: Optional[float] = None
    pause_after: Optional[float] = None


@dataclass
class UnitFeatures:
    index: int
    text: str
    start: float
    end: float
    pause_before: Optional[float]
    pause_after: Optional[float]
    syll_per_sec: float
    pitch_median_hz: float
    pitch_p10_hz: float
    pitch_p90_hz: float
    loudness_mean_db: float
    loudness_peak_db: float


# ── Step 1: Sentence segmentation ──

SENTENCE_END_RE = re.compile(r'[.!?]+$')


def build_sentence_units(words: List[dict]) -> List[Unit]:
    """Group words into sentence-level units using terminal punctuation."""
    units = []
    current = []
    for w in words:
        current.append(w)
        token = w['word'].strip()
        if SENTENCE_END_RE.search(token):
            units.append(current)
            current = []
    if current:
        units.append(current)

    result = []
    for i, u in enumerate(units):
        text = ' '.join(w['word'].strip() for w in u)
        start, end = u[0]['start'], u[-1]['end']
        result.append(Unit(index=i, text=text, start=start, end=end, words=u))

    for i, u in enumerate(result):
        u.pause_before = u.start - result[i - 1].end if i > 0 else None
        u.pause_after = result[i + 1].start - u.end if i < len(result) - 1 else None

    return result


# ── Step 2: Feature extraction ──

def extract_f0_track(y: np.ndarray, sr: int, fmin: float = 75.0, fmax: float = 400.0):
    """Return (times, f0) with unvoiced frames as nan."""
    if HAVE_PARSELMOUTH:
        snd = parselmouth.Sound(y, sampling_frequency=sr)
        pitch = snd.to_pitch(time_step=0.01, pitch_floor=fmin, pitch_ceiling=fmax)
        times = pitch.ts()
        f0 = pitch.selected_array['frequency']
        f0 = np.where(f0 == 0, np.nan, f0)
        return times, f0
    else:
        f0, voiced_flag, _ = librosa.pyin(y, fmin=fmin, fmax=fmax, sr=sr)
        times = librosa.times_like(f0, sr=sr)
        f0 = np.where(voiced_flag, f0, np.nan)
        return times, f0


def extract_loudness_track(y: np.ndarray, sr: int, frame_length: int = 2048, hop_length: int = 512):
    """Return (times, db) — RMS energy converted to dB."""
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    db = librosa.amplitude_to_db(rms, ref=1e-5)
    times = librosa.times_like(rms, sr=sr, hop_length=hop_length)
    return times, db


def slice_track(times: np.ndarray, values: np.ndarray, t0: float, t1: float) -> np.ndarray:
    mask = (times >= t0) & (times <= t1)
    return values[mask]


# ── Step 3: Speaking rate ──

VOWEL_GROUP_RE = re.compile(r'[aeiouy]+', re.IGNORECASE)


def estimate_syllables(word: str) -> int:
    """Cheap heuristic syllable counter (vowel-group counting)."""
    w = re.sub(r"[^a-zA-Z']", '', word).lower()
    if not w:
        return 0
    groups = VOWEL_GROUP_RE.findall(w)
    count = len(groups)
    if w.endswith('e') and not w.endswith('le') and count > 1:
        count -= 1
    return max(count, 1)


def unit_speaking_rate(unit: Unit) -> dict:
    """Syllables/sec using only time spent speaking (not wall-clock)."""
    syllables = sum(estimate_syllables(w['word']) for w in unit.words)
    speaking_time = sum(max(w['end'] - w['start'], 0.0) for w in unit.words)
    speaking_time = max(speaking_time, 1e-6)
    return {
        'syllables': syllables,
        'speaking_time': speaking_time,
        'syll_per_sec': syllables / speaking_time,
        'wall_duration': unit.end - unit.start,
    }


# ── Step 4: Per-unit feature table ──

def compute_unit_features(units: List[Unit], y: np.ndarray, sr: int) -> List[UnitFeatures]:
    f0_times, f0_vals = extract_f0_track(y, sr)
    db_times, db_vals = extract_loudness_track(y, sr)

    features = []
    for u in units:
        rate = unit_speaking_rate(u)

        f0_slice = slice_track(f0_times, f0_vals, u.start, u.end)
        f0_voiced = f0_slice[~np.isnan(f0_slice)]
        if len(f0_voiced) == 0:
            pitch_med, pitch_p10, pitch_p90 = float('nan'), float('nan'), float('nan')
        else:
            pitch_med = float(np.median(f0_voiced))
            pitch_p10 = float(np.percentile(f0_voiced, 10))
            pitch_p90 = float(np.percentile(f0_voiced, 90))

        db_slice = slice_track(db_times, db_vals, u.start, u.end)
        loud_mean = float(np.mean(db_slice)) if len(db_slice) else float('nan')
        loud_peak = float(np.max(db_slice)) if len(db_slice) else float('nan')

        features.append(UnitFeatures(
            index=u.index, text=u.text, start=u.start, end=u.end,
            pause_before=u.pause_before, pause_after=u.pause_after,
            syll_per_sec=rate['syll_per_sec'],
            pitch_median_hz=pitch_med, pitch_p10_hz=pitch_p10, pitch_p90_hz=pitch_p90,
            loudness_mean_db=loud_mean, loudness_peak_db=loud_peak,
        ))
    return features


# ── Step 5: Baselines and comparison helpers ──

def hz_to_semitones(hz: float, ref_hz: float) -> float:
    if hz is None or ref_hz is None or math.isnan(hz) or math.isnan(ref_hz) or hz <= 0 or ref_hz <= 0:
        return float('nan')
    return 12.0 * math.log2(hz / ref_hz)


def compute_baselines(features: List[UnitFeatures]) -> dict:
    pace = np.array([f.syll_per_sec for f in features])
    pitch_hz = np.array([f.pitch_median_hz for f in features])
    loud = np.array([f.loudness_mean_db for f in features])

    return {
        'global_pace': float(np.nanmedian(pace)),
        'global_pitch_hz': float(np.nanmedian(pitch_hz)),
        'global_loud': float(np.nanmean(loud)),
    }


def rolling_median(values: List[float], i: int, window: int) -> float:
    lo = max(0, i - window)
    window_vals = [v for v in values[lo:i] if v is not None and not (isinstance(v, float) and math.isnan(v))]
    if not window_vals:
        return float('nan')
    return float(np.median(window_vals))


def pct_change(new, old):
    if old in (0, None) or (isinstance(old, float) and math.isnan(old)):
        return float('nan')
    if new is None or (isinstance(new, float) and math.isnan(new)):
        return float('nan')
    return (new - old) / abs(old)


# ── Step 6: Labeled events ──

def label_change(value: float, threshold: float, higher_label: str, lower_label: str, none_label: str = 'steady') -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return none_label
    if value > threshold:
        return higher_label
    if value < -threshold:
        return lower_label
    return none_label


def _safe_round(val, digits=2):
    """Round a value, returning None if NaN."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    return round(val, digits)


def build_unit_events(features: List[UnitFeatures], baselines: dict) -> List[dict]:
    ref_pitch_hz = baselines['global_pitch_hz']
    pace_list = [f.syll_per_sec for f in features]
    pitch_list = [f.pitch_median_hz for f in features]
    loud_list = [f.loudness_mean_db for f in features]

    events = []
    for i, f in enumerate(features):
        pitch_st = hz_to_semitones(f.pitch_median_hz, ref_pitch_hz)
        pitch_range_st = (
            hz_to_semitones(f.pitch_p90_hz, f.pitch_p10_hz) if not math.isnan(f.pitch_p10_hz) else float('nan')
        )

        # vs global
        pace_vs_global = pct_change(f.syll_per_sec, baselines['global_pace'])
        loud_vs_global = f.loudness_mean_db - baselines['global_loud'] if not math.isnan(f.loudness_mean_db) else float('nan')

        # vs rolling local baseline
        pace_roll = rolling_median(pace_list, i, ROLLING_WINDOW)
        loud_roll = rolling_median(loud_list, i, ROLLING_WINDOW)
        pace_vs_roll = pct_change(f.syll_per_sec, pace_roll)
        loud_vs_roll = f.loudness_mean_db - loud_roll if not math.isnan(loud_roll) else float('nan')

        # vs previous / next unit
        pace_vs_prev = pct_change(f.syll_per_sec, pace_list[i - 1]) if i > 0 else float('nan')
        pace_vs_next = pct_change(f.syll_per_sec, pace_list[i + 1]) if i < len(features) - 1 else float('nan')
        pitch_vs_prev = hz_to_semitones(f.pitch_median_hz, pitch_list[i - 1]) if i > 0 else float('nan')
        pitch_vs_next = hz_to_semitones(f.pitch_median_hz, pitch_list[i + 1]) if i < len(features) - 1 else float('nan')
        loud_vs_prev = f.loudness_mean_db - loud_list[i - 1] if i > 0 else float('nan')
        loud_vs_next = f.loudness_mean_db - loud_list[i + 1] if i < len(features) - 1 else float('nan')

        events.append({
            'index': i,
            'text': f.text,
            'start': round(f.start, 2),
            'end': round(f.end, 2),
            'pause_before_s': _safe_round(f.pause_before),
            'pause_after_s': _safe_round(f.pause_after),
            'pace_syll_per_sec': round(f.syll_per_sec, 2),
            'pace_label_vs_prev': label_change(pace_vs_prev, PACE_REL_THRESHOLD, 'faster', 'slower'),
            'pace_label_vs_next': label_change(pace_vs_next, PACE_REL_THRESHOLD, 'faster', 'slower'),
            'pace_label_vs_global': label_change(pace_vs_global, PACE_REL_THRESHOLD, 'faster', 'slower'),
            'pitch_semitone_vs_speaker_median': _safe_round(pitch_st),
            'pitch_range_semitones': _safe_round(pitch_range_st),
            'pitch_label_vs_prev': label_change(pitch_vs_prev, PITCH_SEMITONE_THRESHOLD, 'higher', 'lower'),
            'pitch_label_vs_next': label_change(pitch_vs_next, PITCH_SEMITONE_THRESHOLD, 'higher', 'lower'),
            'loudness_db_vs_global': _safe_round(loud_vs_global),
            'loudness_label_vs_prev': label_change(loud_vs_prev, LOUDNESS_DB_THRESHOLD, 'louder', 'softer'),
            'loudness_label_vs_next': label_change(loud_vs_next, LOUDNESS_DB_THRESHOLD, 'louder', 'softer'),
            'loudness_label_vs_rolling': label_change(loud_vs_roll, LOUDNESS_DB_THRESHOLD, 'louder', 'softer'),
            'pace_label_vs_rolling': label_change(pace_vs_roll, PACE_REL_THRESHOLD, 'faster', 'slower'),
        })
    return events


# ── Step 7: Pattern detection ──

def detect_patterns(events: List[dict]) -> List[dict]:
    patterns = []

    # Monotone run
    run_start = None
    for i, e in enumerate(events):
        is_flat = (
            e['pace_label_vs_rolling'] == 'steady'
            and e['pitch_label_vs_prev'] == 'steady'
            and e['loudness_label_vs_rolling'] == 'steady'
        )
        if is_flat:
            if run_start is None:
                run_start = i
        else:
            if run_start is not None and i - run_start >= MONOTONE_RUN_LENGTH:
                patterns.append({
                    'type': 'monotone_stretch',
                    'start_index': run_start, 'end_index': i - 1,
                    'start_time': events[run_start]['start'], 'end_time': events[i - 1]['end'],
                })
            run_start = None
    if run_start is not None and len(events) - run_start >= MONOTONE_RUN_LENGTH:
        patterns.append({
            'type': 'monotone_stretch',
            'start_index': run_start, 'end_index': len(events) - 1,
            'start_time': events[run_start]['start'], 'end_time': events[-1]['end'],
        })

    # Sustained fast/slow runs
    for direction in ('faster', 'slower'):
        run_start = None
        for i, e in enumerate(events):
            if e['pace_label_vs_global'] == direction:
                if run_start is None:
                    run_start = i
            else:
                if run_start is not None and i - run_start >= SUSTAINED_RUN_LENGTH:
                    patterns.append({
                        'type': f'sustained_{direction}',
                        'start_index': run_start, 'end_index': i - 1,
                        'start_time': events[run_start]['start'], 'end_time': events[i - 1]['end'],
                    })
                run_start = None
        if run_start is not None and len(events) - run_start >= SUSTAINED_RUN_LENGTH:
            patterns.append({
                'type': f'sustained_{direction}',
                'start_index': run_start, 'end_index': len(events) - 1,
                'start_time': events[run_start]['start'], 'end_time': events[-1]['end'],
            })

    # Emphasis without pause
    for e in events:
        if (e['pause_before_s'] is not None and e['pause_before_s'] < 0.15
                and e['loudness_label_vs_prev'] == 'louder'
                and e['pitch_label_vs_prev'] == 'higher'):
            patterns.append({
                'type': 'emphasis_without_pause',
                'start_index': e['index'], 'end_index': e['index'],
                'start_time': e['start'], 'end_time': e['end'],
            })

    return patterns


# ── Step 8: LLM feedback synthesis ──

FEEDBACK_SYSTEM_PROMPT = """You are an experienced Toastmasters evaluator giving verbal delivery feedback \
on a speech. You will be given the transcript split into sentences, and for each sentence a set \
of pre-computed, already-labeled measurements about pace, pitch and loudness, each compared to \
the previous sentence, the next sentence, and the speaker's own overall average. You will also \
get a list of detected patterns (e.g. monotone stretches, sustained fast/slow runs).

Rules:
- Only comment on things supported by the data you were given. Do not invent measurements.
- Give 2-4 specific strengths and 2-4 specific areas to improve, each tied to an exact sentence \
or time range from the data.
- Prefer concrete, actionable notes ('slow down on your key line at 0:42') over vague praise.
- Keep it in the voice of a supportive but direct Toastmasters evaluator.
"""


def generate_delivery_feedback(events: List[dict], patterns: List[dict]) -> str:
    """Generate coaching feedback using Groq LLM."""
    settings = get_settings()
    client = Groq(api_key=settings.GROQ_API_KEY)

    payload = {'sentences': events, 'patterns': patterns}
    user_prompt = (
        'Here is the measured delivery data for one speech, as JSON:\n\n'
        + json.dumps(payload, indent=2)
        + '\n\nWrite the evaluator feedback now.'
    )

    logger.info("Generating delivery feedback via Groq LLM...")
    response = client.chat.completions.create(
        model=settings.GROQ_CHAT_MODEL,
        max_tokens=1500,
        temperature=0.2,
        messages=[
            {'role': 'system', 'content': FEEDBACK_SYSTEM_PROMPT},
            {'role': 'user', 'content': user_prompt},
        ],
    )
    feedback = response.choices[0].message.content or ''
    logger.info("Delivery feedback generated (%d chars)", len(feedback))
    return feedback


# ── Step 9: End-to-end pipeline ──

def analyze_delivery(y: np.ndarray, sr: int, word_timestamps: List[dict]) -> dict:
    """Run the full delivery analysis pipeline on an audio array.

    Args:
        y: 1D float32 numpy array of audio.
        sr: Sample rate.
        word_timestamps: List of {word, start, end} dicts from Whisper.

    Returns:
        Dict with baselines, events, patterns, and feedback text.
    """
    logger.info("Starting delivery analysis")

    # Segment into sentences
    units = build_sentence_units(word_timestamps)
    if not units:
        logger.warning("No sentence units found — skipping delivery analysis")
        return {
            'baselines': {},
            'sentence_events': [],
            'patterns': [],
            'delivery_feedback': 'Not enough speech data to analyze delivery.',
        }

    # Extract features
    features = compute_unit_features(units, y, sr)
    baselines = compute_baselines(features)

    # Build events and detect patterns
    events = build_unit_events(features, baselines)
    patterns = detect_patterns(events)

    # Generate LLM feedback
    feedback = generate_delivery_feedback(events, patterns)

    # Round baselines for JSON serialization
    clean_baselines = {
        'global_pace_syll_per_sec': _safe_round(baselines['global_pace']),
        'global_pitch_hz': _safe_round(baselines['global_pitch_hz']),
        'global_loudness_db': _safe_round(baselines['global_loud']),
    }

    logger.info(
        "Delivery analysis complete: %d sentences, %d patterns detected",
        len(events), len(patterns),
    )

    return {
        'baselines': clean_baselines,
        'sentence_events': events,
        'patterns': patterns,
        'delivery_feedback': feedback,
    }
