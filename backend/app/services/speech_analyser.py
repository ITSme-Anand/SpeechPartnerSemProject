"""Speech Analyser service using Google Gemini 2.5 Pro."""

import json
import logging
from google import genai
from google.genai import types
from groq import Groq
from app.config import get_settings
from app.models.schemas import SpeechAnalysisResponse
from app.prompts.speech_analyser_prompt import SPEECH_ANALYSER_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def analyze_speech(transcript: str) -> SpeechAnalysisResponse:
    """Analyze a speech transcript for grammatical errors using Gemini 2.5 Pro.

    Args:
        transcript: The full text transcript from STT.

    Returns:
        SpeechAnalysisResponse containing per-sentence analysis with
        opportunities, errors, and corrections.

    Raises:
        ValueError: If the LLM response cannot be parsed.
        Exception: If the Gemini API call fails.
    """
    settings = get_settings()
    #client = genai.Client(api_key=settings.GEMINI_API_KEY)
    client = Groq(api_key=settings.GROQ_API_KEY)
    logger.info(
        "Sending transcript to Gemini for analysis (model=%s, length=%d chars)",
        settings.GEMINI_MODEL,
        len(transcript),
    )

    '''response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[types.Part(text=f"Analyze this spoken English transcript:\n\n{transcript}")],
            ),
        ],
        config=types.GenerateContentConfig(
            system_instruction=SPEECH_ANALYSER_SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )'''
    response = client.chat.completions.create(
        model=settings.GROQ_CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": SPEECH_ANALYSER_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": f"Analyze this spoken English transcript:\n\n{transcript}",
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=4096,
    )
    raw_text = response.choices[0].message.content
    logger.info("Gemini response received (%d chars)", len(raw_text))

    # Parse the JSON response
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse Gemini response as JSON: %s", e)
        logger.debug("Raw response: %s", raw_text[:500])
        raise ValueError(f"LLM returned invalid JSON: {e}")

    # Validate against our Pydantic model
    try:
        result = SpeechAnalysisResponse(**parsed)
    except Exception as e:
        logger.error("Failed to validate Gemini response: %s", e)
        raise ValueError(f"LLM response does not match expected schema: {e}")

    logger.info(
        "Analysis complete: %d sentences, %d total errors",
        len(result.sentences),
        sum(len(s.errors) for s in result.sentences),
    )

    return result
