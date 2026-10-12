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


# ── Limit PyTorch thread pools to reduce memory overhead on small hosts ──
torch.set_num_threads(1)
torch.set_num_interop_threads(1)


class LazyModelProxy:
    """Delays instantiating heavy ML models until first invocation so the
    web server boots in milliseconds and easily passes port checks within 512MB RAM."""

    def __init__(self, loader_fn):
        self._loader_fn = loader_fn
        self._instance = None

    def _get_instance(self):
        if self._instance is None:
            self._instance = self._loader_fn()
        return self._instance

    def __getattr__(self, name):
        return getattr(self._get_instance(), name)


# ── Lifespan: configure lazy model loading ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Register lazy model loaders so the server binds the port immediately."""
    from app.speech_processing.vad_service import VADService
    from app.speech_processing.filler_model import FillerDetector

    logger.info("Configuring speech processing model proxies...")

    # Hugging Face ZeroGPU requires @spaces.GPU for CUDA operations;
    # persistent background server models should run safely on CPU.
    is_zero_gpu = bool(os.getenv("SPACES_ZERO_GPU"))
    if is_zero_gpu or not torch.cuda.is_available():
        device = "cpu"
    else:
        device = "cuda"
    logger.info("Default compute device: %s (ZeroGPU detected: %s)", device, is_zero_gpu)


    app.state.vad_service = LazyModelProxy(lambda: VADService())
    app.state.filler_detector = LazyModelProxy(lambda: FillerDetector(device=device))

    logger.info("Application ready to accept connections.")
    yield

    logger.info("Shutting down application.")



# ── FastAPI app ──
app = FastAPI(
    title="Grammar Partner API",
    description="Backend API for the Grammar Partner speech analysis and drill platform.",
    version="2.0.0",
    lifespan=lifespan,
)

import os

# ── CORS (allow Vite dev server & production Vercel frontend) ──
allowed_origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:3000",  # Fallback
    "https://speech-partner-sem-project.vercel.app",  # Production Vercel frontend
]

# Allow additional origins via environment variable (comma-separated)
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([origin.strip() for origin in extra_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow Vercel preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ──
app.include_router(narrations.router)
app.include_router(drills.router)


# ── Health check ──
@app.get("/", tags=["health"])
@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Grammar Partner API",
        "version": "2.0.0",
    }

