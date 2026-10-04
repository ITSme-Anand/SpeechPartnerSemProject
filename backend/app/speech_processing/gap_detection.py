"""Gap detection — finds audio regions where VAD says speech is happening but
the transcript has no word. These gaps are the candidate clips for filler
classification.

This is the bridge between the VAD output (doc 2) and the filler classifier (doc 1).
"""

import numpy as np

CLIP_DURATION_S = 1.0
MIN_GAP_S = 0.15  # ignore gaps shorter than this — not worth a forward pass


def find_candidate_gaps(vad_speech_segments, word_timestamps, total_duration_s):
    """
    vad_speech_segments: [(start_s, end_s), ...] from Silero VAD
    word_timestamps: [{"word": str, "start": float, "end": float}, ...] from Whisper
    Returns: [(gap_start_s, gap_end_s), ...] — VAD says speech, transcript has no word
    """
    word_spans = [(w["start"], w["end"]) for w in word_timestamps]
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
