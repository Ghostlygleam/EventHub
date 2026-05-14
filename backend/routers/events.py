# backend/routers/events.py
#
# All event-related endpoints.
# Students can only see published, non-cancelled events.
# Organisers can create, edit and cancel their own events.
# Admins can do everything organisers can, across all events.

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.security import get_current_user, require_role
from models.event import Event, EventType
from models.registration import Registration
from models.user import User
from schemas.event import EventCreate, EventUpdate, EventResponse

router = APIRouter()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ── Helpers ─────────────────────────────────────────────────

async def get_event_or_404(event_id: UUID, db: AsyncSession) -> Event:
    """Fetch event by id or raise 404."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


def check_ownership(event: Event, user: dict):
    """Organisers can only edit their own events. Admins can edit any."""
    if user["role"] == "admin":
        return
    if str(event.organiser_id) != user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own events",
        )


# ── GET /events ──────────────────────────────────────────────

@router.get("")
async def list_events(
    event_type: Optional[EventType] = Query(None, description="Filter by type: lecture, club, workshop, other"),
    status: Optional[str] = Query(None, description="upcoming or past"),
    club_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None, description="Search in title and description"),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a paginated list of events.
    Students only see published, non-cancelled events.
    Organisers and admins also see their drafts.
    """
    PAGE_SIZE = 20
    now = datetime.now(timezone.utc)

    query = select(Event).where(Event.is_cancelled == False)

    # Students only see published events
    if user["role"] == "student":
        query = query.where(Event.is_published == True)

    # Organisers see only their own drafts + all published
    if user["role"] == "organiser":
        query = query.where(
            or_(Event.is_published == True, Event.organiser_id == user["user_id"])
        )

    # Filters
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

    # Count total for pagination info
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    # Paginate
    query = query.order_by(Event.starts_at).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    result = await db.execute(query)
    events = result.scalars().all()

    return {
        "events": [EventResponse.model_validate(e) for e in events],
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
    """
    Returns full event details including registered count.
    Students can only see published events.
    """
    event = await get_event_or_404(event_id, db)

    if user["role"] == "student" and not event.is_published:
        raise HTTPException(status_code=404, detail="Event not found")

    # Count registrations
    count_result = await db.execute(
        select(func.count()).where(Registration.event_id == event_id)
    )
    registered_count = count_result.scalar()

    return {
        **EventResponse.model_validate(event).model_dump(),
        "registered_count": registered_count,
        "spots_left": (event.capacity - registered_count) if event.capacity else None,
    }


# ── POST /events ─────────────────────────────────────────────

@router.post("", status_code=201)
async def create_event(
    body: EventCreate,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new event. Only organisers and admins can do this."""
    event = Event(
        **body.model_dump(),
        organiser_id=user["user_id"],
    )
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
    """
    Update event fields. Organisers can only edit their own events.
    Only fields included in the request body are updated.
    """
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    if event.is_cancelled:
        raise HTTPException(status_code=400, detail="Cannot edit a cancelled event")

    # Only update fields that were actually sent in the request
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
    """
    Cancel an event — sets is_cancelled = True, does NOT delete from DB.
    This preserves history and lets us notify registered students later.
    """
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    if event.is_cancelled:
        raise HTTPException(status_code=400, detail="Event is already cancelled")

    event.is_cancelled = True
    await db.commit()

    return {"message": "Event cancelled"}


# ── GET /events/:id/registrations ───────────────────────────

@router.get("/{event_id}/registrations")
async def get_event_registrations(
    event_id: UUID,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a list of students registered for this event.
    Only the event organiser or admin can access this.
    """
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
            {
                "id": str(s.id),
                "email": s.email,
                "full_name": s.full_name,
            }
            for s in students
        ],
    }