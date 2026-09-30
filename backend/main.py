from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import (
    auth_router,
    pipeline_router as api_router,
    websocket_router as ws_router
)
from database import engine, Base
from models.user import User
from models.preference import ModelPreference

# Create tables in Supabase PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Community Intelligence API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router) # WebSockets at root path for now

@app.get("/")
def read_root():
    return {"message": "Welcome to the Community Intelligence API"}
