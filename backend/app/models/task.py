# app/models/task.py
from datetime import datetime
from bson import ObjectId
from app.database.connection import tasks_collection


def task_helper(task) -> dict:
    return {
        "id": str(task["_id"]),
        "title": task["title"],
        "description": task.get("description", ""),
        "status": task.get("status", "todo"),
        "priority": task.get("priority", "medium"),
        "workspace_id": str(task["workspace_id"]),
        "assigned_to": str(task["assigned_to"]) if task.get("assigned_to") else None,
        "created_by": str(task["created_by"]),
        "deadline": task["deadline"].isoformat() if task.get("deadline") else None,
        "created_at": task.get("created_at", datetime.utcnow()).isoformat(),
        "attachment_url": task.get("attachment_url")
    }


async def create_task(data: dict) -> dict:
    data["created_at"] = datetime.utcnow()
    data["status"] = "todo"
    result = await tasks_collection.insert_one(data)
    new_task = await tasks_collection.find_one({"_id": result.inserted_id})
    return new_task


async def get_tasks_by_workspace(workspace_id: str) -> list:
    cursor = tasks_collection.find(
        {"workspace_id": ObjectId(workspace_id)}
    )
    tasks = await cursor.to_list(length=200)
    return tasks


async def get_task_by_id(task_id: str) -> dict:
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    return task


async def update_task(task_id: str, update_data: dict) -> dict:
    update_data["updated_at"] = datetime.utcnow()
    await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    return await get_task_by_id(task_id)


async def delete_task(task_id: str) -> bool:
    result = await tasks_collection.delete_one({"_id": ObjectId(task_id)})
    return result.deleted_count > 0