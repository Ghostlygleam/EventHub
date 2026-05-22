"""
Pytest fixtures for integration tests.

Requires TEST_DATABASE_URL pointing to the Supabase SESSION-MODE pooler (port 5432).
Each test starts from a clean slate with only the four base users seeded.

Run from backend/:
    TEST_DATABASE_URL=postgresql+asyncpg://postgres.PROJECT-REF:PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres pytest
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta

import asyncpg
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from main import app
from core.database import get_db
from core.security import get_current_user
from models.event import Event, EventType
from models.registration import Registration
from models.user import User, UserRole

# On Windows Python 3.8+, asyncio defaults to ProactorEventLoop which asyncpg
# handles fine, but explicitly selecting SelectorEventLoop avoids subtle issues
# with some asyncpg versions when we spin up temporary loops per test.
if os.name == "nt":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# ── Prerequisite check ────────────────────────────────────────

TEST_DB_URL = os.getenv("TEST_DATABASE_URL")

if not TEST_DB_URL:
    pytest.skip(
        "Set TEST_DATABASE_URL to run integration tests.\n"
        "Use the Supabase SESSION-MODE pooler (port 5432, not the transaction-mode port 6543):\n"
        "  TEST_DATABASE_URL=postgresql+asyncpg://postgres.PROJECT-REF:PASSWORD"
        "@aws-1-REGION.pooler.supabase.com:5432/postgres pytest",
        allow_module_level=True,
    )

# asyncpg expects postgresql:// not postgresql+asyncpg://
_RAW_DSN = TEST_DB_URL.replace("postgresql+asyncpg://", "postgresql://")
_TRUNCATE_SQL = (
    "TRUNCATE TABLE registrations, audit_logs, events, users RESTART IDENTITY CASCADE"
)

# ── Fixed UUIDs for test actors ───────────────────────────────
# uuid.UUID objects required because all id/FK columns are UUID(as_uuid=True).
# String forms are used in auth payloads (which mimic JWT string fields).

STUDENT_ID    = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
ORGANISER_ID  = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
ADMIN_ID      = uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
OTHER_ORG_ID  = uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")

STUDENT_PAYLOAD    = {"user_id": str(STUDENT_ID),   "email": "student@test.ac.uk",   "role": "student"}
ORGANISER_PAYLOAD  = {"user_id": str(ORGANISER_ID), "email": "organiser@test.ac.uk", "role": "organiser"}
ADMIN_PAYLOAD      = {"user_id": str(ADMIN_ID),     "email": "admin@test.ac.uk",     "role": "admin"}
OTHER_ORG_PAYLOAD  = {"user_id": str(OTHER_ORG_ID), "email": "other@test.ac.uk",     "role": "organiser"}

_BASE_USERS = [
    User(id=STUDENT_ID,   email="student@test.ac.uk",   role=UserRole.student,   is_active=True),
    User(id=ORGANISER_ID, email="organiser@test.ac.uk", role=UserRole.organiser, is_active=True),
    User(id=ADMIN_ID,     email="admin@test.ac.uk",     role=UserRole.admin,     is_active=True),
    User(id=OTHER_ORG_ID, email="other@test.ac.uk",     role=UserRole.organiser, is_active=True),
]

# ── Session-scoped event loop (required for session-scoped async fixtures) ────

@pytest.fixture(scope="session")
def event_loop():
    """Single event loop for the entire session so the engine + asyncpg pool
    all live on the same loop and never see 'Event loop is closed'."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

# ── Session-scoped SQLAlchemy engine ─────────────────────────

@pytest_asyncio.fixture(scope="session")
async def engine():
    """
    Shared engine for all tests. statement_cache_size=0 prevents
    prepared-statement conflicts through pgbouncer session mode.
    """
    eng = create_async_engine(
        TEST_DB_URL,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    )
    yield eng
    await eng.dispose()

# ── Per-test cleanup: truncate before each test ───────────────

async def _do_truncate() -> None:
    """Open a fresh asyncpg connection, truncate, close — no pool, no shared state."""
    conn = await asyncpg.connect(_RAW_DSN, statement_cache_size=0)
    try:
        await conn.execute(_TRUNCATE_SQL)
    finally:
        await conn.close()


@pytest.fixture(autouse=True)
def clean_tables():
    """
    SYNC fixture: spins up a brand-new event loop, truncates all tables, then
    closes the loop.  Completely isolated from the session-scoped SQLAlchemy
    engine loop so there is never a 'Future attached to a different loop' error.
    """
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_do_truncate())
    finally:
        loop.close()
    yield

# ── Per-test setup session: seed base users + test data ───────

@pytest_asyncio.fixture
async def db(engine, clean_tables):
    """
    Session for test setup. Depends on clean_tables so the TRUNCATE always
    finishes before users are seeded. Committed data is visible to the app's
    independent sessions (no shared transaction tricks).

    IMPORTANT: we build *fresh* User instances every call.  The module-level
    _BASE_USERS objects become SQLAlchemy-'detached' after test 1 closes its
    session.  Passing a detached object to session.add() re-attaches it as
    'persistent' (already in DB), so no INSERT is emitted on commit — but
    TRUNCATE already wiped the rows.  Fresh instances start as 'transient'
    and are always inserted.
    """
    async with AsyncSession(engine, expire_on_commit=False) as session:
        fresh_users = [
            User(id=STUDENT_ID,   email="student@test.ac.uk",   role=UserRole.student,   is_active=True),
            User(id=ORGANISER_ID, email="organiser@test.ac.uk", role=UserRole.organiser, is_active=True),
            User(id=ADMIN_ID,     email="admin@test.ac.uk",     role=UserRole.admin,     is_active=True),
            User(id=OTHER_ORG_ID, email="other@test.ac.uk",     role=UserRole.organiser, is_active=True),
        ]
        for user in fresh_users:
            session.add(user)
        await session.commit()
        yield session

# ── Auth + DB overrides ───────────────────────────────────────

def _auth_override(payload: dict):
    async def _dep():
        return payload
    return _dep


def _db_override(eng):
    """Each request gets its own fresh session, just like production."""
    factory = async_sessionmaker(eng, expire_on_commit=False)

    async def _dep():
        async with factory() as session:
            yield session

    return _dep


def _make_client(payload: dict, eng) -> AsyncClient:
    app.dependency_overrides[get_current_user] = _auth_override(payload)
    app.dependency_overrides[get_db] = _db_override(eng)
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest_asyncio.fixture
async def student(engine, db):
    async with _make_client(STUDENT_PAYLOAD, engine) as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def organiser(engine, db):
    async with _make_client(ORGANISER_PAYLOAD, engine) as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin(engine, db):
    async with _make_client(ADMIN_PAYLOAD, engine) as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def other_organiser(engine, db):
    async with _make_client(OTHER_ORG_PAYLOAD, engine) as c:
        yield c
    app.dependency_overrides.clear()

# ── Event factory ─────────────────────────────────────────────

@pytest_asyncio.fixture
def make_event(db):
    """
    Returns an async factory. Call it inside your test to create events.
    Data is committed immediately so the app's session can see it.

    Usage:
        event = await make_event(title="My Event", capacity=10)
    """
    now = datetime.now(timezone.utc)

    async def _create(**kwargs) -> Event:
        defaults = dict(
            organiser_id=ORGANISER_ID,
            title="Test Event",
            description="Test Description",
            event_type=EventType.lecture,
            location="Room 101",
            starts_at=now + timedelta(days=1),
            ends_at=now + timedelta(days=1, hours=2),
            is_published=True,
            is_cancelled=False,
        )
        # Accept string UUIDs for organiser_id (test files may pass strings)
        if "organiser_id" in kwargs and isinstance(kwargs["organiser_id"], str):
            kwargs["organiser_id"] = uuid.UUID(kwargs["organiser_id"])
        defaults.update(kwargs)
        event = Event(**defaults)
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    return _create
