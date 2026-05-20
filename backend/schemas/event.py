# backend/schemas/event.py

from pydantic import BaseModel, Field, model_validator
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
    capacity: Optional[int] = Field(None, gt=0)
    speaker_name: Optional[str] = None
    club_id: Optional[UUID] = None
    cover_image_url: Optional[str] = None
    is_published: bool = False

    @model_validator(mode="after")
    def check_dates(self):
        if self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[EventType] = None
    location: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    capacity: Optional[int] = Field(None, gt=0)
    speaker_name: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_published: Optional[bool] = None

    @model_validator(mode="after")
    def check_dates(self):
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class EventResponse(BaseModel):
    id: UUID
    title: str
    description: str
    event_type: EventType
    location: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    capacity: Optional[int] = None
    speaker_name: Optional[str] = None
    club_id: Optional[UUID] = None
    organiser_id: UUID
    cover_image_url: Optional[str] = None
    is_published: bool
    is_cancelled: bool
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    registered_count: int = 0
    spots_left: Optional[int] = None
    is_registered: bool = False

    class Config:
        from_attributes = True
