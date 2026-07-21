"""EMA (Exponential Moving Average) scoring service.

Computes and updates per-user, per-error-class EMA scores.

Formula:
    new_ema = α × session_error_rate + (1 − α) × old_ema
    where session_error_rate = error_count / opportunity_count

Alpha (α) defaults to 0.4 — recent sessions get ~40% weight each time.
"""

import logging
from datetime import datetime, timezone

from app.config import get_settings
from app.database import supabase
from app.models.schemas import SentenceAnalysis

logger = logging.getLogger(__name__)


def compute_ema(
    old_ema: float,
    error_count: int,
    opportunity_count: int,
    alpha: float | None = None,
) -> float:
    """Compute a new EMA score from the current session's error rate.

    Args:
        old_ema: Previous EMA score (0.0 for new users).
        error_count: Number of errors in this category this session.
        opportunity_count: Number of opportunities in this category this session.
        alpha: Smoothing factor (default from settings).

    Returns:
        The updated EMA score.
    """
    if alpha is None:
        alpha = get_settings().EMA_ALPHA

    if opportunity_count == 0:
        return old_ema

    session_error_rate = error_count / opportunity_count
    new_ema = alpha * session_error_rate + (1 - alpha) * old_ema
    return round(new_ema, 6)


def aggregate_category_stats(
    sentences: list[SentenceAnalysis],
) -> dict[str, dict[str, int]]:
    """Aggregate opportunity and error counts per category from analysis results.

    Returns:
        Dict mapping category name to {"opportunities": int, "errors": int}.
    """
    stats: dict[str, dict[str, int]] = {}

    for sentence in sentences:
        # Count opportunities per category
        for opp in sentence.opportunities:
            if opp not in stats:
                stats[opp] = {"opportunities": 0, "errors": 0}
            stats[opp]["opportunities"] += 1

        # Count errors per category
        for error in sentence.errors:
            cat = error.category
            if cat not in stats:
                stats[cat] = {"opportunities": 0, "errors": 0}
            stats[cat]["errors"] += 1

    return stats


def update_user_error_profile(
    user_id: str,
    sentences: list[SentenceAnalysis],
) -> dict[str, float]:
    """Update EMA scores for ALL categories found in the analysis.

    This runs after every narration AND every drill scenario submission.
    It updates all categories encountered, not just the drill's focus category.

    Args:
        user_id: The user's UUID.
        sentences: List of SentenceAnalysis from the speech analyser.

    Returns:
        Dict mapping category name to updated EMA score.
    """
    category_stats = aggregate_category_stats(sentences)
    updated_scores: dict[str, float] = {}

    for category, stats in category_stats.items():
        if stats["opportunities"] == 0:
            continue

        # Fetch current profile for this category
        result = (
            supabase.table("user_error_profile")
            .select("*")
            .eq("user_id", user_id)
            .eq("error_class", category)
            .execute()
        )

        if result.data:
            old_ema = result.data[0]["ema_score"]
            old_total = result.data[0]["opportunity_count_total"]
        else:
            old_ema = 0.0
            old_total = 0

        new_ema = compute_ema(old_ema, stats["errors"], stats["opportunities"])
        new_total = old_total + stats["opportunities"]
        now = datetime.now(timezone.utc).isoformat()

        # Upsert the profile row
        supabase.table("user_error_profile").upsert(
            {
                "user_id": user_id,
                "error_class": category,
                "ema_score": new_ema,
                "opportunity_count_total": new_total,
                "last_updated": now,
            }
        ).execute()

        updated_scores[category] = new_ema
        logger.info(
            "EMA updated: user=%s category=%s old=%.4f new=%.4f (errors=%d/%d)",
            user_id[:8],
            category,
            old_ema,
            new_ema,
            stats["errors"],
            stats["opportunities"],
        )

    return updated_scores
