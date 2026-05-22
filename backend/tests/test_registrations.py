"""
Integration tests for /registrations endpoints.

Covers: register, capacity, cancellation, deduplication, my-registrations.
"""

from datetime import datetime, timezone, timedelta

from models.registration import Registration
from tests.conftest import STUDENT_ID, ORGANISER_ID


# ── POST /registrations ───────────────────────────────────────

class TestRegister:
    async def test_register_for_event(self, student, make_event):
        event = await make_event()

        r = await student.post("/registrations", json={"event_id": str(event.id)})

        assert r.status_code == 201

    async def test_double_register_returns_409(self, student, make_event):
        event = await make_event()
        await student.post("/registrations", json={"event_id": str(event.id)})

        r = await student.post("/registrations", json={"event_id": str(event.id)})

        assert r.status_code == 409

    async def test_register_cancelled_event_returns_400(self, student, make_event):
        event = await make_event(is_cancelled=True)

        r = await student.post("/registrations", json={"event_id": str(event.id)})

        assert r.status_code == 400

    async def test_register_past_event_returns_400(self, student, make_event):
        now = datetime.now(timezone.utc)
        event = await make_event(starts_at=now - timedelta(hours=2))

        r = await student.post("/registrations", json={"event_id": str(event.id)})

        assert r.status_code == 400

    async def test_register_unpublished_event_returns_404(self, student, make_event):
        event = await make_event(is_published=False)

        r = await student.post("/registrations", json={"event_id": str(event.id)})

        assert r.status_code == 404

    async def test_register_full_event_returns_409(self, student, make_event, db):
        event = await make_event(capacity=1)
        # Fill the single spot via another user
        db.add(Registration(event_id=event.id, student_id=ORGANISER_ID))
        await db.commit()

        r = await student.post("/registrations", json={"event_id": str(event.id)})

        assert r.status_code == 409

    async def test_is_registered_flips_after_registering(self, student, make_event):
        event = await make_event()

        await student.post("/registrations", json={"event_id": str(event.id)})
        r = await student.get(f"/events/{event.id}")

        assert r.status_code == 200
        assert r.json()["is_registered"] is True

    async def test_registered_count_increments(self, student, make_event):
        event = await make_event()
        count_before = (await student.get(f"/events/{event.id}")).json()["registered_count"]

        await student.post("/registrations", json={"event_id": str(event.id)})
        count_after = (await student.get(f"/events/{event.id}")).json()["registered_count"]

        assert count_after == count_before + 1

    async def test_spots_left_decrements(self, student, make_event):
        event = await make_event(capacity=5)
        spots_before = (await student.get(f"/events/{event.id}")).json()["spots_left"]

        await student.post("/registrations", json={"event_id": str(event.id)})
        spots_after = (await student.get(f"/events/{event.id}")).json()["spots_left"]

        assert spots_after == spots_before - 1


# ── DELETE /registrations/{event_id} ─────────────────────────

class TestCancelRegistration:
    async def test_cancel_registration(self, student, make_event, db):
        event = await make_event()
        db.add(Registration(event_id=event.id, student_id=STUDENT_ID))
        await db.commit()

        r = await student.delete(f"/registrations/{event.id}")

        assert r.status_code == 204

    async def test_cancel_nonexistent_registration_returns_404(self, student, make_event):
        event = await make_event()

        r = await student.delete(f"/registrations/{event.id}")

        assert r.status_code == 404

    async def test_cannot_cancel_after_event_started(self, student, make_event, db):
        now = datetime.now(timezone.utc)
        event = await make_event(starts_at=now - timedelta(hours=1))
        db.add(Registration(event_id=event.id, student_id=STUDENT_ID))
        await db.commit()

        r = await student.delete(f"/registrations/{event.id}")

        assert r.status_code == 400

    async def test_is_registered_flips_after_cancellation(self, student, make_event, db):
        event = await make_event()
        db.add(Registration(event_id=event.id, student_id=STUDENT_ID))
        await db.commit()

        await student.delete(f"/registrations/{event.id}")
        r = await student.get(f"/events/{event.id}")

        assert r.json()["is_registered"] is False


# ── GET /registrations/me ─────────────────────────────────────

class TestMyRegistrations:
    async def test_empty_when_no_registrations(self, student):
        r = await student.get("/registrations/me")

        assert r.status_code == 200
        assert r.json()["upcoming"] == []
        assert r.json()["past"] == []

    async def test_upcoming_event_appears_in_upcoming(self, student, make_event, db):
        event = await make_event()
        db.add(Registration(event_id=event.id, student_id=STUDENT_ID))
        await db.commit()

        r = await student.get("/registrations/me")

        assert r.status_code == 200
        assert len(r.json()["upcoming"]) == 1
        assert r.json()["upcoming"][0]["title"] == event.title

    async def test_past_event_appears_in_past(self, student, make_event, db):
        now = datetime.now(timezone.utc)
        event = await make_event(starts_at=now - timedelta(days=2))
        db.add(Registration(event_id=event.id, student_id=STUDENT_ID))
        await db.commit()

        r = await student.get("/registrations/me")

        assert r.status_code == 200
        assert len(r.json()["past"]) == 1
