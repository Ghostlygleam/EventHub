# backend/core/security.py
#
# JWT creation and validation.
# get_current_user and require_role are used as FastAPI dependencies
# on any endpoint that requires authentication or a specific role.

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from core.config import settings

ALGORITHM = "HS256"
# 24 h — short enough that deactivation propagates within one day without a Redis blocklist.
# Previously 7 days, but the per-request DB lookup that enforced is_active in real-time
# was causing 5-7 s latency on every protected endpoint (one Supabase RTT per request).
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

security = HTTPBearer()


def create_access_token(data: dict) -> str:
    """Create a signed JWT token with an expiry date."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises 401 if invalid or expired."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Decode the JWT and return the payload.
    is_active is embedded in the token at issue time — no DB round-trip needed.

    Trade-off: a deactivated user keeps access until their token expires (≤24 h).
    This is acceptable for the student-event use case and eliminates the 5-7 s
    latency that a per-request Supabase SELECT was adding to every endpoint.
    """
    payload = decode_token(credentials.credentials)

    if not payload.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated",
        )

    return payload


def require_role(*roles: str):
    """
    Dependency factory — use it on endpoints that need a specific role.
    Example: user=Depends(require_role("organiser", "admin"))
    """
    async def check_role(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return check_role