# backend/routers/auth.py
#
# Authentication via our own OTP flow:
#   send-otp   -> generate a 6-digit code, store with TTL, email via Brevo
#   verify-otp -> match against the store, mint a JWT
#
# Previously this used Supabase Auth's /auth/v1/otp endpoint, but that path
# rejected our @my365.dmu.ac.uk recipients without a verified domain setup.
# Owning the OTP lets us send through Brevo's single-sender verification.
#
# Dev escape hatch (DEV_AUTH_BYPASS=true in .env): code 000000 always works.
# Never enable the bypass in production — there's a model_validator in
# core/config.py that refuses to start with both flags true.

import logging
from uuid import uuid5, NAMESPACE_DNS

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from core.config import settings
from core.limiter import limiter
from core.otp_limiter import otp_limiter
from core.security import create_access_token
from core.database import AsyncSessionLocal
from models.user import User, UserRole
from schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse
from services.email import send_otp_code
from services.otp_store import issue_otp, verify_otp as verify_otp_code

logger = logging.getLogger(__name__)

router = APIRouter()


def is_valid_domain(email: str) -> bool:
    domain = email.split("@")[-1]
    return any(domain.endswith(d) for d in settings.allowed_domains_list)


async def _find_or_create_user(email: str) -> User:
    """
    Look up the user by email; create a fresh student row if none exists.
    Uses uuid5(email) for the new id so re-runs never spawn zombie rows.
    Raises 403 if the user exists but was deactivated.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is None:
            new_id = str(uuid5(NAMESPACE_DNS, email))
            user = User(
                id=new_id,
                email=email,
                role=UserRole.student,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="Your account has been deactivated",
            )
        return user


def _mint_token(user: User) -> TokenResponse:
    token = create_access_token({
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
    })
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        role=user.role.value,
    )


# ── POST /auth/send-otp ──────────────────────────────────────────────

@router.post("/send-otp")
@limiter.limit("10/hour")  # per-IP cap across any email
async def send_otp(request: Request, body: SendOTPRequest):
    if not is_valid_domain(body.email):
        raise HTTPException(status_code=400, detail="Only university emails are allowed")

    # Dev shortcut — skip rate limiting + email send entirely
    if settings.dev_auth_bypass:
        return {"message": "OTP sent (dev bypass — use code 000000)"}

    # Per-email cap: 1/min, 5/hour (defined in core/otp_limiter.py)
    allowed, retry_after = otp_limiter.check(body.email)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    code = issue_otp(body.email)
    try:
        await send_otp_code(body.email, code)
    except Exception as exc:
        logger.warning("OTP email send failed for %s: %s", body.email, exc)
        raise HTTPException(status_code=502, detail="Failed to send OTP, please try again")

    return {"message": "OTP sent to your email"}


# ── POST /auth/verify-otp ────────────────────────────────────────────

@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, body: VerifyOTPRequest):
    # Dev bypass — code 000000 always works for any valid-domain email
    if settings.dev_auth_bypass and body.token == "000000":
        user = await _find_or_create_user(body.email)
        return _mint_token(user)

    if not verify_otp_code(body.email, body.token):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP code")

    user = await _find_or_create_user(body.email)
    return _mint_token(user)


# ── POST /auth/logout ────────────────────────────────────────────────

@router.post("/logout")
async def logout():
    return {"message": "Logged out"}
