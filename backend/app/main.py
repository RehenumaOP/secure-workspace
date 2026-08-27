# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database.connection import connect_db, close_db
from app.routers import auth, workspace, task, security, files          # ← ADD THIS LINE




@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Secure Workspace API",
    description="A secure team workspace platform",
    version="1.0.0",
    lifespan=lifespan
)

import os
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")



app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router) 
app.include_router(workspace.router)      # ← ADD THIS LINE
app.include_router(task.router)          # ← ADD THIS LINE
app.include_router(security.router)
app.include_router(files.router)

@app.get("/")
async def root():
    return {"message": "Secure Workspace API is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}