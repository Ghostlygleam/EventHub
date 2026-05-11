from fastapi import APIRouter, HTTPException
from schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse
from core.config import settings
from core.security import create_access_token

router = APIRouter()


def is_valid_domain(email: str) -> bool:
    domain = email.split("@")[-1]
    return any(domain.endswith(d) for d in settings.allowed_domains_list)


@router.post("/send-otp")
async def send_otp(body: SendOTPRequest):
    if not is_valid_domain(body.email):
        raise HTTPException(
            status_code=400,
            detail="Only university emails are allowed",
        )
    # TODO: call Supabase Auth to send OTP
    # import httpx
    # async with httpx.AsyncClient() as client:
    #     await client.post(f"{settings.supabase_url}/auth/v1/otp", ...)
    return {"message": "OTP sent"}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(body: VerifyOTPRequest):
    # TODO: verify OTP with Supabase Auth
    # TODO: get or create user in DB
    # TODO: return real token
    token = create_access_token({
        "user_id": "placeholder-uuid",
        "email": body.email,
        "role": "student",
    })
    return TokenResponse(
        access_token=token,
        user_id="placeholder-uuid",
        email=body.email,
        role="student",
    )


@router.post("/logout")
async def logout():
    # TODO: invalidate Supabase session
    return {"message": "Logged out"}
