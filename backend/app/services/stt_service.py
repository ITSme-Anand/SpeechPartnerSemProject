"""Speech-to-Text service using Groq's Whisper API (OpenAI-compatible)."""

import logging
from groq import Groq

from app.config import get_settings

logger = logging.getLogger(__name__)


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Send an audio file to Groq's Whisper API and return the transcript.

    Args:
        audio_bytes: Raw audio file bytes (supports webm, mp3, wav, etc.)
        filename: Original filename (used for MIME type inference by the API)

    Returns:
        The transcribed text as a string.

    Raises:
        Exception: If the Groq API call fails.
    """
    settings = get_settings()
    client = Groq(api_key=settings.GROQ_API_KEY)

    logger.info("Sending audio to Groq Whisper STT (model=%s, size=%d bytes)", settings.GROQ_STT_MODEL, len(audio_bytes))

    transcription = client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model=settings.GROQ_STT_MODEL,
        response_format="verbose_json",
    )

    transcript_text = transcription.text
    logger.info("Transcription complete: %d characters", len(transcript_text))

    return transcript_text
