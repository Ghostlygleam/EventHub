# backend/core/security.py
#
# JWT creation and validation.
# get_current_user and require_role are used as FastAPI dependencies
# on any endpoint that requires authentication or a specific role.

from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select

from core.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()


def create_access_token(data: dict) -> str:
    """Create a signed JWT token with an expiry date."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
    Decode the JWT from the Authorization header and verify the user is still active.
    Returns the payload dict: {"user_id": ..., "email": ..., "role": ...}
    """
    payload = decode_token(credentials.credentials)

    # Check that the user hasn't been deactivated since the token was issued.
    # We import here to avoid circular imports between security and database modules.
    from core.database import AsyncSessionLocal
    from models.user import User

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.id == payload.get("user_id"))
        )
        user = result.scalar_one_or_none()

        if user is None or not user.is_active:
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