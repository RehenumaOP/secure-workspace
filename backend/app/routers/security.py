# app/routers/security.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from app.auth.jwt_handler import verify_token
from app.models.user import find_user_by_id
from app.database.connection import activity_logs_collection
from bson import ObjectId

router = APIRouter(prefix="/api/security", tags=["Security"])
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


def log_helper(log) -> dict:
    return {
        "id": str(log["_id"]),
        "action": log.get("action", "login"),
        "ip_address": log.get("ip_address", "unknown"),
        "device": log.get("device", "unknown"),
        "location": log.get("location", "unknown"),
        "time": log.get("time", datetime.utcnow()).isoformat(),
        "status": log.get("status", "success"),
    }


# ── GET MY LOGIN HISTORY ──────────────────────────────────
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


# ── LOG A LOGIN EVENT (called from auth router) ───────────
@router.post("/log")
async def create_log(log_data: dict, current_user=Depends(get_current_user)):
    log_data["user_id"] = current_user["_id"]
    log_data["time"] = datetime.utcnow()
    await activity_logs_collection.insert_one(log_data)
    return {"message": "Logged"}


# ── GET SECURITY STATS ────────────────────────────────────
@router.get("/stats")
async def get_security_stats(current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    total = await activity_logs_collection.count_documents({"user_id": user_id})
    failed = await activity_logs_collection.count_documents({
        "user_id": user_id,
        "status": "failed"
    })
    return {
        "total_logins": total,
        "failed_attempts": failed,
        "success_rate": round(((total - failed) / total * 100) if total > 0 else 100, 1)
    }