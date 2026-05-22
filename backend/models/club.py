import uuid
from sqlalchemy import Boolean, Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base


class Club(Base):
    __tablename__ = "clubs"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    owner_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active   = Column(Boolean, default=True, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
