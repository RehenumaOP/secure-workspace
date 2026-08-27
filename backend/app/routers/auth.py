# app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserResponse
from app.models.user import find_user_by_email, create_user, user_helper, find_user_by_id
from app.auth.jwt_handler import create_access_token, create_refresh_token, verify_token
from app.auth.dependencies import get_current_user
from app.database.connection import users_collection, activity_logs_collection
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from datetime import datetime, timezone

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── REGISTER ──────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    existing = await find_user_by_email(user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    hashed = hash_password(user_data.password)
    new_user = await create_user({
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed,
    })
    return {
        "message": "Account created successfully!",
        "user": user_helper(new_user)
    }


# ── LOGIN ──────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    # Get real IP
    ip = request.client.host
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()

    user = await find_user_by_email(credentials.email)

    # Log failed — user not found
    if not user:
        await activity_logs_collection.insert_one({
            "user_id": None,
            "email_attempted": credentials.email,
            "action": "login",
            "status": "failed",
            "reason": "user_not_found",
            "ip_address": ip,
            "device": request.headers.get("User-Agent", "unknown")[:100],
            "time": datetime.now(timezone.utc)
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Log failed — wrong password
    if not verify_password(credentials.password, user["password"]):
        await activity_logs_collection.insert_one({
            "user_id": user["_id"],
            "action": "login",
            "status": "failed",
            "reason": "wrong_password",
            "ip_address": ip,
            "device": request.headers.get("User-Agent", "unknown")[:100],
            "time": datetime.now(timezone.utc)
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Success
    user_id = str(user["_id"])
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    await activity_logs_collection.insert_one({
        "user_id": user["_id"],
        "action": "login",
        "status": "success",
        "ip_address": ip,
        "device": request.headers.get("User-Agent", "unknown")[:100],
        "time": datetime.now(timezone.utc)
    })

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_helper(user)
    }


# ── GET CURRENT USER ───────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired"
        )
    user = await find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_helper(user)


# ── REFRESH TOKEN ──────────────────────────────────────────
@router.post("/refresh")
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = verify_token(token, expected_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    new_access_token = create_access_token({"sub": payload["sub"]})
    return {"access_token": new_access_token, "token_type": "bearer"}


# ── CHANGE PASSWORD ────────────────────────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user=Depends(get_current_user)
):
    if not verify_password(data.current_password, current_user["password"]):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    new_hashed = hash_password(data.new_password)
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": new_hashed}}
    )
    return {"message": "Password updated successfully!"}