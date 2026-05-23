# backend/core/audit.py
#
# Shared helper for writing audit log entries.
# Called from any router that mutates privileged state (admin, clubs, ...).

from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_log import AuditLog


async def write_audit_log(
    db: AsyncSession,
    actor_id: str,
    action: str,
    target_type: str,
    target_id: str,
    meta: dict | None = None,
) -> None:
    """Persist a single audit entry. Commits its own transaction."""
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        meta=meta or {},
    )
    db.add(log)
    await db.commit()
