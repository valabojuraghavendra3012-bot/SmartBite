"""Authentication dependency validating Supabase Auth JWT tokens."""
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

from app.config import settings
from app.models.schemas import UserContext

security = HTTPBearer(auto_error=False)

# Optional Supabase client instance
supabase_client: Optional[Client] = None
if settings.SUPABASE_URL.strip() and settings.SUPABASE_KEY.strip():
    try:
        supabase_client = create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())
    except Exception:
        supabase_client = None


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> UserContext:
    """
    Validate Supabase Bearer token and return authenticated UserContext.
    Enforces user isolation: database operations are strictly bound to this identity.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials.strip()

    # 1. Real Supabase Auth validation
    if supabase_client:
        try:
            user_resp = supabase_client.auth.get_user(token)
            if user_resp and user_resp.user:
                sb_user = user_resp.user
                full_name = sb_user.user_metadata.get("full_name") or sb_user.user_metadata.get("name") if sb_user.user_metadata else None
                return UserContext(
                    id=str(sb_user.id),
                    email=sb_user.email,
                    full_name=full_name,
                    role="authenticated"
                )
        except Exception as e:
            # If JWT secret is configured, attempt local HMAC verification
            if settings.SUPABASE_JWT_SECRET.strip():
                try:
                    payload = jwt.decode(
                        token,
                        settings.SUPABASE_JWT_SECRET.strip(),
                        algorithms=["HS256"],
                        audience="authenticated"
                    )
                    sub = payload.get("sub")
                    if sub:
                        return UserContext(
                            id=sub,
                            email=payload.get("email"),
                            full_name=payload.get("user_metadata", {}).get("full_name"),
                            role="authenticated"
                        )
                except jwt.PyJWTError:
                    pass
            # Token invalid
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired Supabase authentication token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            )

    # 2. Local Demo / Testing Token Handler (when external Supabase is not configured)
    if settings.DEMO_MODE or not settings.SUPABASE_URL.strip():
        # Inspect token format
        if token.startswith("test-") or token.startswith("demo") or token.startswith("local-"):
            user_id = token if not token.startswith("test-token-") else token.replace("test-token-", "")
            return UserContext(
                id=user_id,
                email=f"{user_id}@smartbite.local",
                full_name="Alex (SmartBite Demo)",
                role="authenticated"
            )
        # Attempt loose decode for unverified demo tokens
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            sub = unverified.get("sub") or unverified.get("id") or "demo-user"
            return UserContext(
                id=sub,
                email=unverified.get("email", f"{sub}@smartbite.local"),
                full_name=unverified.get("user_metadata", {}).get("full_name", "Demo User"),
                role="authenticated"
            )
        except Exception:
            return UserContext(
                id=f"user-{token[:16]}",
                email="demo@smartbite.local",
                full_name="Demo User",
                role="authenticated"
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"}
    )
