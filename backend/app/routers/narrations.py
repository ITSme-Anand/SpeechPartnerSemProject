"""Narrations router — handles speech submission, feedback retrieval, and PDF export.

Endpoints:
    POST   /narrations                        Submit audio recording
    GET    /narrations                        List past narrations
    GET    /narrations/{narration_id}/feedback/pdf   Download feedback PDF
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.database import supabase
from app.middleware.auth import get_current_user
from app.services.stt_service import transcribe_audio
from app.services.speech_analyser import analyze_speech
from app.services.scoring import update_user_error_profile
from app.services.pdf_service import generate_feedback_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/narrations", tags=["narrations"])

# Audio MIME types we accept
ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/flac",
    "audio/mp4",
    "audio/x-m4a",
}


@router.post("/")
def submit_narration(
    audio: UploadFile = File(...),
    title: str = Form(...),
    is_drill: bool = Form(False),
    drill_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """Submit an audio recording for speech analysis.

    Handles both regular narrations and drill scenario submissions.
    Flow: validate → STT → store narration → LLM analysis → store feedback → update EMA
    """
    user_id = current_user["id"]

    # ── Validate audio file ──
    content_type = audio.content_type or ""
    if content_type not in ALLOWED_AUDIO_TYPES:
        # Be lenient: also accept if it starts with "audio/"
        if not content_type.startswith("audio/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File must be an audio file. Got: {content_type}",
            )

    # ── Validate drill context if applicable ──
    drill_data = None
    if is_drill:
        if not drill_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="drill_id is required when is_drill is true",
            )

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

        drill_data = drill_result.data[0]

        if drill_data["completed_at"] is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This drill session has already been completed",
            )

    # ── Read audio bytes ──
    audio_bytes = audio.file.read()
    filename = audio.filename or "recording.webm"
    logger.info("Received audio: %s (%d bytes) from user %s", filename, len(audio_bytes), user_id[:8])

    # ── Speech-to-Text ──
    transcript = transcribe_audio(audio_bytes, filename)

    if not transcript or not transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not transcribe any speech from the audio. Please try recording again.",
        )

    # ── Store narration in DB ──
    narration_insert = (
        supabase.table("narrations")
        .insert({
            "user_id": user_id,
            "title": title,
            "is_drill_response": is_drill,
            "transcript": transcript,
        })
        .execute()
    )
    narration_id = narration_insert.data[0]["id"]
    logger.info("Narration stored: id=%s", narration_id)

    # ── Analyze speech with LLM ──
    analysis = analyze_speech(transcript)

    # ── Store feedback rows ──
    feedback_rows = []
    for sentence in analysis.sentences:
        for error in sentence.errors:
            feedback_rows.append({
                "narration_id": narration_id,
                "error_class": error.category,
                "original_sentence": sentence.sentence,
                "error_part": error.error_part,
                "explanation": error.reasoning,
                "corrected_sentence": sentence.corrected_sentence,
            })

    if feedback_rows:
        supabase.table("feedback").insert(feedback_rows).execute()
        logger.info("Stored %d feedback rows for narration %s", len(feedback_rows), narration_id)

    # ── Update EMA scores (ALL categories, not just drill focus) ──
    update_user_error_profile(user_id, analysis.sentences)

    # ── Handle drill-specific updates ──
    if is_drill and drill_data:
        focus_class = drill_data["focus_error_class"]

        # Count focus category stats from this analysis
        focus_opportunities = 0
        focus_errors = 0
        for sentence in analysis.sentences:
            focus_opportunities += sentence.opportunities.count(focus_class)
            for error in sentence.errors:
                if error.category == focus_class:
                    focus_errors += 1

        # Update scenario drill step with transcript and counts
        supabase.table("drill_steps").update({
            "transcript_id": narration_id,
            "focus_opportunity_count": focus_opportunities,
            "focus_error_count": focus_errors,
        }).eq("drill_session_id", drill_id).eq("step_type", "scenario").execute()

        # Mark drill as completed
        supabase.table("drills").update({
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", drill_id).execute()

        logger.info(
            "Drill %s completed: focus=%s, opp=%d, err=%d",
            drill_id, focus_class, focus_opportunities, focus_errors,
        )

    # ── Build summary (2-3 lines) ──
    total_errors = sum(len(s.errors) for s in analysis.sentences)
    total_sentences = len(analysis.sentences)
    error_categories = set()
    for s in analysis.sentences:
        for e in s.errors:
            error_categories.add(e.category)

    if total_errors == 0:
        summary = "Great job! No grammatical errors were found in your speech. Keep up the excellent work!"
    else:
        cats = ", ".join(
            cat.replace("_", " ").title() for cat in sorted(error_categories)[:3]
        )
        summary = (
            f"Found {total_errors} error{'s' if total_errors != 1 else ''} "
            f"across {total_sentences} sentence{'s' if total_sentences != 1 else ''}. "
            f"Main areas to focus on: {cats}."
        )

    # ── Build response ──
    feedback_items = [
        {
            "error_class": error.category,
            "original_sentence": sentence.sentence,
            "error_part": error.error_part,
            "explanation": error.reasoning,
            "corrected_sentence": sentence.corrected_sentence,
        }
        for sentence in analysis.sentences
        for error in sentence.errors
    ]

    return {
        "narration_id": narration_id,
        "title": title,
        "transcript": transcript,
        "feedback": feedback_items,
        "summary": summary,
    }


@router.get("/")
def list_narrations(current_user: dict = Depends(get_current_user)):
    """Get all past narrations for the current user (excluding drill responses)."""
    user_id = current_user["id"]

    result = (
        supabase.table("narrations")
        .select("id, title, created_at")
        .eq("user_id", user_id)
        .eq("is_drill_response", False)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data


@router.get("/{narration_id}/feedback/pdf")
def download_feedback_pdf(
    narration_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Download the feedback for a narration as a formatted PDF."""
    user_id = current_user["id"]

    # Verify narration belongs to user
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
            detail="Narration not found",
        )

    narration_data = narration.data[0]

    # Fetch feedback rows
    feedback = (
        supabase.table("feedback")
        .select("*")
        .eq("narration_id", narration_id)
        .execute()
    )

    # Generate PDF
    pdf_bytes = generate_feedback_pdf(
        title=narration_data["title"],
        transcript=narration_data.get("transcript", ""),
        feedback_rows=feedback.data,
        created_at=narration_data.get("created_at"),
    )

    # Return as downloadable file
    safe_title = "".join(c for c in narration_data["title"] if c.isalnum() or c in " _-")[:50]
    filename = f"feedback_{safe_title}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
