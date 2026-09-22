import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings
from app.database import supabase

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """FastAPI dependency that verifies the Supabase JWT and returns the user record.

    Flow:
      1. Extract Bearer token from Authorization header
      2. Verify JWT signature against Supabase JWT secret (HS256)
      3. Look up user in our `users` table by auth_id (the JWT `sub` claim)
      4. Auto-create a user record on first API call if one doesn't exist

    Returns the full user row dict (id, auth_id, username, created_at).
    """
    settings = get_settings()
    token = credentials.credentials
    #print('entered the auth middleware')
    # Verify JWT
    try:
        #print(token)
        header = jwt.get_unverified_header(token)
        #print(header)
        jwks_client = PyJWKClient(
            f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        )

        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        print('jwt expired sign error')
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        print('jwt invalid token error')
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    #print('before auth_id')
    auth_id = payload.get("sub")
    if not auth_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject",
        )

    # Look up user in our database
    result = supabase.table("users").select("*").eq("auth_id", auth_id).execute()

    if result.data:
        return result.data[0]

    # Auto-create user on first authenticated API call
    email = payload.get("email", "")
    username = email.split("@")[0] if email else f"user_{auth_id[:8]}"

    insert_result = (
        supabase.table("users")
        .insert({"auth_id": auth_id, "username": username})
        .execute()
    )

    if not insert_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user record",
        )
    #print('auth successful')
    return insert_result.data[0]
