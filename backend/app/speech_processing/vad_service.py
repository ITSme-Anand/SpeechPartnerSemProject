"""Silero VAD service — loaded once at startup, reused by pause detection and filler detection.

Calibrated hyperparameters (from the project's own dev-set sweep):
    threshold:       0.35   (lower than default 0.5 — more willing to call a frame "speech")
    min_speech_ms:   400    (minimum duration for a speech segment to count)
    min_silence_ms:  400    (minimum duration for a silence gap to count as a real pause)
"""

import logging

import numpy as np
import torch
from silero_vad import load_silero_vad, get_speech_timestamps

logger = logging.getLogger(__name__)

SAMPLE_RATE = 16000

# Calibrated on dev set — see 02_pause_detection_integration.md
VAD_THRESHOLD = 0.35
MIN_SPEECH_MS = 400
MIN_SILENCE_MS = 400

# Pause-type duration boundaries (seconds)
PAUSE_MICRO_MAX_S = 0.25
PAUSE_NATURAL_MAX_S = 1.00
PAUSE_HESITATION_MAX_S = 2.50


class VADService:
    """Loads once at app startup — reused by both the standalone pause-feedback
    feature and the filler-detection gap finder."""

    def __init__(self):
        logger.info("Loading Silero VAD model...")
        self.model = load_silero_vad()
        logger.info("Silero VAD model loaded.")

    def get_speech_segments(self, audio: np.ndarray, sr: int = SAMPLE_RATE):
        """audio: 1D float32 numpy array, 16 kHz mono.
        Returns [(start_s, end_s), ...] — speech-active segments."""
        if sr != SAMPLE_RATE:
            raise ValueError(f"Expected {SAMPLE_RATE}Hz audio, got {sr}Hz — resample first.")

        # Silero expects a torch tensor
        audio_tensor = torch.from_numpy(audio).float()

        timestamps = get_speech_timestamps(
            audio_tensor,
            self.model,
            threshold=VAD_THRESHOLD,
            min_speech_duration_ms=MIN_SPEECH_MS,
            min_silence_duration_ms=MIN_SILENCE_MS,
            sampling_rate=SAMPLE_RATE,
            return_seconds=True,
        )
        return [(t["start"], t["end"]) for t in timestamps]
