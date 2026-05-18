# backend/routers/registrations.py
#
# Handles student registration for events.
# Key design decisions:
# - DELETE uses event_id (not registration_id) — frontend knows the event, not the DB row
# - Registration insert is wrapped in a transaction to handle race conditions
# - Capacity check and insert happen atomically via SELECT FOR UPDATE

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_current_user
from models.event import Event
from models.registration import Registration
from models.user import User
from schemas.event import EventResponse
from schemas.registration import RegistrationCreate
from services.email import send_registration_confirmation

router = APIRouter()


# ── GET /registrations/me ────────────────────────────────────

@router.get("/me")
async def my_registrations(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all events the current user is registered for.
    Split into upcoming and past so the frontend can render both sections.
    """
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Event)
        .join(Registration, Registration.event_id == Event.id)
        .where(Registration.student_id == user["user_id"])
        .order_by(Event.starts_at)
    )
    events = result.scalars().all()

    upcoming = []
    past = []

    event_ids = [e.id for e in events]

    # Single query for all registration counts — avoids N+1
    counts_result = await db.execute(
        select(Registration.event_id, func.count().label("cnt"))
        .where(Registration.event_id.in_(event_ids))
        .group_by(Registration.event_id)
    )
    reg_counts = {row.event_id: row.cnt for row in counts_result.all()}

    for e in events:
        event_data = EventResponse.model_validate(e).model_dump()
        event_data["is_registered"] = True
        reg_count = reg_counts.get(e.id, 0)
        event_data["registered_count"] = reg_count
        event_data["spots_left"] = (e.capacity - reg_count) if e.capacity else None

        if e.starts_at > now:
            upcoming.append(event_data)
        else:
            past.append(event_data)

    return {"upcoming": upcoming, "past": past}


# ── POST /registrations ──────────────────────────────────────

@router.post("", status_code=201)
async def register(
    body: RegistrationCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Register the current user for an event.

    Checks (in order):
    1. Event exists and is published
    2. Event is not cancelled
    3. Event hasn't started yet
    4. Capacity has spots left (checked atomically with INSERT)

    Race condition handling: SELECT ... FOR UPDATE locks the event row
    so two simultaneous requests can't both pass the capacity check.
    If they somehow do, the UNIQUE constraint catches it → 409.
    """
    now = datetime.now(timezone.utc)

    event_id = body.event_id

    async with db.begin():
        # Lock the event row to prevent race conditions on capacity
        result = await db.execute(
            select(Event)
            .where(Event.id == event_id)
            .with_for_update()
        )
        event = result.scalar_one_or_none()

        if event is None or not event.is_published:
            raise HTTPException(status_code=404, detail="Event not found")

        if event.is_cancelled:
            raise HTTPException(status_code=400, detail="This event has been cancelled")

        if event.starts_at <= now:
            raise HTTPException(status_code=400, detail="Registration is closed — event has already started")

        # Check capacity if the event has a limit
        if event.capacity is not None:
            count_result = await db.execute(
                select(func.count()).where(Registration.event_id == event_id)
            )
            registered = count_result.scalar() or 0
            if registered >= event.capacity:
                raise HTTPException(status_code=409, detail="No spots available")

        # Insert registration — UNIQUE(event_id, student_id) handles duplicates
        registration = Registration(
            event_id=event_id,
            student_id=user["user_id"],
        )
        db.add(registration)

        try:
            await db.flush()  # sends INSERT, triggers UNIQUE check before commit
        except IntegrityError:
            raise HTTPException(status_code=409, detail="You are already registered for this event")

    # Send confirmation email (outside transaction — non-critical)
    try:
        await send_registration_confirmation(
            to_email=user["email"],
            event_title=event.title,
            event_date=event.starts_at.strftime("%d %B %Y, %H:%M"),
        )
    except Exception:
        # Don't fail the registration if email sending fails
        pass

    return {"message": "Registered successfully", "event_id": str(event_id)}


# ── DELETE /registrations/{event_id} ─────────────────────────

@router.delete("/{event_id}", status_code=204)
async def cancel_registration(
    event_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel the current user's registration for an event.
    Uses event_id (not registration row id) — frontend knows the event.
    Only allowed before the event starts.
    """
    now = datetime.now(timezone.utc)

    # Find the registration row
    result = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.student_id == user["user_id"],
        )
    )
    registration = result.scalar_one_or_none()

    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Check the event hasn't started yet
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()

    if event and event.starts_at <= now:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel registration after the event has started",
        )

    await db.delete(registration)
    await db.commit()

    # 204 No Content — no body returned
