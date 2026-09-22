"""Drills router — handles drill session creation, MCQ answer storage, and summary retrieval.

Endpoints:
    POST   /drills                  Start or resume a drill session
    PATCH  /drill-steps/{step_id}   Store user's MCQ response
    GET    /drills/{drill_id}/summary   Get drill session summary
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import supabase
from app.middleware.auth import get_current_user
from app.models.schemas import (
    DrillStartRequest,
    DrillStepUpdateRequest,
)
from app.services.drill_generator import generate_drill

logger = logging.getLogger(__name__)

router = APIRouter(tags=["drills"])


@router.post("/drills")
def start_drill(
    request: DrillStartRequest,
    current_user: dict = Depends(get_current_user),
):
    """Start a drill session for a narration, or return existing one if already started.

    Flow:
        1. Verify narration belongs to user
        2. If drill already exists for this narration → return cached content
        3. Find focus topic (highest EMA score)
        4. Fetch recent 5 errors of that category
        5. Call Drill Generator LLM
        6. Store drill + drill steps in DB
        7. Return drill content
    """
    user_id = current_user["id"]
    narration_id = request.narration_id

    # ── Verify narration belongs to user ──
    narration = (
        supabase.table("narrations")
        .select("*")
        .eq("id", narration_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not narration.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Narration not found or does not belong to you",
        )

    # ── Check if drill already exists for this narration ──
    existing = (
        supabase.table("drills")
        .select("*")
        .eq("narration_id", narration_id)
        .execute()
    )

    if existing.data:
        drill = existing.data[0]

        # Fetch associated drill steps
        steps = (
            supabase.table("drill_steps")
            .select("id, step_type, step_order")
            .eq("drill_session_id", drill["id"])
            .order("step_order")
            .execute()
        )

        logger.info("Returning existing drill %s for narration %s", drill["id"], narration_id)

        return {
            "drill_id": drill["id"],
            "focus_error_class": drill["focus_error_class"],
            "content": drill["ai_response"],
            "steps": steps.data,
        }

    # ── Find focus topic: highest EMA score ──
    profile = (
        supabase.table("user_error_profile")
        .select("*")
        .eq("user_id", user_id)
        .order("ema_score", desc=True)
        .limit(1)
        .execute()
    )

    if not profile.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No error profile found. Complete at least one narration first to build your profile.",
        )

    focus_class = profile.data[0]["error_class"]
    logger.info("Focus topic for user %s: %s (EMA=%.4f)", user_id[:8], focus_class, profile.data[0]["ema_score"])

    # ── Fetch recent 5 errors of the focus category ──
    # First get user's narration IDs, then find matching feedback
    user_narrations = (
        supabase.table("narrations")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )
    narration_ids = [n["id"] for n in user_narrations.data]

    recent_errors_result = (
        supabase.table("feedback")
        .select("original_sentence, error_part, explanation, corrected_sentence")
        .in_("narration_id", narration_ids)
        .eq("error_class", focus_class)
        .limit(5)
        .execute()
    )

    errors_for_llm = recent_errors_result.data if recent_errors_result.data else []

    # ── Generate drill content via LLM ──
    drill_content = generate_drill(focus_class, errors_for_llm)
    drill_content_dict = drill_content.model_dump()

    # ── Store drill in DB ──
    drill_insert = (
        supabase.table("drills")
        .insert({
            "user_id": user_id,
            "narration_id": narration_id,
            "focus_error_class": focus_class,
            "ai_response": drill_content_dict,
        })
        .execute()
    )

    drill_id = drill_insert.data[0]["id"]
    logger.info("Drill created: id=%s, focus=%s", drill_id, focus_class)

    # ── Create drill steps ──
    steps_data = [
        {
            "drill_session_id": drill_id,
            "step_type": "concept",
            "step_order": 1,
            "ai_content": {
                "concept_title": drill_content.concept_title,
                "concept_explanation": drill_content.concept_explanation,
                "examples": [e.model_dump() for e in drill_content.examples],
            },
        },
        {
            "drill_session_id": drill_id,
            "step_type": "mcq",
            "step_order": 2,
            "ai_content": {
                "questions": [q.model_dump() for q in drill_content.questions],
            },
        },
        {
            "drill_session_id": drill_id,
            "step_type": "scenario",
            "step_order": 3,
            "ai_content": {
                "scenario_prompt": drill_content.scenario_prompt,
            },
        },
    ]

    steps_result = supabase.table("drill_steps").insert(steps_data).execute()
    logger.info("Drill steps created: %d steps for drill %s", len(steps_result.data), drill_id)

    return {
        "drill_id": drill_id,
        "focus_error_class": focus_class,
        "content": drill_content_dict,
        "steps": [
            {"id": s["id"], "step_type": s["step_type"], "step_order": s["step_order"]}
            for s in steps_result.data
        ],
    }


@router.patch("/drill-steps/{step_id}")
def update_drill_step(
    step_id: str,
    request: DrillStepUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Store the user's response for an MCQ drill step.

    Validates that the drill step's parent drill belongs to the current user.
    MCQ responses are NOT used to update EMA scores (per spec).
    """
    user_id = current_user["id"]

    # Fetch the drill step and verify ownership via the parent drill
    step_result = (
        supabase.table("drill_steps")
        .select("*, drills!inner(user_id)")
        .eq("id", step_id)
        .execute()
    )

    if not step_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drill step not found",
        )

    step = step_result.data[0]

    # Check ownership through the parent drill
    if step.get("drills", {}).get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This drill step does not belong to you",
        )

    # Store the user's response
    supabase.table("drill_steps").update({
        "user_response": request.user_response,
    }).eq("id", step_id).execute()

    logger.info("MCQ response stored for step %s", step_id)

    return {"status": "ok"}


@router.get("/drills/{drill_id}/summary")
def get_drill_summary(
    drill_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the summary of a completed drill session.

    If the drill is still being processed (scenario speech not yet analyzed),
    returns status="processing". Otherwise returns the full summary with
    feedback from the scenario speech analysis.
    """
    user_id = current_user["id"]

    # Fetch drill and verify ownership
    drill_result = (
        supabase.table("drills")
        .select("*")
        .eq("id", drill_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not drill_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drill session not found or does not belong to you",
        )

    drill = drill_result.data[0]

    # Check if drill is completed
    if drill["completed_at"] is None:
        return {
            "status": "processing",
            "drill_id": drill_id,
            "focus_error_class": drill["focus_error_class"],
        }

    # Fetch scenario drill step (has transcript_id and counts)
    scenario_step = (
        supabase.table("drill_steps")
        .select("*")
        .eq("drill_session_id", drill_id)
        .eq("step_type", "scenario")
        .execute()
    )

    focus_opportunity_count = None
    focus_error_count = None
    feedback_items = []

    if scenario_step.data:
        step = scenario_step.data[0]
        focus_opportunity_count = step.get("focus_opportunity_count")
        focus_error_count = step.get("focus_error_count")

        # Fetch feedback for the scenario narration
        transcript_id = step.get("transcript_id")
        if transcript_id:
            feedback_result = (
                supabase.table("feedback")
                .select("*")
                .eq("narration_id", transcript_id)
                .execute()
            )
            feedback_items = [
                {
                    "id": f.get("id"),
                    "error_class": f["error_class"],
                    "original_sentence": f["original_sentence"],
                    "error_part": f["error_part"],
                    "explanation": f["explanation"],
                    "corrected_sentence": f["corrected_sentence"],
                }
                for f in feedback_result.data
            ]

    # Get concept title from the drill's AI response
    concept_title = None
    if drill.get("ai_response"):
        concept_title = drill["ai_response"].get("concept_title")

    return {
        "status": "completed",
        "drill_id": drill_id,
        "focus_error_class": drill["focus_error_class"],
        "concept_title": concept_title,
        "feedback": feedback_items,
        "focus_opportunity_count": focus_opportunity_count,
        "focus_error_count": focus_error_count,
    }
