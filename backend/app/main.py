"""Grammar Partner Backend — FastAPI Application Entry Point.

Run with:
    cd backend
    uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import narrations, drills

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-30s | %(levelname)-5s | %(message)s",
    datefmt="%H:%M:%S",
)

# ── FastAPI app ──
app = FastAPI(
    title="Grammar Partner API",
    description="Backend API for the Grammar Partner speech analysis and drill platform.",
    version="1.0.0",
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
        "version": "1.0.0",
    }
