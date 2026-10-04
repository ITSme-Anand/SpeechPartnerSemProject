"""Speech-to-Text service using Groq's Whisper API (OpenAI-compatible).

Returns both the transcript text AND word-level timestamps, which are
needed by the filler-detection and delivery-analysis pipelines.
"""

import json
import logging
import os
import tempfile

from groq import Groq

from app.config import get_settings

logger = logging.getLogger(__name__)


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """Send an audio file to Groq's Whisper API and return transcript + word timestamps.

    Args:
        audio_bytes: Raw audio file bytes (supports webm, mp3, wav, etc.)
        filename: Original filename (used for MIME type inference by the API)

    Returns:
        Dict with keys:
            - text: The full transcript string.
            - words: List of {word, start, end} dicts with word-level timestamps.

    Raises:
        Exception: If the Groq API call fails.
    """
    settings = get_settings()
    client = Groq(api_key=settings.GROQ_API_KEY)

    logger.info(
        "Sending audio to Groq Whisper STT (model=%s, size=%d bytes)",
        settings.GROQ_STT_MODEL,
        len(audio_bytes),
    )

    transcription = client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model=settings.GROQ_STT_MODEL,
        response_format="verbose_json",
        timestamp_granularities=["word", "segment"],
    )

    # Parse response — Groq returns verbose_json with words and segments
    if hasattr(transcription, 'model_dump'):
        data = transcription.model_dump()
    elif hasattr(transcription, 'to_json'):
        data = json.loads(transcription.to_json())
    else:
        data = {"text": transcription.text, "words": []}

    transcript_text = data.get("text", "")
    words = data.get("words", [])

    logger.info(
        "Transcription complete: %d characters, %d words with timestamps",
        len(transcript_text),
        len(words),
    )

    return {
        "text": transcript_text,
        "words": words,
    }


def save_audio_to_temp(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Save audio bytes to a temporary file and return the path.

    The caller is responsible for cleaning up the temp file.
    """
    suffix = os.path.splitext(filename)[1] or ".webm"
    fd, path = tempfile.mkstemp(suffix=suffix)
    try:
        os.write(fd, audio_bytes)
    finally:
        os.close(fd)
    logger.info("Saved audio to temp file: %s (%d bytes)", path, len(audio_bytes))
    return path
