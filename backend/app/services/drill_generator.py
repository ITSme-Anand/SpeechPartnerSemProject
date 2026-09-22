"""Drill Generator service using Groq (llama-3.3-70b-versatile)."""

import json
import logging
from groq import Groq

from app.config import get_settings
from app.models.schemas import DrillGeneratorResponse
from app.prompts.drill_generator_prompt import (
    DRILL_GENERATOR_SYSTEM_PROMPT,
    build_drill_prompt,
)

logger = logging.getLogger(__name__)


def generate_drill(focus_topic: str, user_errors: list[dict]) -> DrillGeneratorResponse:
    """Generate a drill session (concept, MCQs, scenario) using Groq LLM.

    Args:
        focus_topic: The error category to focus on (e.g. "tense", "preposition").
        user_errors: List of recent error dicts from the feedback table, each with
                     keys: original_sentence, error_part, explanation, corrected_sentence.

    Returns:
        DrillGeneratorResponse containing concept explanation, examples,
        MCQ questions, and a scenario prompt.

    Raises:
        ValueError: If the LLM response cannot be parsed.
        Exception: If the Groq API call fails.
    """
    settings = get_settings()
    client = Groq(api_key=settings.GROQ_API_KEY)

    user_prompt = build_drill_prompt(focus_topic, user_errors)

    logger.info(
        "Generating drill content (model=%s, focus=%s, errors=%d)",
        settings.GROQ_CHAT_MODEL,
        focus_topic,
        len(user_errors),
    )

    completion = client.chat.completions.create(
        model=settings.GROQ_CHAT_MODEL,
        messages=[
            {"role": "system", "content": DRILL_GENERATOR_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.5,
        max_tokens=4096,
    )

    raw_text = completion.choices[0].message.content
    logger.info("Groq drill response received (%d chars)", len(raw_text))

    # Parse JSON
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse Groq response as JSON: %s", e)
        raise ValueError(f"LLM returned invalid JSON: {e}")

    # Validate against schema
    try:
        result = DrillGeneratorResponse(**parsed)
    except Exception as e:
        logger.error("Failed to validate Groq response: %s", e)
        raise ValueError(f"LLM response does not match expected schema: {e}")

    logger.info(
        "Drill generated: concept='%s', questions=%d",
        result.concept_title,
        len(result.questions),
    )

    return result
