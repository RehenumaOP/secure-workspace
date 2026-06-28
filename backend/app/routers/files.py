# app/routers/files.py
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt_handler import verify_token
from app.models.user import find_user_by_id
from app.database.connection import files_collection, db
from bson import ObjectId
from datetime import datetime
import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

router = APIRouter(prefix="/api/files", tags=["Files"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/upload")
async def upload_file(
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    # Validate size (10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large — max 10MB")

    # Upload to Cloudinary
    result = cloudinary.uploader.upload(
        contents,
        resource_type="auto",
        folder=f"secure-workspace/{workspace_id}",
        public_id=file.filename.rsplit('.', 1)[0],
    )

    # Save to MongoDB
    doc = {
        "filename": file.filename,
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "size_bytes": len(contents),
        "workspace_id": ObjectId(workspace_id),
        "uploaded_by": current_user["_id"],
        "uploaded_at": datetime.utcnow()
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
    cursor = files_collection.find({"workspace_id": ObjectId(workspace_id)})
    files = await cursor.to_list(length=100)
    return {
        "files": [
            {
                "id": str(f["_id"]),
                "filename": f["filename"],
                "url": f["url"],
                "size_bytes": f.get("size_bytes", 0),
                "uploaded_at": f.get("uploaded_at", datetime.utcnow()).isoformat()
            }
            for f in files
        ]
    }