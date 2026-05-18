# backend/routers/events.py
#
# All event-related endpoints.
# Students can only see published, non-cancelled events.
# Organisers can create, edit and cancel their own events.
# Admins can do everything organisers can, across all events.

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.security import get_current_user, require_role
from models.event import Event, EventType
from models.registration import Registration
from models.user import User
from schemas.event import EventCreate, EventUpdate, EventResponse
from services.email import send_cancellation_notice
import csv
import io
from fastapi.responses import Response

router = APIRouter()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ── Helpers ─────────────────────────────────────────────────

async def get_event_or_404(event_id: UUID, db: AsyncSession) -> Event:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def check_ownership(event: Event, user: dict):
    if user["role"] == "admin":
        return
    if str(event.organiser_id) != user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only modify your own events")


async def get_registered_count(event_id: UUID, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).where(Registration.event_id == event_id)
    )
    return result.scalar() or 0


async def get_is_registered(event_id: UUID, user_id: str, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.student_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


# ── GET /events ──────────────────────────────────────────────

@router.get("")
async def list_events(
    event_type: Optional[EventType] = Query(None),
    status: Optional[str] = Query(None, description="upcoming or past"),
    club_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Paginated event list.
    Each card includes registered_count and is_registered so the frontend
    can show the spots counter and the Registered badge without extra requests.
    """
    PAGE_SIZE = 20
    now = datetime.now(timezone.utc)

    query = select(Event).where(Event.is_cancelled == False)

    if user["role"] == "student":
        query = query.where(Event.is_published == True)

    if user["role"] == "organiser":
        query = query.where(
            or_(Event.is_published == True, Event.organiser_id == user["user_id"])
        )

    if event_type:
        query = query.where(Event.event_type == event_type)
    if club_id:
        query = query.where(Event.club_id == club_id)
    if status == "upcoming":
        query = query.where(Event.starts_at >= now)
    elif status == "past":
        query = query.where(Event.starts_at < now)
    if search:
        query = query.where(
            or_(
                Event.title.ilike(f"%{search}%"),
                Event.description.ilike(f"%{search}%"),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Event.starts_at).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    result = await db.execute(query)
    events = result.scalars().all()

    events_out = []
    for e in events:
        reg_count = await get_registered_count(e.id, db)
        is_reg = await get_is_registered(e.id, user["user_id"], db)
        events_out.append({
            **EventResponse.model_validate(e).model_dump(),
            "registered_count": reg_count,
            "spots_left": (e.capacity - reg_count) if e.capacity else None,
            "is_registered": is_reg,
        })

    return {
        "events": events_out,
        "page": page,
        "total": total,
        "pages": (total + PAGE_SIZE - 1) // PAGE_SIZE,
    }


# ── GET /events/:id ──────────────────────────────────────────

@router.get("/{event_id}")
async def get_event(
    event_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)

    if user["role"] == "student" and not event.is_published:
        raise HTTPException(status_code=404, detail="Event not found")

    reg_count = await get_registered_count(event_id, db)
    is_reg = await get_is_registered(event_id, user["user_id"], db)

    return {
        **EventResponse.model_validate(event).model_dump(),
        "registered_count": reg_count,
        "spots_left": (event.capacity - reg_count) if event.capacity else None,
        "is_registered": is_reg,
    }


# ── POST /events ─────────────────────────────────────────────

@router.post("", status_code=201)
async def create_event(
    body: EventCreate,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    event = Event(**body.model_dump(), organiser_id=user["user_id"])
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return EventResponse.model_validate(event)


# ── PATCH /events/:id ────────────────────────────────────────

@router.patch("/{event_id}")
async def update_event(
    event_id: UUID,
    body: EventUpdate,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    if event.is_cancelled:
        raise HTTPException(status_code=400, detail="Cannot edit a cancelled event")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    return EventResponse.model_validate(event)


# ── DELETE /events/:id ───────────────────────────────────────

@router.delete("/{event_id}")
async def cancel_event(
    event_id: UUID,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    if event.is_cancelled:
        raise HTTPException(status_code=400, detail="Event is already cancelled")

    event.is_cancelled = True
    await db.commit()

    # Fetch all registered students for this event
    result = await db.execute(
        select(User)
        .join(Registration, Registration.student_id == User.id)
        .where(Registration.event_id == event_id)
    )
    students = result.scalars().all()

    # Send cancellation email to each student (fire-and-forget, don't block on failures)
    for student in students:
        try:
            await send_cancellation_notice(
                to_email=student.email,
                event_title=event.title,
            )
        except Exception:
            pass  # Log here if you add structured logging later

    return {"message": "Event cancelled", "notified": len(students)}

# ── GET /events/:id/registrations ───────────────────────────

@router.get("/{event_id}/registrations")
async def get_event_registrations(
    event_id: UUID,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    result = await db.execute(
        select(User)
        .join(Registration, Registration.student_id == User.id)
        .where(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
    )
    students = result.scalars().all()

    return {
        "event_id": str(event_id),
        "total": len(students),
        "students": [
            {"id": str(s.id), "email": s.email, "full_name": s.full_name}
            for s in students
        ],
    }

# ── GET /events/:id/registrations/export ────────────────────

@router.get("/{event_id}/registrations/export")
async def export_event_registrations(
    event_id: UUID,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    result = await db.execute(
        select(User.email, User.full_name, Registration.registered_at)
        .join(Registration, Registration.student_id == User.id)
        .where(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["email", "full_name", "registered_at"])
    for email, full_name, registered_at in rows:
        writer.writerow([email, full_name or "", registered_at.isoformat() if registered_at else ""])

    filename = f"registrations_{event_id}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )