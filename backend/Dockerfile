FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies:
# - ffmpeg: required to decode and resample browser-recorded audio (WebM/Opus) to 16kHz WAV
# - libsndfile1: required by soundfile / librosa for audio I/O
# - curl: container utility for health checks and connectivity debugging
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security best practices
RUN useradd -m -u 1000 appuser

ENV HOME=/home/appuser \
    PATH=/home/appuser/.local/bin:$PATH

WORKDIR /app
RUN chown -R appuser:appuser /app

USER appuser

# Install CPU-only PyTorch first (saves ~2GB download & memory vs default CUDA wheel)
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python packages
COPY --chown=appuser:appuser requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy backend application code
COPY --chown=appuser:appuser app ./app

# Expose default port (Render automatically sets $PORT at runtime, e.g. 10000)
EXPOSE 8000

# Render dynamically sets $PORT environment variable; fallback to 8000 for local runs.
# 'exec' replaces the shell with uvicorn so OS signals (SIGTERM/SIGINT) pass directly to the server.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
