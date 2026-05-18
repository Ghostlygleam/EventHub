# backend/routers/admin.py
#
# Admin-only endpoints for user management and audit logs.
# All actions are logged to audit_logs automatically.

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.audit_log import AuditLog
from models.user import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter()


async def write_audit_log(
    db: AsyncSession,
    actor_id: str,
    action: str,
    target_type: str,
    target_id: str,
    metadata: dict = None,
):
    """Write an entry to audit_logs. Called after every admin action."""
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        metadata=metadata or {},
    )
    db.add(log)
    await db.commit()


# ── GET /admin/users ─────────────────────────────────────────

@router.get("/users")
async def list_users(
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Returns all users with their role, status and registration date."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
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
        "total": len(users),
    }


# ── PATCH /admin/users/:id/role ──────────────────────────────

@router.patch("/users/{user_id}/role")
async def change_role(
    user_id: UUID,
    body: dict,  # expects {"role": "organiser"}
    actor: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Change a user's role. Logs the old and new role to audit_logs.
    Valid roles: student, organiser, admin.
    """
    new_role = body.get("role")
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
        metadata={"old_role": old_role, "new_role": new_role},
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
    Deactivate a user account. They will get 403 on next request
    even if their JWT is still valid (checked in get_current_user).
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
        metadata={"email": target_user.email},
    )

    logger.info("Admin %s deactivated user %s", actor["email"], target_user.email)

    return {"message": "User deactivated", "user_id": str(user_id)}


# ── GET /admin/logs ──────────────────────────────────────────

@router.get("/logs")
async def get_logs(
    page: int = 1,
    limit: int = 50,
    actor: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns audit logs sorted by most recent first.
    Paginated — default 50 per page.
    """
    offset = (page - 1) * limit

    result = await db.execute(
        select(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "actor_id": str(log.actor_id),
                "action": log.action,
                "target_type": log.target_type,
                "target_id": str(log.target_id),
                "metadata": log.metadata,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "page": page,
        "limit": limit,
    }
