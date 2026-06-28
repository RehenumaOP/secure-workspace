# app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserResponse
from app.models.user import find_user_by_email, create_user, user_helper, find_user_by_id
from app.auth.jwt_handler import create_access_token, create_refresh_token, verify_token
from passlib.context import CryptContext
from app.database.connection import users_collection
from pydantic import BaseModel

# APIRouter is like a mini FastAPI app for just auth routes
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# bcrypt password hasher setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token checker
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Turn plain password into bcrypt hash"""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Check if plain password matches the stored hash"""
    return pwd_context.verify(plain, hashed)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
# ─── REGISTER ─────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    # 1. Check if email already exists
    existing = await find_user_by_email(user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # 2. Hash the password — never store plain text!
    hashed = hash_password(user_data.password)

    # 3. Save user to MongoDB
    new_user = await create_user({
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed,
    })

    # 4. Return success message
    return {
        "message": "Account created successfully!",
        "user": user_helper(new_user)
    }


# ─── LOGIN ────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # 1. Find user by email
    user = await find_user_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 2. Verify password against stored hash
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 3. Create JWT tokens
    user_id = str(user["_id"])
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    # Log this login to activity_logs
    from app.database.connection import activity_logs_collection
    from datetime import datetime
    import httpx
    # Get IP from request headers
    await activity_logs_collection.insert_one({
        "user_id": user["_id"],
        "action" : "login",
        "ip_address": "captured-on-request",
        "device": "web",
        "location": "Bangladesh",
        "status": "success",
        "time": datetime.utcnow()
    })

    # 4. Return tokens + user info
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_helper(user)
    }


# ─── GET CURRENT USER ─────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # 1. Get token from request header
    token = credentials.credentials

    # 2. Verify the token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired"
        )

    # 3. Get user from database
    user = await find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user_helper(user)


# ─── REFRESH TOKEN ────────────────────────────────────────
@router.post("/refresh")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Give them a new access token
    new_access_token = create_access_token({"sub": payload["sub"]})
    return {"access_token": new_access_token, "token_type": "bearer"}

    # Change password
    # ─── CHANGE PASSWORD ──────────────────────────────────────
@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # ১. টোকেন ভেরিফাই করা
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token is invalid or expired"
        )

    # ২. ইউজার খুঁজে বের করা
    user = await find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )

    # ৩. বর্তমান পাসওয়ার্ড চেক করা
    if not pwd_context.verify(data.current_password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Current password is incorrect"
        )

    # ৪. নতুন পাসওয়ার্ড হ্যাশ করে ডেটাবেজে সেভ করা
    new_hashed = pwd_context.hash(data.new_password)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": "Password updated successfully!"}