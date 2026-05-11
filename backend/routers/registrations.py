from fastapi import APIRouter, Depends
from schemas.registration import RegistrationCreate, RegistrationResponse
from core.security import get_current_user

router = APIRouter()


@router.get("/me")
async def my_registrations(user=Depends(get_current_user)):
    # TODO: fetch registrations for current user
    return {"registrations": []}


@router.post("", status_code=201)
async def register(body: RegistrationCreate, user=Depends(get_current_user)):
    # TODO: atomic check capacity + insert
    # TODO: send confirmation email via Resend
    return {"message": "Registered successfully"}


@router.delete("/{registration_id}")
async def cancel_registration(
    registration_id: str,
    user=Depends(get_current_user),
):
    # TODO: check event hasn't started yet, then delete
    return {"message": "Registration cancelled"}
