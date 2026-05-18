from pydantic import BaseModel


class RoleChangeRequest(BaseModel):
    role: str
