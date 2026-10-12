FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies:
# - ffmpeg: required to decode and resample browser-recorded audio (WebM/Opus) to 16kHz WAV
# - libsndfile1: required by soundfile / librosa for audio I/O
# - curl: utility for Docker container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security best practices
RUN useradd -m -u 1000 appuser

ENV HOME=/home/appuser \
    PATH=/home/appuser/.local/bin:$PATH \
    HF_HOME=/home/appuser/.cache/huggingface \
    TORCH_HOME=/home/appuser/.cache/torch

WORKDIR /app
RUN chown -R appuser:appuser /app

USER appuser

# Install CPU-only PyTorch first (saves ~2GB download & memory vs default CUDA wheel)
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python packages
COPY --chown=appuser:appuser requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# Pre-download Hugging Face and Silero ML models into container image.
# This prevents 360MB download latency, cold-start pauses, and timeout errors on the first user request.
RUN python -c "\
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2Model; \
Wav2Vec2FeatureExtractor.from_pretrained('facebook/wav2vec2-base'); \
Wav2Vec2Model.from_pretrained('facebook/wav2vec2-base'); \
from silero_vad import load_silero_vad; \
load_silero_vad(); \
"

# Copy backend application code
COPY --chown=appuser:appuser app ./app

# Expose default HTTP port
EXPOSE 8000

# Run uvicorn server.
# 'exec' replaces the shell process so SIGTERM/SIGINT signals pass directly to uvicorn on container stop.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

