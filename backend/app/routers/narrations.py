"""Narrations router — handles speech submission, feedback retrieval, and PDF export.

Endpoints:
    POST   /narrations                        Submit audio recording
    GET    /narrations                        List past narrations
    GET    /narrations/{narration_id}/feedback/pdf   Download feedback PDF
"""

import logging
import os
import subprocess
from datetime import datetime, timezone
from typing import Optional

import librosa
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import Response

from app.database import supabase
from app.middleware.auth import get_current_user
from app.services.stt_service import transcribe_audio, save_audio_to_temp
from app.services.speech_analyser import analyze_speech
from app.services.scoring import update_user_error_profile
from app.services.pdf_service import generate_feedback_pdf

# New pipeline imports
from app.speech_processing.pause_classifier import get_classified_pauses
from app.speech_processing.filler_pipeline import detect_non_lexical_fillers
from app.speech_processing.delivery_pipeline import analyze_delivery

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

# VAD / filler detection requires 16kHz mono audio
TARGET_SR = 16000


def _load_audio_for_vad(audio_path: str) -> tuple[np.ndarray, int]:
    """Load audio file and resample to 16kHz mono for VAD/filler processing."""
    try:
        y, sr = librosa.load(audio_path, sr=TARGET_SR, mono=True)
    except Exception as e:
        logger.warning("librosa.load failed, attempting ffmpeg fallback: %s", e)
        wav_path = audio_path + ".wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", audio_path, "-ar", str(TARGET_SR), "-ac", "1", wav_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        y, sr = librosa.load(wav_path, sr=TARGET_SR, mono=True)
        os.unlink(wav_path)
        
    return y.astype(np.float32), sr


@router.post("/")
def submit_narration(
    request: Request,
    audio: UploadFile = File(...),
    title: str = Form(...),
    is_drill: bool = Form(False),
    drill_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """Submit an audio recording for speech analysis.

    Handles both regular narrations and drill scenario submissions.
    Flow: validate → STT → store narration → LLM analysis → delivery analysis
          → VAD → pause/filler detection → store feedback → update EMA
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

    # ── Save audio to temp file (needed for librosa/VAD) ──
    audio_temp_path = save_audio_to_temp(audio_bytes, filename)

    try:
        # ── Speech-to-Text (now returns word timestamps too) ──
        stt_result = transcribe_audio(audio_bytes, filename)
        transcript = stt_result["text"]
        word_timestamps = stt_result["words"]

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

        # ── Analyze speech with LLM (existing grammar analysis) ──
        analysis = analyze_speech(transcript)

        # ── NEW: Load audio for acoustic pipelines ──
        audio_array, sr = _load_audio_for_vad(audio_temp_path)
        total_duration_s = len(audio_array) / sr

        # ── NEW: VAD → Pause Detection ──
        vad_service = request.app.state.vad_service
        vad_segments = vad_service.get_speech_segments(audio_array, sr)
        pause_events = get_classified_pauses(vad_segments, total_duration_s)
        logger.info("Pause detection: %d pauses found", len(pause_events))

        # ── NEW: Filler Detection (shares VAD segments) ──
        filler_events = []
        try:
            filler_detector = request.app.state.filler_detector
            filler_events = detect_non_lexical_fillers(
                audio_array, sr, vad_segments, word_timestamps, filler_detector,
            )
            logger.info("Filler detection: %d fillers found", len(filler_events))
        except Exception as e:
            logger.warning("Filler detection skipped or failed (non-fatal): %s", e)


        # ── NEW: Delivery Analysis (prosodic features + LLM feedback) ──
        delivery_result = None
        if word_timestamps:
            try:
                delivery_result = analyze_delivery(audio_array, sr, word_timestamps)
                logger.info("Delivery analysis complete")
            except Exception as e:
                logger.error("Delivery analysis failed (non-fatal): %s", e)
                delivery_result = {
                    "baselines": {},
                    "sentence_events": [],
                    "patterns": [],
                    "delivery_feedback": "Delivery analysis could not be completed for this recording.",
                }

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

        # ── Store delivery data as JSONB on narration row ──
        delivery_data = {
            "delivery": delivery_result,
            "pause_events": pause_events,
            "filler_events": filler_events,
        }
        supabase.table("narrations").update({
            "delivery_data": delivery_data,
        }).eq("id", narration_id).execute()

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
            # New delivery analysis fields
            "delivery": delivery_result,
            "pause_events": pause_events,
            "filler_events": filler_events,
        }

    finally:
        # Clean up temp audio file
        if os.path.exists(audio_temp_path):
            os.unlink(audio_temp_path)
            logger.info("Cleaned up temp audio file: %s", audio_temp_path)


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
