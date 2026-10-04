"""End-to-end non-lexical filler detection pipeline.

Combines gap detection (VAD + transcript word timestamps) with the
filler classifier to find acoustic fillers (uh, um) in a recording.
"""

import logging

from .gap_detection import find_candidate_gaps, extract_candidate_clip

logger = logging.getLogger(__name__)


def detect_non_lexical_fillers(audio, sr, vad_speech_segments, word_timestamps, filler_detector):
    """Detect non-lexical fillers (uh, um) using the acoustic pipeline.

    Args:
        audio: 1D float32 numpy array, 16 kHz mono.
        sr: Sample rate (must be 16000).
        vad_speech_segments: [(start_s, end_s), ...] from Silero VAD.
        word_timestamps: [{"word": str, "start": float, "end": float}, ...] from Whisper.
        filler_detector: FillerDetector instance.

    Returns:
        List of filler event dicts with start, end, type, confidence.
    """
    gaps = find_candidate_gaps(vad_speech_segments, word_timestamps, len(audio) / sr)
    logger.info("Found %d candidate gaps for filler classification", len(gaps))

    events = []
    for gap_start, gap_end in gaps:
        clip = extract_candidate_clip(audio, sr, gap_start, gap_end)
        pred_class, confidence, is_filler = filler_detector.classify_clip(clip)
        if is_filler:
            events.append({
                "start": round(gap_start, 2),
                "end": round(gap_end, 2),
                "type": pred_class.lower(),  # "uh" / "um"
                "confidence": round(confidence, 3),
                "source": "acoustic",
            })

    logger.info("Detected %d non-lexical filler events", len(events))
    return events
