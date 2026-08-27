# app/models/workspace.py
from datetime import datetime, timezone
from bson import ObjectId
from app.database.connection import workspaces_collection


def workspace_helper(workspace) -> dict:
    all_members = workspace.get("members", [])
    active_members = [
        m for m in all_members
        if m.get("status", "active") == "active"
    ]

    members_out = []
    for m in all_members:
        members_out.append({
            "user_id": str(m["user_id"]),
            "role": m.get("role", "member"),
            "status": m.get("status", "active"),
            "joined_at": m.get(
                "joined_at", datetime.now(timezone.utc)
            ).isoformat()
        })

    return {
        "id": str(workspace["_id"]),
        "name": workspace["name"],
        "description": workspace.get("description", ""),
        "owner_id": str(workspace["owner_id"]),
        "members": members_out,
        "member_count": len(active_members),
        "created_at": workspace.get(
            "created_at", datetime.now(timezone.utc)
        ).isoformat()
    }


async def create_workspace(data: dict) -> dict:
    data["created_at"] = datetime.now(timezone.utc)
    result = await workspaces_collection.insert_one(data)
    new_ws = await workspaces_collection.find_one(
        {"_id": result.inserted_id}
    )
    return new_ws


async def get_user_workspaces(user_id: str) -> list:
    object_id = ObjectId(user_id)
    cursor = workspaces_collection.find({
        "members": {
            "$elemMatch": {
                "user_id": object_id,
                "status": "active"
            }
        }
    })
    workspaces = await cursor.to_list(length=100)
    return workspaces


async def get_workspace_by_id(workspace_id: str) -> dict:
    ws = await workspaces_collection.find_one(
        {"_id": ObjectId(workspace_id)}
    )
    return ws


async def add_member_to_workspace(
    workspace_id: str, user_id: str, role: str
) -> bool:
    result = await workspaces_collection.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$push": {
            "members": {
                "user_id": ObjectId(user_id),
                "role": role,
                "status": "pending",
                "joined_at": datetime.now(timezone.utc)
            }
        }}
    )
    return result.modified_count > 0