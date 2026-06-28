# app/schemas/workspace.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class MemberInvite(BaseModel):
    email: str
    role: str = "member"  # admin, member, viewer

class MemberResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    joined_at: datetime

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    member_count: int
    created_at: datetime