from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str

    # Groq (Whisper STT + Drill Generator LLM)
    GROQ_API_KEY: str
    GROQ_STT_MODEL: str = "whisper-large-v3"
    GROQ_CHAT_MODEL: str = "llama-3.3-70b-versatile"

    # Google Gemini (Speech Analyser)
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-pro"

    # EMA scoring
    EMA_ALPHA: float = 0.4

    # Audio recording limits (seconds)
    MAX_NARRATION_DURATION_SECONDS: int = 300  # 5 minutes
    MAX_DRILL_DURATION_SECONDS: int = 120  # 2 minutes

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
