# backend/schemas/club.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ClubCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class ClubUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None  # admin-only


class ClubResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    owner_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ClubSummary(BaseModel):
    """Lightweight embed returned inside EventResponse."""
    id: UUID
    name: str

    class Config:
        from_attributes = True
