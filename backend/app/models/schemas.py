"""Pydantic models for request/response validation and LLM output parsing."""

from pydantic import BaseModel, Field
from typing import Optional


# ──────────────────────────────────────────────
# Speech Analysis (Gemini output structure)
# ──────────────────────────────────────────────


class ErrorDetail(BaseModel):
    """A single grammatical error within a sentence."""

    category: str
    reasoning: str
    error_part: str


class SentenceAnalysis(BaseModel):
    """Analysis result for one sentence from the speech analyser LLM."""

    sentence: str
    opportunities: list[str]
    errors: list[ErrorDetail]
    corrected_sentence: str


class SpeechAnalysisResponse(BaseModel):
    """Full response from the speech analyser LLM."""

    sentences: list[SentenceAnalysis]


# ──────────────────────────────────────────────
# Drill Generator (Groq output structure)
# ──────────────────────────────────────────────


class DrillExample(BaseModel):
    """An example of a user error used in the concept teaching stage."""

    original_sentence: str
    reason_for_error: str
    corrected_sentence: str


class MCQOption(BaseModel):
    """A single option in a multiple-choice question."""

    id: str
    statement: str
    reason: str


class MCQuestion(BaseModel):
    """A multiple-choice question for the drill session."""

    question: str
    options: list[MCQOption]
    correct_option_id: str


class DrillGeneratorResponse(BaseModel):
    """Full response from the drill generator LLM."""

    concept_title: str
    concept_explanation: str
    examples: list[DrillExample]
    questions: list[MCQuestion]
    scenario_prompt: str


# ──────────────────────────────────────────────
# API Request schemas
# ──────────────────────────────────────────────


class DrillStartRequest(BaseModel):
    """Request body for POST /drills."""

    narration_id: str


class DrillStepUpdateRequest(BaseModel):
    """Request body for PATCH /drill-steps/{id}."""

    user_response: dict  # e.g. {"selected_option_id": "b"}


# ──────────────────────────────────────────────
# API Response schemas
# ──────────────────────────────────────────────


class FeedbackItem(BaseModel):
    """A single feedback row returned to the client."""

    id: Optional[str] = None
    error_class: str
    original_sentence: str
    error_part: str
    explanation: str
    corrected_sentence: str


class NarrationSubmitResponse(BaseModel):
    """Response for POST /narrations."""

    narration_id: str
    title: str
    transcript: str
    feedback: list[FeedbackItem]
    summary: str


class NarrationListItem(BaseModel):
    """A single item in the narrations list (GET /narrations)."""

    id: str
    title: str
    created_at: str


class DrillStepInfo(BaseModel):
    """Minimal info about a drill step returned in the drill response."""

    id: str
    step_type: str
    step_order: int


class DrillResponse(BaseModel):
    """Response for POST /drills."""

    drill_id: str
    focus_error_class: str
    content: DrillGeneratorResponse
    steps: list[DrillStepInfo]


class DrillSummaryResponse(BaseModel):
    """Response for GET /drills/{id}/summary."""

    status: str  # "processing" or "completed"
    drill_id: str
    focus_error_class: str
    concept_title: Optional[str] = None
    feedback: Optional[list[FeedbackItem]] = None
    focus_opportunity_count: Optional[int] = None
    focus_error_count: Optional[int] = None
