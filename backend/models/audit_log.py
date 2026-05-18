# backend/models/audit_log.py

import uuid

from sqlalchemy import Column, String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)        # e.g. 'role_changed', 'user_deactivated'
    target_type = Column(String, nullable=False)   # e.g. 'user', 'event'
    target_id = Column(UUID(as_uuid=True), nullable=False)
    meta = Column("metadata", JSONB, nullable=True)  # extra context as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
