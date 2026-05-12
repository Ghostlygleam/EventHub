# backend/routers/auth.py
#
# Handles authentication via OTP (one-time password) sent by email.
# We use Supabase Auth to send and verify OTP codes — no custom email logic needed.
# After verification we issue our own JWT so the rest of the API stays simple.

import httpx
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from core.config import settings
from core.security import create_access_token
from core.database import AsyncSessionLocal
from models.user import User, UserRole
from schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse

router = APIRouter()


def is_valid_domain(email: str) -> bool:
    """Check that the email belongs to a university domain."""
    domain = email.split("@")[-1]
    return any(domain.endswith(d) for d in settings.allowed_domains_list)


@router.post("/send-otp")
async def send_otp(body: SendOTPRequest):
    """
    Step 1 of login: user enters their university email.
    We validate the domain, then ask Supabase to send a 6-digit OTP code.
    """
    if not is_valid_domain(body.email):
        raise HTTPException(
            status_code=400,
            detail="Only university emails are allowed",
        )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.supabase_url}/auth/v1/otp",
            headers={
                "apikey": settings.supabase_key,
                "Content-Type": "application/json",
            },
            json={
                "email": body.email,
                "options": {
                    "should_create_user": True,  # create Supabase auth user if not exists
                },
            },
        )

    if response.status_code not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail="Failed to send OTP, please try again",
        )

    return {"message": "OTP sent to your email"}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(body: VerifyOTPRequest):
    """
    Step 2 of login: user enters the 6-digit code from their email.
    We verify it with Supabase, then create (or fetch) the user in our own DB,
    and return a JWT token for subsequent requests.
    """
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
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired OTP code",
        )

    supabase_data = response.json()
    supabase_user = supabase_data.get("user", {})
    supabase_user_id = supabase_user.get("id")

    if not supabase_user_id:
        raise HTTPException(status_code=502, detail="Unexpected response from auth provider")

    # Get or create user in our own users table
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.id == supabase_user_id)
        )
        user = result.scalar_one_or_none()

        if user is None:
            # First time this person logs in — create their profile
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
            raise HTTPException(
                status_code=403,
                detail="Your account has been deactivated",
            )

        # Issue our own JWT with user info baked in
        token = create_access_token({
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
        })

        return TokenResponse(
            access_token=token,
            user_id=str(user.id),
            email=user.email,
            role=user.role.value,
        )


@router.post("/logout")
async def logout():
    """
    Client should delete the JWT on their end.
    Supabase session cleanup happens here if needed in the future.
    """
    return {"message": "Logged out"}