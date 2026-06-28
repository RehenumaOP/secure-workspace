# app/routers/workspace.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from bson import ObjectId
from app.schemas.workspace import WorkspaceCreate, MemberInvite
from app.models.workspace import (
    create_workspace, get_user_workspaces,
    get_workspace_by_id, add_member_to_workspace,
    workspace_helper
)
from app.models.user import find_user_by_email, find_user_by_id
from app.auth.jwt_handler import verify_token
from app.database.connection import workspaces_collection

router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


# ── CREATE WORKSPACE ──────────────────────────────────────
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_new_workspace(
    data: WorkspaceCreate,
    current_user=Depends(get_current_user)
):
    user_id = current_user["_id"]

    workspace_data = {
        "name": data.name,
        "description": data.description or "",
        "owner_id": user_id,
        "members": [
            {
                "user_id": user_id,
                "role": "admin",
                "status": "active",
                "joined_at": datetime.utcnow()
            }
        ],
        "created_at": datetime.utcnow()
    }

    new_ws = await create_workspace(workspace_data)
    return {
        "message": "Workspace created successfully!",
        "workspace": workspace_helper(new_ws)
    }


# ── GET MY WORKSPACES ─────────────────────────────────────
@router.get("/")
async def get_my_workspaces(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    workspaces = await get_user_workspaces(user_id)
    return {
        "workspaces": [workspace_helper(ws) for ws in workspaces],
        "total": len(workspaces)
    }


# ── GET PENDING INVITES for current user ──────────────────
# NOTE: this MUST be declared before "/{workspace_id}" below.
# FastAPI matches routes top-to-bottom, and "/{workspace_id}" is a
# wildcard that would otherwise swallow "/my-invites" as if
# workspace_id == "my-invites", causing an ObjectId crash.
@router.get("/my-invites")
async def get_my_invites(current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    cursor = workspaces_collection.find({
        "members": {
            "$elemMatch": {
                "user_id": user_id,
                "status": "pending"
            }
        }
    })
    pending = await cursor.to_list(length=50)
    return {
        "invites": [
            {
                "workspace_id": str(ws["_id"]),
                "workspace_name": ws["name"],
                "description": ws.get("description", "")
            }
            for ws in pending
        ]
    }


# ── GET SINGLE WORKSPACE ──────────────────────────────────
@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    current_user=Depends(get_current_user)
):
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    user_id = current_user["_id"]
    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if user_id not in member_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace"
        )

    return workspace_helper(ws)


# ── INVITE MEMBER (pending until accepted) ────────────────
@router.post("/{workspace_id}/invite")
async def invite_member(
    workspace_id: str,
    invite_data: MemberInvite,
    current_user=Depends(get_current_user)
):
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Only admin can invite
    user_role = None
    for m in ws.get("members", []):
        if str(m["user_id"]) == str(current_user["_id"]):
            user_role = m["role"]
            break
    if user_role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can invite members")

    # Find invited user
    invited_user = await find_user_by_email(invite_data.email)
    if not invited_user:
        raise HTTPException(status_code=404, detail="No account found with that email")

    invited_id = invited_user["_id"]

    # Check not already a member or pending
    # NOTE: renamed local var from `status` to `member_status` —
    # `status` is already imported from fastapi at the top of this
    # file (used for status.HTTP_404_NOT_FOUND etc). Reassigning a
    # local variable with the same name would shadow that import
    # for the rest of this function.
    for m in ws.get("members", []):
        if str(m["user_id"]) == str(invited_id):
            member_status = m.get("status", "active")
            if member_status == "pending":
                raise HTTPException(status_code=400, detail="Invite already sent — awaiting acceptance")
            raise HTTPException(status_code=400, detail="User is already a member")

    # Add with status=pending — NOT active yet
    await workspaces_collection.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$push": {
            "members": {
                "user_id": invited_id,
                "role": invite_data.role,
                "status": "pending",
                "joined_at": datetime.utcnow()
            }
        }}
    )

    return {
        "message": f"Invite sent to {invited_user['name']}. They must accept to join.",
        "status": "pending"
    }


# ── ACCEPT INVITE ─────────────────────────────────────────
@router.post("/{workspace_id}/accept-invite")
async def accept_invite(
    workspace_id: str,
    current_user=Depends(get_current_user)
):
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    user_id = current_user["_id"]
    found = False
    for m in ws.get("members", []):
        if str(m["user_id"]) == str(user_id) and m.get("status") == "pending":
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="No pending invite found for you")

    await workspaces_collection.update_one(
        {
            "_id": ObjectId(workspace_id),
            "members.user_id": user_id
        },
        {"$set": {"members.$.status": "active"}}
    )
    return {"message": "You have joined the workspace!"}
