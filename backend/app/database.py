from supabase import create_client, Client
from app.config import get_settings


def get_supabase_client() -> Client:
    """Create and return a Supabase client using the service role key.

    The service role key bypasses Row Level Security, which is intentional
    since only the backend should access the database directly.
    """
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# Module-level client instance, reused across the app
supabase: Client = get_supabase_client()
