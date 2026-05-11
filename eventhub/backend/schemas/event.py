from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from models.event import EventType


class EventCreate(BaseModel):
    title: str
    description: str
    event_type: EventType
    location: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    capacity: Optional[int] = None
    speaker_name: Optional[str] = None
    club_id: Optional[UUID] = None
    cover_image_url: Optional[str] = None
    is_published: bool = False


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    location: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    capacity: Optional[int] = None
    speaker_name: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_published: Optional[bool] = None


class EventResponse(BaseModel):
    id: UUID
    title: str
    description: str
    event_type: EventType
    location: str
    starts_at: datetime
    ends_at: Optional[datetime]
    capacity: Optional[int]
    speaker_name: Optional[str]
    organiser_id: UUID
    is_published: bool
    is_cancelled: bool
    created_at: datetime

    class Config:
        from_attributes = True
