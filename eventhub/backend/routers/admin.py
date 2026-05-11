from fastapi import APIRouter, Depends
from core.security import require_role

router = APIRouter()


@router.get("/users")
async def list_users(user=Depends(require_role("admin"))):
    # TODO: fetch all users
    return {"users": []}


@router.patch("/users/{user_id}/role")
async def change_role(
    user_id: str,
    role: str,
    user=Depends(require_role("admin")),
):
    # TODO: update role + write audit log
    return {"message": f"Role changed to {role}"}


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    user=Depends(require_role("admin")),
):
    # TODO: set is_active = False + write audit log
    return {"message": "User deactivated"}


@router.get("/logs")
async def get_logs(user=Depends(require_role("admin"))):
    # TODO: fetch audit_logs
    return {"logs": []}
