# Replace old imports at top with:
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from app.auth.dependencies import get_current_user
from app.models.workspace import get_workspace_by_id
from app.database.connection import files_collection
from bson import ObjectId
from datetime import datetime, timezone
import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
import uuid


load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

router = APIRouter(prefix="/api/files", tags=["Files"])

# Allowed file types
ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
}


async def check_workspace_member(workspace_id: str, user_id):
    """Reusable membership check — prevents IDOR"""
    ws = await get_workspace_by_id(workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    member_ids = [
        str(m["user_id"]) for m in ws.get("members", [])
        if m.get("status", "active") == "active"
    ]
    if str(user_id) not in member_ids:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this workspace"
        )
    return ws


@router.post("/upload")
async def upload_file(
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    # ── Membership check BEFORE reading file ──────────────
    await check_workspace_member(workspace_id, current_user["_id"])

    # ── File type check ───────────────────────────────────
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed"
        )

    # ── Size check (stream first 10MB + 1 byte) ───────────
    MAX = 10 * 1024 * 1024
    contents = await file.read(MAX + 1)
    if len(contents) > MAX:
        raise HTTPException(status_code=400, detail="File too large — max 10MB")

    # ── Unique public_id to prevent overwrites ────────────
    unique_id = f"{uuid.uuid4().hex}_{file.filename.rsplit('.', 1)[0]}"

    result = cloudinary.uploader.upload(
        contents,
        resource_type="auto",
        folder=f"secure-workspace/{workspace_id}",
        public_id=unique_id,
    )

    doc = {
        "filename": file.filename,
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "content_type": file.content_type,
        "size_bytes": len(contents),
        "workspace_id": ObjectId(workspace_id),
        "uploaded_by": current_user["_id"],
        "uploaded_at": datetime.now(timezone.utc)
    }
    await files_collection.insert_one(doc)

    return {
        "message": "File uploaded!",
        "filename": file.filename,
        "url": result["secure_url"],
        "size_bytes": len(contents)
    }


@router.get("/{workspace_id}")
async def get_workspace_files(
    workspace_id: str,
    current_user=Depends(get_current_user)
):
    # ── IDOR fix: check membership before returning files ──
    await check_workspace_member(workspace_id, current_user["_id"])

    cursor = files_collection.find({"workspace_id": ObjectId(workspace_id)})
    files_list = await cursor.to_list(length=100)
    return {
        "files": [
            {
                "id": str(f["_id"]),
                "filename": f["filename"],
                "url": f["url"],
                "content_type": f.get("content_type", ""),
                "size_bytes": f.get("size_bytes", 0),
                "uploaded_at": f.get("uploaded_at", datetime.now(timezone.utc)).isoformat()
            }
            for f in files_list
        ]
    }