# backend/routers/events.py

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import get_current_user, require_role
from models.club import Club
from models.event import Event, EventType
from models.registration import Registration
from models.user import User
from schemas.event import EventCreate, EventUpdate, EventResponse
from services.email import send_cancellation_notice
from services.storage import upload_event_cover, ALLOWED_MIME_TYPES, MAX_FILE_SIZE
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


async def validate_club_id(club_id, db: AsyncSession):
    """Return the Club if club_id is provided and active, else raise 422."""
    if club_id is None:
        return None
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if club is None or not club.is_active:
        raise HTTPException(status_code=422, detail="club_id references a club that does not exist or is inactive")
    return club



@router.get("")
async def list_events(
    event_type: Optional[EventType] = Query(None),
    event_status: Optional[str] = Query(None, alias="status"),
    club_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    mine: Optional[bool] = Query(None),
    include_cancelled: bool = Query(False),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    PAGE_SIZE = settings.page_size
    now = datetime.now(timezone.utc)

    if mine:
        if user["role"] not in ("organiser", "admin"):
            raise HTTPException(status_code=403, detail="Only organisers can use mine filter")
        query = select(Event).where(Event.organiser_id == user["user_id"])
        if not include_cancelled:
            query = query.where(Event.is_cancelled == False)
    else:
        if not include_cancelled:
            query = select(Event).where(Event.is_cancelled == False)
        else:
            query = select(Event)
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

    # Batch query: clubs for events that have a club_id
    club_ids = {e.club_id for e in events if e.club_id}
    clubs_map: dict = {}
    if club_ids:
        clubs_result = await db.execute(select(Club).where(Club.id.in_(club_ids)))
        clubs_map = {c.id: c for c in clubs_result.scalars().all()}

    events_out = []
    for e in events:
        reg_count = reg_counts.get(e.id, 0)
        org = organisers.get(e.organiser_id)
        club = clubs_map.get(e.club_id) if e.club_id else None
        events_out.append({
            **EventResponse.model_validate(e).model_dump(),
            "registered_count": reg_count,
            "spots_left": (e.capacity - reg_count) if e.capacity else None,
            "is_registered": e.id in registered_ids,
            "organiser_name": org.full_name if org else None,
            "organiser_email": org.email if org else None,
            "club": {"id": club.id, "name": club.name} if club else None,
        })

    return {"events": events_out, "page": page, "total": total, "pages": (total + PAGE_SIZE - 1) // PAGE_SIZE}


@router.get("/{event_id}")
async def get_event(
    event_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg_count_sq = (
        select(func.count())
        .where(Registration.event_id == event_id)
        .scalar_subquery()
    )
    is_reg_sq = (
        select(func.count())
        .where(
            Registration.event_id == event_id,
            Registration.student_id == user["user_id"],
        )
        .scalar_subquery()
    )

    result = await db.execute(
        select(Event, User, Club, reg_count_sq.label("reg_count"), is_reg_sq.label("is_reg"))
        .outerjoin(User, User.id == Event.organiser_id)
        .outerjoin(Club, Club.id == Event.club_id)
        .where(Event.id == event_id)
    )
    row = result.one_or_none()

    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")

    event, organiser, club, reg_count, is_reg = row
    reg_count = reg_count or 0

    if user["role"] == "student" and (not event.is_published or event.is_cancelled):
        raise HTTPException(status_code=404, detail="Event not found")

    return {
        **EventResponse.model_validate(event).model_dump(),
        "registered_count": reg_count,
        "spots_left": (event.capacity - reg_count) if event.capacity else None,
        "is_registered": bool(is_reg),
        "organiser_name": organiser.full_name if organiser else None,
        "organiser_email": organiser.email if organiser else None,
        "club": {"id": club.id, "name": club.name} if club else None,
    }


@router.post("", status_code=201)
async def create_event(
    body: EventCreate,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    club = await validate_club_id(body.club_id, db)
    event = Event(**body.model_dump(), organiser_id=user["user_id"])
    db.add(event)
    await db.commit()
    await db.refresh(event)
    resp = EventResponse.model_validate(event).model_dump()
    resp["club"] = {"id": club.id, "name": club.name} if club else None
    return resp


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

    updates = body.model_dump(exclude_unset=True)

    # Validate club_id if it's being changed
    club = None
    if "club_id" in updates:
        club = await validate_club_id(updates["club_id"], db)

    for field, value in updates.items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)

    # Fetch club for response if event already had one and wasn't changed in this request
    if club is None and event.club_id:
        club_result = await db.execute(select(Club).where(Club.id == event.club_id))
        club = club_result.scalar_one_or_none()

    resp = EventResponse.model_validate(event).model_dump()
    resp["club"] = {"id": club.id, "name": club.name} if club else None
    return resp


# ── POST /events/:id/cover ───────────────────────────────────

@router.post("/{event_id}/cover")
async def upload_cover(
    event_id: UUID,
    file: UploadFile = File(...),
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a cover image for an event.
    Allowed types: JPEG, PNG, WebP. Max size: 2 MB.
    Updates event.cover_image_url and returns the new public URL.
    """
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    if event.is_cancelled:
        raise HTTPException(status_code=400, detail="Cannot update a cancelled event")

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Allowed: image/jpeg, image/png, image/webp",
        )

    # Read file and validate size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is 2 MB",
        )

    # Upload to Supabase Storage
    try:
        url = await upload_event_cover(str(event_id), file_bytes, file.content_type)
    except RuntimeError:
        raise HTTPException(status_code=502, detail="Image upload failed. Please try again")

    event.cover_image_url = url
    await db.commit()

    return {"cover_image_url": url}


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
    event.cancelled_at = datetime.now(timezone.utc)
    # Registrations are intentionally kept — they serve as the student's history trail.
    # GET /registrations/me returns them in the "cancelled" bucket so the UI can show
    # "Cancelled by organiser" instead of silently dropping the event from the dashboard.
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
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    event = await get_event_or_404(event_id, db)
    check_ownership(event, user)

    total_result = await db.execute(
        select(func.count()).where(Registration.event_id == event_id)
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(User)
        .join(Registration, Registration.student_id == User.id)
        .where(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
        .offset((page - 1) * size)
        .limit(size)
    )
    students = result.scalars().all()

    return {
        "event_id": str(event_id),
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
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
