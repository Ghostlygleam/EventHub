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
from schemas.club import ClubCreate, ClubUpdate, ClubResponse

router = APIRouter()

_PAGE_SIZE = 20


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


# ── GET /clubs ────────────────────────────────────────────────────────────────

@router.get("")
async def list_clubs(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List active clubs, paginated, optionally filtered by name."""
    query = select(Club).where(Club.is_active == True)
    if search:
        query = query.where(Club.name.ilike(f"%{search}%"))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Club.name).offset((page - 1) * _PAGE_SIZE).limit(_PAGE_SIZE)
    result = await db.execute(query)
    clubs = result.scalars().all()

    return {
        "clubs": [ClubResponse.model_validate(c) for c in clubs],
        "page": page,
        "total": total,
        "pages": (total + _PAGE_SIZE - 1) // _PAGE_SIZE,
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
    return ClubResponse.model_validate(club)


# ── POST /clubs ───────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_club(
    body: ClubCreate,
    user: dict = Depends(require_role("organiser", "admin")),
    db: AsyncSession = Depends(get_db),
):
    # Enforce unique name
    existing = await db.execute(select(Club).where(Club.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A club with this name already exists")

    club = Club(**body.model_dump(), owner_id=user["user_id"])
    db.add(club)
    await db.commit()
    await db.refresh(club)
    return ClubResponse.model_validate(club)


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
    return ClubResponse.model_validate(club)


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
