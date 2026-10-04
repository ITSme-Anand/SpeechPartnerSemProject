"""Filler classifier — wav2vec2 frozen encoder + trained classification head.

The head classifies ~1-second audio clips into 6 classes:
    Words, Uh, Um, Breath, Laughter, Music

Only "Uh" and "Um" are treated as fillers downstream.

Architecture must match training exactly:
    Linear(768→128) → ReLU → Dropout(0.2) → Linear(128→6)
"""

import logging
import os

import numpy as np
import torch
import torch.nn as nn
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2Model

logger = logging.getLogger(__name__)

CLASSES = ["Words", "Uh", "Um", "Breath", "Laughter", "Music"]
FILLER_CLASSES = {"Uh", "Um"}
SAMPLE_RATE = 16000

CHECKPOINT_PATH = os.path.join(
    os.path.dirname(__file__), "models", "filler_classifier_head_best.pt"
)
WAV2VEC_MODEL_NAME = "facebook/wav2vec2-base"


class FillerClassifierHead(nn.Module):
    """Must match the training notebook's architecture exactly — this is a
    state_dict load, not a full pickled model."""

    def __init__(self, in_dim=768, hidden=128, n_classes=len(CLASSES)):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden, n_classes),
        )

    def forward(self, x):
        return self.net(x)


class FillerDetector:
    """Loads once at app startup. Holds the frozen encoder + trained head."""

    def __init__(self, device="cpu"):
        self.device = torch.device(device)

        logger.info("Loading wav2vec2 feature extractor and encoder (%s)...", WAV2VEC_MODEL_NAME)
        self.extractor = Wav2Vec2FeatureExtractor.from_pretrained(WAV2VEC_MODEL_NAME)
        self.encoder = Wav2Vec2Model.from_pretrained(WAV2VEC_MODEL_NAME).to(self.device)
        self.encoder.eval()
        for p in self.encoder.parameters():
            p.requires_grad = False

        logger.info("Loading filler classifier head from %s...", CHECKPOINT_PATH)
        self.head = FillerClassifierHead().to(self.device)
        self.head.load_state_dict(
            torch.load(CHECKPOINT_PATH, map_location=self.device, weights_only=True)
        )
        self.head.eval()
        logger.info("Filler detector ready.")

    @torch.no_grad()
    def _embed(self, clip_waveform: np.ndarray):
        """clip_waveform: 1D float32 numpy array, 16kHz, ~1 second."""
        inputs = self.extractor(
            clip_waveform, sampling_rate=SAMPLE_RATE, return_tensors="pt"
        )
        hidden = self.encoder(
            inputs["input_values"].to(self.device)
        ).last_hidden_state
        return hidden.mean(dim=1)  # (1, 768)

    @torch.no_grad()
    def classify_clip(self, clip_waveform: np.ndarray, confidence_threshold=0.5):
        """Returns (predicted_class: str, confidence: float, is_filler: bool)."""
        embedding = self._embed(clip_waveform)
        logits = self.head(embedding)
        probs = torch.softmax(logits, dim=1).squeeze(0)
        pred_idx = int(probs.argmax())
        pred_class = CLASSES[pred_idx]
        confidence = float(probs[pred_idx])
        is_filler = pred_class in FILLER_CLASSES and confidence >= confidence_threshold
        return pred_class, confidence, is_filler
