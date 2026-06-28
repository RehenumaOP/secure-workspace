# app/routers/task.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from app.schemas.task import TaskCreate, TaskUpdate
from app.models.task import (
    create_task, get_tasks_by_workspace,
    get_task_by_id, update_task, delete_task, task_helper
)
from app.models.workspace import get_workspace_by_id
from app.models.user import find_user_by_id
from app.auth.jwt_handler import verify_token

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user = await find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── CREATE TASK ───────────────────────────────────────────
@router.post("/{workspace_id}", status_code=status.HTTP_201_CREATED)
async def create_new_task(
    workspace_id: str,
    data: TaskCreate,
    current_user=Depends(get_current_user)
):
    # Check workspace exists
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    task_data = {
        "title": data.title,
        "description": data.description or "",
        "priority": data.priority or "medium",
        "workspace_id": ObjectId(workspace_id),
        "created_by": current_user["_id"],
        "assigned_to": ObjectId(data.assigned_to) if data.assigned_to else None,
        "deadline": data.deadline,
        "attachment_url": data.attachment_url
    }

    new_task = await create_task(task_data)
    return {
        "message": "Task created!",
        "task": task_helper(new_task)
    }


# ── GET TASKS BY WORKSPACE ────────────────────────────────
@router.get("/{workspace_id}")
async def get_workspace_tasks(
    workspace_id: str,
    current_user=Depends(get_current_user)
):
    tasks = await get_tasks_by_workspace(workspace_id)
    return {
        "tasks": [task_helper(t) for t in tasks],
        "total": len(tasks)
    }


# ── UPDATE TASK ───────────────────────────────────────────
@router.put("/{workspace_id}/{task_id}")
async def update_existing_task(
    workspace_id: str,
    task_id: str,
    data: TaskUpdate,
    current_user=Depends(get_current_user)
):
    task = await get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Only update fields that were provided
    update_fields = {}
    if data.title is not None:
        update_fields["title"] = data.title
    if data.description is not None:
        update_fields["description"] = data.description
    if data.status is not None:
        update_fields["status"] = data.status
    if data.priority is not None:
        update_fields["priority"] = data.priority
    if data.assigned_to is not None:
        update_fields["assigned_to"] = ObjectId(data.assigned_to)
    if data.deadline is not None:
        update_fields["deadline"] = data.deadline

    updated = await update_task(task_id, update_fields)
    return {"message": "Task updated!", "task": task_helper(updated)}


# ── DELETE TASK ───────────────────────────────────────────
@router.delete("/{workspace_id}/{task_id}")
async def delete_existing_task(
    workspace_id: str,
    task_id: str,
    current_user=Depends(get_current_user)
):
    task = await get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await delete_task(task_id)
    return {"message": "Task deleted!"}