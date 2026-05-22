# backend/routers/clubs.py

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_current_user, require_role
from models.club import Club
from models.event import Event
from models.user import User
from schemas.club import ClubCreate, ClubUpdate, ClubResponse

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────────

async def get_club_or_404(club_id: UUID, db: AsyncSession) -> Club:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


def check_club_ownership(club: Club, user: dict) -> None:
    if user["role"] == "admin":
        return
    if str(club.owner_id) != user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only modify your own clubs")


async def enrich_clubs(clubs: list[Club], db: AsyncSession) -> list[dict]:
    """
    Attach owner_email and events_count to a list of Club rows.
    Uses two batch queries — no N+1.
    """
    if not clubs:
        return []

    club_ids  = [c.id for c in clubs]
    owner_ids = list({c.owner_id for c in clubs})

    # Batch: non-cancelled events count per club
    counts_result = await db.execute(
        select(Event.club_id, func.count().label("cnt"))
        .where(Event.club_id.in_(club_ids), Event.is_cancelled == False)
        .group_by(Event.club_id)
    )
    event_counts: dict = {row.club_id: row.cnt for row in counts_result.all()}

    # Batch: owner emails
    owners_result = await db.execute(
        select(User.id, User.email).where(User.id.in_(owner_ids))
    )
    owner_emails: dict = {row.id: row.email for row in owners_result.all()}

    out = []
    for club in clubs:
        data = ClubResponse.model_validate(club).model_dump()
        data["owner_email"]  = owner_emails.get(club.owner_id)
        data["events_count"] = event_counts.get(club.id, 0)
        out.append(data)
    return out


# ── GET /clubs ────────────────────────────────────────────────────────────────

@router.get("")
async def list_clubs(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List active clubs, paginated, optionally filtered by name."""
    query = select(Club).where(Club.is_active == True)
    if search:
        query = query.where(Club.name.ilike(f"%{search}%"))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Club.name).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    clubs = result.scalars().all()

    return {
        "clubs": await enrich_clubs(list(clubs), db),
        "page": page,
        "total": total,
        "pages": (total + size - 1) // size,
    }


# ── GET /clubs/{id} ───────────────────────────────────────────────────────────

@router.get("/{club_id}")
async def get_club(
    club_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    club = await get_club_or_404(club_id, db)
    # Inactive clubs are hidden from non-admins
    if not club.is_active and user["role"] != "admin":
        raise HTTPException(status_code=404, detail="Club not found")
    enriched = await enrich_clubs([club], db)
    return enriched[0]


# ── POST /clubs ───────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_club(
    body: ClubCreate,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    # Enforce unique name
    existing = await db.execute(select(Club).where(Club.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A club with this name already exists")

    owner_id = str(body.owner_id) if body.owner_id else user["user_id"]
    data = body.model_dump(exclude={"owner_id"})
    club = Club(**data, owner_id=owner_id)
    db.add(club)
    await db.commit()
    await db.refresh(club)
    enriched = await enrich_clubs([club], db)
    return enriched[0]


# ── PATCH /clubs/{id} ────────────────────────────────────────────────────────

@router.patch("/{club_id}")
async def update_club(
    club_id: UUID,
    body: ClubUpdate,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    club = await get_club_or_404(club_id, db)
    check_club_ownership(club, user)

    updates = body.model_dump(exclude_unset=True)

    # Only admins can toggle is_active via PATCH
    if "is_active" in updates and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change a club's active status")

    # Name uniqueness check (exclude self)
    if "name" in updates:
        dupe = await db.execute(
            select(Club).where(Club.name == updates["name"], Club.id != club_id)
        )
        if dupe.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A club with this name already exists")

    for field, value in updates.items():
        setattr(club, field, value)

    await db.commit()
    await db.refresh(club)
    enriched = await enrich_clubs([club], db)
    return enriched[0]


# ── DELETE /clubs/{id} — soft delete ─────────────────────────────────────────

@router.delete("/{club_id}")
async def delete_club(
    club_id: UUID,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete (is_active=false). Blocked if upcoming events are still linked."""
    club = await get_club_or_404(club_id, db)
    check_club_ownership(club, user)

    if not club.is_active:
        raise HTTPException(status_code=400, detail="Club is already inactive")

    now = datetime.now(timezone.utc)
    upcoming_result = await db.execute(
        select(func.count()).where(
            Event.club_id == club_id,
            Event.starts_at > now,
            Event.is_cancelled == False,
        )
    )
    upcoming_count = upcoming_result.scalar() or 0
    if upcoming_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot deactivate club: {upcoming_count} upcoming event(s) are still "
                "linked to it. Cancel or reassign them first."
            ),
        )

    club.is_active = False
    await db.commit()
    return {"message": "Club deactivated"}
