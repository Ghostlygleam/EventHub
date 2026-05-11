from fastapi import APIRouter, Depends
from schemas.event import EventCreate, EventUpdate, EventResponse
from core.security import get_current_user, require_role

router = APIRouter()


@router.get("")
async def list_events(
    event_type: str = None,
    status: str = "upcoming",
    search: str = None,
    page: int = 1,
    user=Depends(get_current_user),
):
    # TODO: query DB with filters and pagination
    return {"events": [], "page": page, "total": 0}


@router.get("/{event_id}")
async def get_event(event_id: str, user=Depends(get_current_user)):
    # TODO: fetch event by id
    return {"event_id": event_id}


@router.post("", status_code=201)
async def create_event(
    body: EventCreate,
    user=Depends(require_role("organiser", "admin")),
):
    # TODO: insert event into DB
    return {"message": "Event created"}


@router.patch("/{event_id}")
async def update_event(
    event_id: str,
    body: EventUpdate,
    user=Depends(require_role("organiser", "admin")),
):
    # TODO: update event (check ownership)
    return {"message": "Event updated"}


@router.delete("/{event_id}")
async def cancel_event(
    event_id: str,
    user=Depends(require_role("organiser", "admin")),
):
    # TODO: set is_cancelled = True
    return {"message": "Event cancelled"}


@router.get("/{event_id}/registrations")
async def get_event_registrations(
    event_id: str,
    user=Depends(require_role("organiser", "admin")),
):
    # TODO: fetch registrations for event
    return {"registrations": []}
