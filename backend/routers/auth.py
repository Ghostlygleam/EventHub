# backend/routers/auth.py
#
# Authentication via Supabase OTP.
# In dev mode (DEV_AUTH_BYPASS=true in .env), use code 000000 to skip real OTP.
# Never enable the bypass in production.

import logging

import httpx
from uuid import uuid5, NAMESPACE_DNS
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from core.config import settings
from core.limiter import limiter
from core.security import create_access_token
from core.database import AsyncSessionLocal
from models.user import User, UserRole
from schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def is_valid_domain(email: str) -> bool:
    domain = email.split("@")[-1]
    return any(domain.endswith(d) for d in settings.allowed_domains_list)


@router.post("/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, body: SendOTPRequest):
    if not is_valid_domain(body.email):
        raise HTTPException(status_code=400, detail="Only university emails are allowed")

    # Dev bypass — skip Supabase, just tell the frontend to use 000000
    if settings.dev_auth_bypass:
        return {"message": "OTP sent (dev bypass — use code 000000)"}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/otp",
            headers={
                "apikey": settings.supabase_key,
                "Content-Type": "application/json",
            },
            json={
                "email": body.email,
                "options": {"should_create_user": True},
            },
        )

    if response.status_code not in (200, 204):
        logger.warning("Supabase OTP send failed: status=%s body=%s", response.status_code, response.text)
        raise HTTPException(status_code=502, detail="Failed to send OTP, please try again")

    return {"message": "OTP sent to your email"}


@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, body: VerifyOTPRequest):

    # Dev bypass — code 000000 creates a real user in DB and returns a real JWT
    if settings.dev_auth_bypass and body.token == "000000":
        async with AsyncSessionLocal() as db:
            # Look up by EMAIL, not deterministic UUID — otherwise seeded users
            # (whose id is fixed in the migration) collide with the uuid5(email)
            # we'd try to insert, hitting the UNIQUE constraint on users.email.
            result = await db.execute(select(User).where(User.email == body.email))
            user = result.scalar_one_or_none()

            if user is None:
                # New user — give them a deterministic id so re-runs of the bypass
                # never spawn zombie rows for the same email.
                fake_id = str(uuid5(NAMESPACE_DNS, body.email))
                user = User(
                    id=fake_id,
                    email=body.email,
                    role=UserRole.student,
                    is_active=True,
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)

            # Match the non-bypass path: a deactivated account can't sign in,
            # even through the dev shortcut.
            if not user.is_active:
                raise HTTPException(status_code=403, detail="Your account has been deactivated")

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

    # Normal flow — verify with Supabase
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/token?grant_type=otp",
            headers={
                "apikey": settings.supabase_key,
                "Content-Type": "application/json",
            },
            json={
                "email": body.email,
                "token": body.token,
                "type": "email",
            },
        )

    if response.status_code != 200:
        logger.warning("Supabase OTP verify failed: status=%s email=%s", response.status_code, body.email)
        raise HTTPException(status_code=401, detail="Invalid or expired OTP code")

    supabase_data = response.json()
    supabase_user = supabase_data.get("user", {})
    supabase_user_id = supabase_user.get("id")

    if not supabase_user_id:
        logger.error("Supabase returned user without id: %s", supabase_data)
        raise HTTPException(status_code=502, detail="Unexpected response from auth provider")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == supabase_user_id))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                id=supabase_user_id,
                email=body.email,
                role=UserRole.student,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Your account has been deactivated")

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


@router.post("/logout")
async def logout():
    return {"message": "Logged out"}