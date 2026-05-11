import uuid
from sqlalchemy import Boolean, Column, String, Integer, Enum, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
import enum


class EventType(str, enum.Enum):
    lecture = "lecture"
    club = "club"
    workshop = "workshop"
    other = "other"


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    event_type = Column(Enum(EventType), nullable=False)
    location = Column(String, nullable=False)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    capacity = Column(Integer, nullable=True)
    speaker_name = Column(String, nullable=True)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=True)
    organiser_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cover_image_url = Column(String, nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    is_cancelled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
