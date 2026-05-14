# backend/core/database.py
#
# Database connection setup using SQLAlchemy async engine.
# The full DATABASE_URL comes from .env — never hardcoded here.
 
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
 
from core.config import settings
 
engine = create_async_engine(
    settings.database_url,
    echo=False,  # set to True temporarily if you want to see SQL queries in logs
)
 
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
 
 
class Base(DeclarativeBase):
    pass
 
 
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session