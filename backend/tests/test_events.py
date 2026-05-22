"""
Integration tests for /events endpoints.

Covers: listing, filtering, detail, create, update, cancel.
Each test runs against a real PostgreSQL DB — the kind of test that would
have caught the user_role/userrole enum mismatch before it hit production.
"""

from datetime import datetime, timezone, timedelta

from tests.conftest import ORGANISER_ID, OTHER_ORG_ID
from models.event import EventType


# ── GET /events ───────────────────────────────────────────────

class TestListEvents:
    async def test_student_sees_published_only(self, student, make_event):
        await make_event(title="Published", is_published=True)
        await make_event(title="Draft", is_published=False)

        r = await student.get("/events")

        assert r.status_code == 200
        titles = [e["title"] for e in r.json()["events"]]
        assert "Published" in titles
        assert "Draft" not in titles

    async def test_student_cannot_see_cancelled(self, student, make_event):
        await make_event(title="Cancelled Event", is_cancelled=True)

        r = await student.get("/events")

        assert r.status_code == 200
        assert all(not e["is_cancelled"] for e in r.json()["events"])

    async def test_organiser_mine_shows_own_drafts(self, organiser, make_event):
        await make_event(title="My Draft", is_published=False, organiser_id=ORGANISER_ID)

        r = await organiser.get("/events?mine=true")

        assert r.status_code == 200
        titles = [e["title"] for e in r.json()["events"]]
        assert "My Draft" in titles

    async def test_mine_filter_forbidden_for_student(self, student):
        r = await student.get("/events?mine=true")
        assert r.status_code == 403

    async def test_filter_by_event_type(self, student, make_event):
        await make_event(title="Lecture", event_type=EventType.lecture)
        await make_event(title="Workshop", event_type=EventType.workshop)

        r = await student.get("/events?event_type=lecture")

        assert r.status_code == 200
        types = {e["event_type"] for e in r.json()["events"]}
        assert "workshop" not in types
        assert "lecture" in types

    async def test_status_upcoming_excludes_past(self, student, make_event):
        now = datetime.now(timezone.utc)
        await make_event(title="Future", starts_at=now + timedelta(days=2))
        await make_event(
            title="Past",
            starts_at=now - timedelta(days=2),
            ends_at=now - timedelta(days=1),
        )

        r = await student.get("/events?status=upcoming")

        assert r.status_code == 200
        titles = [e["title"] for e in r.json()["events"]]
        assert "Future" in titles
        assert "Past" not in titles

    async def test_status_past_excludes_future(self, student, make_event):
        now = datetime.now(timezone.utc)
        await make_event(
            title="Past",
            starts_at=now - timedelta(days=2),
            ends_at=now - timedelta(days=1),
        )
        await make_event(title="Future", starts_at=now + timedelta(days=2))

        r = await student.get("/events?status=past")

        assert r.status_code == 200
        titles = [e["title"] for e in r.json()["events"]]
        assert "Past" in titles
        assert "Future" not in titles

    async def test_search_by_title(self, student, make_event):
        await make_event(title="Python Workshop")
        await make_event(title="Chess Club")

        r = await student.get("/events?search=python")

        assert r.status_code == 200
        titles = [e["title"] for e in r.json()["events"]]
        assert "Python Workshop" in titles
        assert "Chess Club" not in titles

    async def test_response_includes_computed_fields(self, student, make_event):
        await make_event()

        r = await student.get("/events")

        assert r.status_code == 200
        assert len(r.json()["events"]) >= 1
        event = r.json()["events"][0]
        for field in ("registered_count", "spots_left", "is_registered", "organiser_name"):
            assert field in event, f"Missing field: {field}"

    async def test_pagination_returns_pages(self, student, make_event):
        for i in range(5):
            await make_event(title=f"Event {i}")

        r = await student.get("/events?page=1")

        assert r.status_code == 200
        body = r.json()
        assert "page" in body
        assert "total" in body
        assert "pages" in body


# ── GET /events/{id} ──────────────────────────────────────────

class TestGetEvent:
    async def test_returns_event_detail(self, student, make_event):
        event = await make_event(title="Detail Test")

        r = await student.get(f"/events/{event.id}")

        assert r.status_code == 200
        assert r.json()["title"] == "Detail Test"

    async def test_returns_404_for_unknown_id(self, student):
        r = await student.get("/events/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404

    async def test_student_cannot_see_unpublished(self, student, make_event):
        event = await make_event(is_published=False)

        r = await student.get(f"/events/{event.id}")

        assert r.status_code == 404

    async def test_student_cannot_see_cancelled(self, student, make_event):
        event = await make_event(is_cancelled=True)

        r = await student.get(f"/events/{event.id}")

        assert r.status_code == 404

    async def test_organiser_can_see_own_unpublished(self, organiser, make_event):
        event = await make_event(is_published=False, organiser_id=ORGANISER_ID)

        r = await organiser.get(f"/events/{event.id}")

        # Organisers see all non-cancelled, including their own drafts
        assert r.status_code == 200

    async def test_detail_includes_registration_fields(self, student, make_event):
        event = await make_event(capacity=10)

        r = await student.get(f"/events/{event.id}")

        assert r.status_code == 200
        body = r.json()
        assert body["registered_count"] == 0
        assert body["spots_left"] == 10
        assert body["is_registered"] is False


# ── POST /events ──────────────────────────────────────────────

class TestCreateEvent:
    async def test_student_cannot_create_event(self, student):
        r = await student.post("/events", json={
            "title": "Hack",
            "description": "desc",
            "event_type": "lecture",
            "location": "Room 1",
            "starts_at": "2027-01-01T10:00:00Z",
        })
        assert r.status_code == 403

    async def test_organiser_can_create_event(self, organiser):
        r = await organiser.post("/events", json={
            "title": "Brand New Event",
            "description": "A great event",
            "event_type": "workshop",
            "location": "Lab 3",
            "starts_at": "2027-06-01T10:00:00Z",
        })
        assert r.status_code == 201
        assert r.json()["title"] == "Brand New Event"

    async def test_ends_before_starts_returns_422(self, organiser):
        r = await organiser.post("/events", json={
            "title": "Bad Dates",
            "description": "desc",
            "event_type": "lecture",
            "location": "Room 1",
            "starts_at": "2027-01-02T10:00:00Z",
            "ends_at":   "2027-01-01T10:00:00Z",
        })
        assert r.status_code == 422

    async def test_zero_capacity_returns_422(self, organiser):
        r = await organiser.post("/events", json={
            "title": "Zero Cap",
            "description": "desc",
            "event_type": "lecture",
            "location": "Room 1",
            "starts_at": "2027-01-01T10:00:00Z",
            "capacity": 0,
        })
        assert r.status_code == 422

    async def test_negative_capacity_returns_422(self, organiser):
        r = await organiser.post("/events", json={
            "title": "Negative Cap",
            "description": "desc",
            "event_type": "lecture",
            "location": "Room 1",
            "starts_at": "2027-01-01T10:00:00Z",
            "capacity": -5,
        })
        assert r.status_code == 422


# ── PATCH /events/{id} ────────────────────────────────────────

class TestUpdateEvent:
    async def test_organiser_can_update_own_event(self, organiser, make_event):
        event = await make_event(organiser_id=ORGANISER_ID)

        r = await organiser.patch(f"/events/{event.id}", json={"title": "Updated Title"})

        assert r.status_code == 200
        assert r.json()["title"] == "Updated Title"

    async def test_organiser_cannot_update_others_event(self, other_organiser, make_event):
        event = await make_event(organiser_id=ORGANISER_ID)

        r = await other_organiser.patch(f"/events/{event.id}", json={"title": "Stolen"})

        assert r.status_code == 403

    async def test_admin_can_update_any_event(self, admin, make_event):
        event = await make_event(organiser_id=ORGANISER_ID)

        r = await admin.patch(f"/events/{event.id}", json={"title": "Admin Edit"})

        assert r.status_code == 200

    async def test_cannot_update_cancelled_event(self, organiser, make_event):
        event = await make_event(is_cancelled=True)

        r = await organiser.patch(f"/events/{event.id}", json={"title": "Too Late"})

        assert r.status_code == 400

    async def test_student_cannot_update_event(self, student, make_event):
        event = await make_event()

        r = await student.patch(f"/events/{event.id}", json={"title": "Hack"})

        assert r.status_code == 403


# ── DELETE /events/{id} ───────────────────────────────────────

class TestCancelEvent:
    async def test_organiser_can_cancel_own_event(self, organiser, make_event):
        event = await make_event(organiser_id=ORGANISER_ID)

        r = await organiser.delete(f"/events/{event.id}")

        assert r.status_code == 200
        assert r.json()["message"] == "Event cancelled"

    async def test_cannot_cancel_already_cancelled(self, organiser, make_event):
        event = await make_event(is_cancelled=True)

        r = await organiser.delete(f"/events/{event.id}")

        assert r.status_code == 400

    async def test_organiser_cannot_cancel_others_event(self, other_organiser, make_event):
        event = await make_event(organiser_id=ORGANISER_ID)

        r = await other_organiser.delete(f"/events/{event.id}")

        assert r.status_code == 403

    async def test_admin_can_cancel_any_event(self, admin, make_event):
        event = await make_event(organiser_id=ORGANISER_ID)

        r = await admin.delete(f"/events/{event.id}")

        assert r.status_code == 200
