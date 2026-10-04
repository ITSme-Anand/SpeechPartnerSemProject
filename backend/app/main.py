"""Grammar Partner Backend — FastAPI Application Entry Point.

Run with:
    cd backend
    uvicorn app.main:app --reload --port 8000
"""

import logging

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import narrations, drills

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-30s | %(levelname)-5s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan: load ML models once at startup ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load heavy ML models at startup, release at shutdown."""
    from app.speech_processing.vad_service import VADService
    from app.speech_processing.filler_model import FillerDetector

    logger.info("Loading speech processing models...")

    # VAD service (used by both pause detection and filler detection)
    app.state.vad_service = VADService()

    # Filler detector (wav2vec2 + classifier head)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Using device: %s", device)
    app.state.filler_detector = FillerDetector(device=device)

    logger.info("All speech processing models loaded.")
    yield

    # Cleanup (Python GC handles model memory)
    logger.info("Shutting down speech processing models.")


# ── FastAPI app ──
app = FastAPI(
    title="Grammar Partner API",
    description="Backend API for the Grammar Partner speech analysis and drill platform.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS (allow Vite dev server) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000",  # Fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ──
app.include_router(narrations.router)
app.include_router(drills.router)


# ── Health check ──
@app.get("/", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Grammar Partner API",
        "version": "2.0.0",
    }
