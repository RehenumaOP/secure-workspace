from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os


load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = AsyncIOMotorClient(MONGO_URI)
db = client["workspace_db"]

users_collection = db["users"]
workspaces_collection = db["workspaces"]
tasks_collection = db["tasks"]
activity_logs_collection = db["activity_logs"]
files_collection = db["files"]

async def connect_db():
    try:
        await client.admin.command('ping')
        print("Connected to MongoDB successfully!")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")

async def close_db():
    client.close()
    print("MongoDB connection closed")
