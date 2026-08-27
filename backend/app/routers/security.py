# app/routers/security.py
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from app.database.connection import activity_logs_collection
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/security", tags=["Security"])


def log_helper(log) -> dict:
    return {
        "id": str(log["_id"]),
        "action": log.get("action", "login"),
        "ip_address": log.get("ip_address", "unknown"),
        "device": log.get("device", "unknown"),
        "time": log.get("time", datetime.now(timezone.utc)).isoformat(),
        "status": log.get("status", "success"),
    }


@router.get("/logs")
async def get_my_logs(current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    cursor = activity_logs_collection.find(
        {"user_id": user_id}
    ).sort("time", -1).limit(20)
    logs = await cursor.to_list(length=20)
    return {
        "logs": [log_helper(log) for log in logs],
        "total": len(logs)
    }


@router.get("/stats")
async def get_security_stats(current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    total = await activity_logs_collection.count_documents(
        {"user_id": user_id}
    )
    failed = await activity_logs_collection.count_documents({
        "user_id": user_id,
        "status": "failed"
    })
    return {
        "total_logins": total,
        "failed_attempts": failed,
        "success_rate": round(
            ((total - failed) / total * 100) if total > 0 else 100, 1
        )
    }