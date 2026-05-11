from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

# Supabase PostgreSQL connection string
# Replace [password] and [host] with your actual Supabase DB credentials
DATABASE_URL = settings.supabase_url.replace(
    "https://", "postgresql+asyncpg://postgres:[password]@"
).replace(".supabase.co", ".supabase.co:5432/postgres")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
