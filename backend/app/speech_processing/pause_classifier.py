"""Pause classifier — inverts VAD speech segments into silence gaps and classifies them.

Pause types:
    - micro (< 0.25s): ignored, not worth reporting
    - natural (0.25s – 1.0s): healthy, expected pauses
    - hesitation (1.0s – 2.5s): may indicate uncertainty
    - lost_train_of_thought (> 2.5s): significant interruption
"""

from .vad_service import PAUSE_MICRO_MAX_S, PAUSE_NATURAL_MAX_S, PAUSE_HESITATION_MAX_S


def speech_segments_to_pauses(speech_segments, total_duration_s):
    """speech_segments: [(start_s, end_s), ...], sorted.
    Returns the gaps between/around them as raw pause candidates."""
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
    """Returns list of classified pause events (excluding micro-pauses)."""
    events = []
    for start, end in speech_segments_to_pauses(speech_segments, total_duration_s):
        pause_type = classify_pause(end - start)
        if pause_type is not None:
            events.append({
                "start": round(start, 2),
                "end": round(end, 2),
                "duration": round(end - start, 2),
                "type": pause_type,
            })
    return events
