import uuid
from sqlalchemy import Boolean, Column, String, Enum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base
import enum


class UserRole(str, enum.Enum):
    student = "student"
    organiser = "organiser"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
