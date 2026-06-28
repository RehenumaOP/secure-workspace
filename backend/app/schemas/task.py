# app/schemas/task.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"  # low, medium, high
    assigned_to: Optional[str] = None   # user_id as string
    deadline: Optional[datetime] = None
    attachment_url: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None        # todo, in_progress, done
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    priority: str
    workspace_id: str
    assigned_to: Optional[str] = None
    created_by: str
    created_at: str