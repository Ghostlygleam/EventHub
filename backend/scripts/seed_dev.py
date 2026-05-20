"""
Dev seed script — populates the DB with test users, events and registrations.

Run from the backend/ directory:
    python scripts/seed_dev.py

Safe to re-run: skips records that already exist (upsert by email / title).
Requires DEV_AUTH_BYPASS=true in .env so the fake UUIDs match the auth bypass flow.
"""

import asyncio
import sys
from datetime import datetime, timezone, timedelta
from uuid import uuid5, NAMESPACE_DNS

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

sys.path.insert(0, ".")  # make sure backend/ is on the path

from core.database import AsyncSessionLocal
from models.event import Event, EventType
from models.registration import Registration
from models.user import User, UserRole


# ── Fixed deterministic IDs (match DEV_AUTH_BYPASS uuid5 logic) ──────────────

ADMIN_EMAIL     = "admin@dmu.ac.uk"
ORGANISER_EMAIL = "organiser@dmu.ac.uk"
STUDENT_EMAILS  = [f"student{i}@dmu.ac.uk" for i in range(1, 6)]

def dev_id(email: str) -> str:
    return str(uuid5(NAMESPACE_DNS, email))


USERS = [
    {"id": dev_id(ADMIN_EMAIL),     "email": ADMIN_EMAIL,     "role": UserRole.admin,     "full_name": "Admin User",       "is_active": True},
    {"id": dev_id(ORGANISER_EMAIL), "email": ORGANISER_EMAIL, "role": UserRole.organiser, "full_name": "Alex Organiser",   "is_active": True},
    *[
        {"id": dev_id(e), "email": e, "role": UserRole.student, "full_name": f"Student {i}", "is_active": True}
        for i, e in enumerate(STUDENT_EMAILS, 1)
    ],
]

now = datetime.now(timezone.utc)

EVENTS = [
    # Upcoming published events
    {"title": "Intro to Machine Learning",     "event_type": EventType.lecture,  "location": "Room 101", "starts_at": now + timedelta(days=3),  "ends_at": now + timedelta(days=3, hours=2),  "capacity": 50,  "is_published": True,  "speaker_name": "Dr. Smith"},
    {"title": "Python Workshop: FastAPI",      "event_type": EventType.workshop, "location": "Lab 3",    "starts_at": now + timedelta(days=5),  "ends_at": now + timedelta(days=5, hours=3),  "capacity": 20,  "is_published": True},
    {"title": "Chess Club Weekly",             "event_type": EventType.club,     "location": "Room 204", "starts_at": now + timedelta(days=7),  "ends_at": now + timedelta(days=7, hours=1),  "capacity": None,"is_published": True},
    {"title": "Web Dev Bootcamp Day 1",        "event_type": EventType.workshop, "location": "Lab 1",    "starts_at": now + timedelta(days=10), "ends_at": now + timedelta(days=10, hours=6), "capacity": 30,  "is_published": True},
    {"title": "Blockchain & Crypto Talk",      "event_type": EventType.lecture,  "location": "Auditorium","starts_at": now + timedelta(days=14), "ends_at": now + timedelta(days=14, hours=2), "capacity": 200, "is_published": True,  "speaker_name": "Prof. Nakamoto"},
    {"title": "Photography Society Meetup",    "event_type": EventType.club,     "location": "Room 310", "starts_at": now + timedelta(days=2),  "ends_at": now + timedelta(days=2, hours=2),  "capacity": 15,  "is_published": True},
    {"title": "DevOps & CI/CD Workshop",       "event_type": EventType.workshop, "location": "Lab 2",    "starts_at": now + timedelta(days=8),  "ends_at": now + timedelta(days=8, hours=4),  "capacity": 25,  "is_published": True},
    {"title": "Cybersecurity Awareness Talk",  "event_type": EventType.lecture,  "location": "Room 102", "starts_at": now + timedelta(days=12), "ends_at": now + timedelta(days=12, hours=1), "capacity": 100, "is_published": True,  "speaker_name": "Dr. Hacker"},
    {"title": "Debate Club Finals",            "event_type": EventType.club,     "location": "Main Hall","starts_at": now + timedelta(days=4),  "ends_at": now + timedelta(days=4, hours=3),  "capacity": None,"is_published": True},
    {"title": "React & TypeScript Deep Dive",  "event_type": EventType.workshop, "location": "Lab 4",    "starts_at": now + timedelta(days=6),  "ends_at": now + timedelta(days=6, hours=3),  "capacity": 20,  "is_published": True},

    # Draft (not published)
    {"title": "Docker & Kubernetes 101",       "event_type": EventType.workshop, "location": "Lab 2",    "starts_at": now + timedelta(days=20), "ends_at": now + timedelta(days=20, hours=3), "capacity": 25,  "is_published": False},
    {"title": "AI Ethics Seminar",             "event_type": EventType.lecture,  "location": "Room 201", "starts_at": now + timedelta(days=25), "ends_at": now + timedelta(days=25, hours=2), "capacity": 60,  "is_published": False, "speaker_name": "Prof. Turing"},

    # Past published events
    {"title": "Git & GitHub for Beginners",    "event_type": EventType.workshop, "location": "Lab 1",    "starts_at": now - timedelta(days=10), "ends_at": now - timedelta(days=10) + timedelta(hours=2), "capacity": 30,  "is_published": True},
    {"title": "Intro to Cloud Computing",      "event_type": EventType.lecture,  "location": "Room 101", "starts_at": now - timedelta(days=7),  "ends_at": now - timedelta(days=7)  + timedelta(hours=2), "capacity": 80,  "is_published": True,  "speaker_name": "Mr. Cloud"},
    {"title": "Robotics Club Demo Day",        "event_type": EventType.club,     "location": "Main Hall","starts_at": now - timedelta(days=3),  "ends_at": now - timedelta(days=3)  + timedelta(hours=3), "capacity": None,"is_published": True},

    # Cancelled event
    {"title": "Data Science Summit (Cancelled)","event_type": EventType.lecture, "location": "Auditorium","starts_at": now + timedelta(days=9),  "ends_at": now + timedelta(days=9, hours=4),  "capacity": 150, "is_published": True,  "is_cancelled": True, "cancelled_at": now - timedelta(hours=2)},

    # Fully booked upcoming event (capacity=2)
    {"title": "Exclusive VIP Masterclass",     "event_type": EventType.workshop, "location": "Room 001", "starts_at": now + timedelta(days=1),  "ends_at": now + timedelta(days=1, hours=2),  "capacity": 2,   "is_published": True},

    # Various types
    {"title": "Film Club Screening Night",     "event_type": EventType.club,     "location": "Cinema",   "starts_at": now + timedelta(days=11), "ends_at": now + timedelta(days=11, hours=2), "capacity": 40,  "is_published": True},
    {"title": "SQL for Data Analysis",         "event_type": EventType.workshop, "location": "Lab 3",    "starts_at": now + timedelta(days=16), "ends_at": now + timedelta(days=16, hours=3), "capacity": 20,  "is_published": True},
    {"title": "Career Fair Prep Talk",         "event_type": EventType.other,    "location": "Room 103", "starts_at": now + timedelta(days=18), "ends_at": now + timedelta(days=18, hours=1), "capacity": 60,  "is_published": True},
]


async def seed():
    async with AsyncSessionLocal() as db:
        # ── Users ──────────────────────────────────────────────
        for u in USERS:
            existing = await db.execute(select(User).where(User.email == u["email"]))
            if existing.scalar_one_or_none() is None:
                db.add(User(**u))
        await db.commit()
        print(f"✓ {len(USERS)} users seeded")

        # ── Events ─────────────────────────────────────────────
        organiser_id = dev_id(ORGANISER_EMAIL)
        created_events = []

        for e in EVENTS:
            existing = await db.execute(select(Event).where(Event.title == e["title"]))
            if existing.scalar_one_or_none() is None:
                event = Event(
                    organiser_id=organiser_id,
                    description=f"Full description for: {e['title']}. Join us for this exciting event at DMU Kazakhstan.",
                    **{k: v for k, v in e.items() if k != "description"},
                )
                db.add(event)
                created_events.append(event)

        await db.commit()
        for ev in created_events:
            await db.refresh(ev)
        print(f"✓ {len(created_events)} events seeded")

        # ── Registrations ──────────────────────────────────────
        result = await db.execute(
            select(Event).where(Event.is_published == True, Event.is_cancelled == False)
        )
        published = result.scalars().all()

        reg_count = 0
        student_ids = [dev_id(e) for e in STUDENT_EMAILS]

        for event in published[:10]:  # register students for first 10 published events
            for sid in student_ids[:3]:  # 3 students per event
                if event.capacity and event.capacity <= 2:
                    # Fill the VIP masterclass to capacity with first 2 students
                    students_for_event = student_ids[:2]
                else:
                    students_for_event = student_ids[:3]

                for s_id in students_for_event:
                    existing_reg = await db.execute(
                        select(Registration).where(
                            Registration.event_id == event.id,
                            Registration.student_id == s_id,
                        )
                    )
                    if existing_reg.scalar_one_or_none() is None:
                        db.add(Registration(event_id=event.id, student_id=s_id))
                        reg_count += 1

        await db.commit()
        print(f"✓ {reg_count} registrations seeded")
        print("\nDev accounts (all use OTP code 000000):")
        print(f"  admin:     {ADMIN_EMAIL}")
        print(f"  organiser: {ORGANISER_EMAIL}")
        for e in STUDENT_EMAILS:
            print(f"  student:   {e}")


if __name__ == "__main__":
    asyncio.run(seed())
