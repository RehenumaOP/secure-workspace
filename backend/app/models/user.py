from datetime import datetime
from app.database.connection import users_collection
from bson import ObjectId

def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "member"),
        "created_at": user.get("created_at", datetime.utcnow()),
    }

async def find_user_by_email(email: str):
    user = await users_collection.find_one({"email": email})
    return user

async def find_user_by_id(user_id: str):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    return user

async def create_user(user_data: dict):
    user_data["created_at"] = datetime.utcnow()
    user_data["role"] = "member"
    result = await users_collection.insert_one(user_data)
    new_user = await users_collection.find_one({"_id": result.inserted_id})
    return new_user
