# app/routers/workspace.py
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.schemas.workspace import WorkspaceCreate, MemberInvite
from app.models.workspace import (
    create_workspace, get_user_workspaces,
    get_workspace_by_id, add_member_to_workspace,
    workspace_helper
)
from app.models.user import find_user_by_email
from app.database.connection import workspaces_collection, users_collection
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])


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
                "joined_at": datetime.now(timezone.utc)
            }
        ],
        "created_at": datetime.now(timezone.utc)
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


# ── GET MY PENDING INVITES ────────────────────────────────
# IMPORTANT: this route must come BEFORE /{workspace_id}
# otherwise FastAPI treats "my-invites" as a workspace_id
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


# ── GET MEMBERS WITH REAL NAMES ───────────────────────────
@router.get("/{workspace_id}/members")
async def get_workspace_members(
    workspace_id: str,
    current_user=Depends(get_current_user)
):
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check caller is a member
    user_id = current_user["_id"]
    member_ids = [m["user_id"] for m in ws.get("members", [])]
    if user_id not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this workspace"
        )

    # Enrich each member with name + email from users collection
    enriched = []
    for m in ws.get("members", []):
        user_doc = await users_collection.find_one({"_id": m["user_id"]})
        enriched.append({
            "user_id": str(m["user_id"]),
            "name": user_doc["name"] if user_doc else "Unknown",
            "email": user_doc["email"] if user_doc else "",
            "role": m.get("role", "member"),
            "status": m.get("status", "active"),
            "joined_at": m.get(
                "joined_at", datetime.now(timezone.utc)
            ).isoformat()
        })

    return {"members": enriched}


# ── INVITE MEMBER (pending) ───────────────────────────────
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
    user_id = current_user["_id"]
    user_role = None
    for member in ws.get("members", []):
        if member["user_id"] == user_id:
            user_role = member["role"]
            break

    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can invite members"
        )

    invited_user = await find_user_by_email(invite_data.email)
    if not invited_user:
        raise HTTPException(
            status_code=404,
            detail="No account found with that email"
        )

    invited_id = invited_user["_id"]

    # Check not already a member or pending
    for m in ws.get("members", []):
        if str(m["user_id"]) == str(invited_id):
            if m.get("status") == "pending":
                raise HTTPException(
                    status_code=400,
                    detail="Invite already sent — awaiting acceptance"
                )
            raise HTTPException(
                status_code=400,
                detail="User is already a member"
            )

    await workspaces_collection.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$push": {
            "members": {
                "user_id": invited_id,
                "role": invite_data.role,
                "status": "pending",
                "joined_at": datetime.now(timezone.utc)
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
        raise HTTPException(
            status_code=404,
            detail="No pending invite found for you"
        )

    await workspaces_collection.update_one(
        {
            "_id": ObjectId(workspace_id),
            "members.user_id": user_id
        },
        {"$set": {"members.$.status": "active"}}
    )
    return {"message": "You have joined the workspace!"}


# ── REMOVE MEMBER ─────────────────────────────────────────
@router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(
    workspace_id: str,
    user_id: str,
    current_user=Depends(get_current_user)
):
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    current_role = None
    for m in ws.get("members", []):
        if str(m["user_id"]) == str(current_user["_id"]):
            current_role = m["role"]
            break

    if current_role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admins can remove members"
        )

    if str(ws["owner_id"]) == user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove the workspace owner"
        )

    await workspaces_collection.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$pull": {"members": {"user_id": ObjectId(user_id)}}}
    )
    return {"message": "Member removed successfully!"}


# ── DELETE WORKSPACE ──────────────────────────────────────
@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    current_user=Depends(get_current_user)
):
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if str(ws["owner_id"]) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can delete it"
        )

    await workspaces_collection.delete_one({"_id": ObjectId(workspace_id)})
    return {"message": "Workspace deleted successfully!"}