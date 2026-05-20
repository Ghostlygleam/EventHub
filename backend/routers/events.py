# backend/routers/events.py

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
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



@router.get("")
async def list_events(
    event_type: Optional[EventType] = Query(None),
    event_status: Optional[str] = Query(None, alias="status"),
    club_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    mine: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    PAGE_SIZE = 20
    now = datetime.now(timezone.utc)

    if mine:
        if user["role"] not in ("organiser", "admin"):
            raise HTTPException(status_code=403, detail="Only organisers can use mine filter")
        query = select(Event).where(Event.organiser_id == user["user_id"])
    else:
        query = select(Event).where(Event.is_cancelled == False)
        if user["role"] == "student":
            query = query.where(Event.is_published == True)
        elif user["role"] == "organiser":
            query = query.where(
                or_(Event.is_published == True, Event.organiser_id == user["user_id"])
            )

    if event_type:
        query = query.where(Event.event_type == event_type)
    if club_id:
        query = query.where(Event.club_id == club_id)

    if event_status == "upcoming":
        query = query.where(Event.starts_at > now)
    elif event_status == "happening":
        query = query.where(
            and_(Event.starts_at <= now, or_(Event.ends_at == None, Event.ends_at > now))
        )
    elif event_status == "past":
        query = query.where(
            or_(Event.ends_at < now, and_(Event.ends_at == None, Event.starts_at < now))
        )

    if search:
        query = query.where(
            or_(Event.title.ilike(f"%{search}%"), Event.description.ilike(f"%{search}%"))
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Event.starts_at).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    result = await db.execute(query)
    events = result.scalars().all()

    event_ids = [e.id for e in events]

    # Batch query: registration counts for all events at once
    counts_result = await db.execute(
        select(Registration.event_id, func.count().label("cnt"))
        .where(Registration.event_id.in_(event_ids))
        .group_by(Registration.event_id)
    )
    reg_counts = {row.event_id: row.cnt for row in counts_result.all()}

    # Batch query: which of these events the current user is registered for
    user_regs_result = await db.execute(
        select(Registration.event_id)
        .where(
            Registration.event_id.in_(event_ids),
            Registration.student_id == user["user_id"],
        )
    )
    registered_ids = {row.event_id for row in user_regs_result.all()}

    # Batch query: organiser info for all events
    organiser_ids = {e.organiser_id for e in events}
    org_result = await db.execute(select(User).where(User.id.in_(organiser_ids)))
    organisers = {u.id: u for u in org_result.scalars().all()}

    events_out = []
    for e in events:
        reg_count = reg_counts.get(e.id, 0)
        org = organisers.get(e.organiser_id)
        events_out.append({
            **EventResponse.model_validate(e).model_dump(),
            "registered_count": reg_count,
            "spots_left": (e.capacity - reg_count) if e.capacity else None,
            "is_registered": e.id in registered_ids,
            "organiser_name": org.full_name if org else None,
            "organiser_email": org.email if org else None,
        })

    return {"events": events_out, "page": page, "total": total, "pages": (total + PAGE_SIZE - 1) // PAGE_SIZE}


@router.get("/{event_id}")
async def get_event(
    event_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)

    if user["role"] == "student" and (not event.is_published or event.is_cancelled):
        raise HTTPException(status_code=404, detail="Event not found")

    count_result = await db.execute(
        select(func.count()).where(Registration.event_id == event_id)
    )
    reg_count = count_result.scalar() or 0

    reg_result = await db.execute(
        select(Registration).where(
            Registration.event_id == event_id,
            Registration.student_id == user["user_id"],
        )
    )
    is_reg = reg_result.scalar_one_or_none() is not None

    org_result = await db.execute(select(User).where(User.id == event.organiser_id))
    organiser = org_result.scalar_one_or_none()

    return {
        **EventResponse.model_validate(event).model_dump(),
        "registered_count": reg_count,
        "spots_left": (event.capacity - reg_count) if event.capacity else None,
        "is_registered": is_reg,
        "organiser_name": organiser.full_name if organiser else None,
        "organiser_email": organiser.email if organiser else None,
    }


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

    # Fetch registered students before deleting registrations
    students_result = await db.execute(
        select(User)
        .join(Registration, Registration.student_id == User.id)
        .where(Registration.event_id == event_id)
    )
    students = students_result.scalars().all()

    event.is_cancelled = True

    # Remove all registrations for this event
    await db.execute(delete(Registration).where(Registration.event_id == event_id))
    await db.commit()

    # Send cancellation email to each student (fire-and-forget, don't block on failures)
    for student in students:
        try:
            await send_cancellation_notice(
                to_email=student.email,
                event_title=event.title,
            )
        except Exception:
            pass

    return {"message": "Event cancelled", "notified": len(students)}

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
