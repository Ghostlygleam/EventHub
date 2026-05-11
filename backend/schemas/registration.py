from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class RegistrationCreate(BaseModel):
    event_id: UUID


class RegistrationResponse(BaseModel):
    id: UUID
    event_id: UUID
    student_id: UUID
    registered_at: datetime

    class Config:
        from_attributes = True
