# backend/routers/admin.py
#
# Admin-only endpoints for user management and audit logs.
# All actions are logged to audit_logs automatically.

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from core.audit import write_audit_log
from models.audit_log import AuditLog
from models.user import User, UserRole
from schemas.admin import RoleChangeRequest

logger = logging.getLogger(__name__)

router = APIRouter()


# ── GET /admin/users ─────────────────────────────────────────

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Returns paginated users with their role, status and registration date."""
    offset = (page - 1) * limit

    total_result = await db.execute(select(func.count()).select_from(User))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    users = result.scalars().all()

    return {
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


# ── GET /admin/users/:id ────────────────────────────────────

@router.get("/users/{user_id}")
async def get_user(
    user_id: UUID,
    actor: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Returns a single user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ── PATCH /admin/users/:id/role ──────────────────────────────

@router.patch("/users/{user_id}/role")
async def change_role(
    user_id: UUID,
    body: RoleChangeRequest,
    actor: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Change a user's role. Logs the old and new role to audit_logs.
    Valid roles: student, organiser, admin.
    """
    new_role = body.role
    if new_role not in [r.value for r in UserRole]:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()

    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target_user.role.value
    target_user.role = UserRole(new_role)
    await db.commit()

    await write_audit_log(
        db=db,
        actor_id=actor["user_id"],
        action="role_changed",
        target_type="user",
        target_id=str(user_id),
        meta={"old_role": old_role, "new_role": new_role},
    )

    logger.info("Admin %s changed role of %s: %s → %s", actor["email"], target_user.email, old_role, new_role)

    return {
        "message": f"Role changed to {new_role}",
        "user_id": str(user_id),
        "old_role": old_role,
        "new_role": new_role,
    }


# ── PATCH /admin/users/:id/deactivate ───────────────────────

@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: UUID,
    actor: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate a user account.
    The user's existing JWT will stop working within 24 h (token TTL).
    is_active is embedded in the token at issue time — no per-request DB lookup.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()

    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not target_user.is_active:
        raise HTTPException(status_code=400, detail="User is already deactivated")

    # Prevent admin from deactivating themselves
    if str(user_id) == actor["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    target_user.is_active = False
    await db.commit()

    await write_audit_log(
        db=db,
        actor_id=actor["user_id"],
        action="user_deactivated",
        target_type="user",
        target_id=str(user_id),
        meta={"email": target_user.email},
    )

    logger.info("Admin %s deactivated user %s", actor["email"], target_user.email)

    return {"message": "User deactivated", "user_id": str(user_id)}


# ── PATCH /admin/users/:id/reactivate ───────────────────────

@router.patch("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: UUID,
    actor: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Reactivate a previously deactivated user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()

    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.is_active:
        raise HTTPException(status_code=400, detail="User is already active")

    target_user.is_active = True
    await db.commit()

    await write_audit_log(
        db=db,
        actor_id=actor["user_id"],
        action="user_reactivated",
        target_type="user",
        target_id=str(user_id),
        meta={"email": target_user.email},
    )

    logger.info("Admin %s reactivated user %s", actor["email"], target_user.email)

    return {"message": "User reactivated", "user_id": str(user_id)}


# ── GET /admin/logs ──────────────────────────────────────────

@router.get("/logs")
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    actor: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns audit logs sorted by most recent first.
    Paginated — default 50 per page.
    """
    offset = (page - 1) * limit

    total_result = await db.execute(select(func.count()).select_from(AuditLog))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(AuditLog, User)
        .outerjoin(User, AuditLog.actor_id == User.id)
        .order_by(desc(AuditLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "actor_id": str(log.actor_id) if log.actor_id else None,
                "actor_email": user.email if user else None,
                "actor_name": user.full_name if user else None,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": str(log.target_id),
                "metadata": log.meta,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log, user in rows
        ],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "limit": limit,
    }
