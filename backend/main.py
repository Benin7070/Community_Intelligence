import os
import asyncio
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from api.routers import (
    auth_router,
    pipeline_router as api_router,
    websocket_router as ws_router
)
from database import engine, Base
from models.user import User
from models.preference import ModelPreference
from activity import tracker

# Initialize database tables with resilient fallback
try:
    Base.metadata.create_all(bind=engine)
    print("[Database] PostgreSQL tables verified/created successfully.")
except Exception as db_err:
    print(f"[Database Warning] Table initialization deferred (database connection pending): {db_err}")

async def render_keep_alive_worker():
    """
    Autonomous Render Anti-Sleep Worker:
    Checks if server has been idle >= 45 seconds with 0 active requests.
    If idle, sends an external HTTP ping to reset Render's 50s/15m sleep timer.
    Yields immediately if any request is currently active.
    """
    external_url = (
        os.getenv("RENDER_EXTERNAL_URL") or 
        os.getenv("BACKEND_URL") or 
        os.getenv("KEEP_ALIVE_URL") or ""
    ).strip().rstrip("/")

    if not external_url:
        print("[KeepAlive] No RENDER_EXTERNAL_URL configured. Standby mode (frontend client will maintain keep-alive).")
        return

    ping_endpoint = f"{external_url}/api/v1/health/ping"
    print(f"[KeepAlive] Render anti-sleep worker active. Target: {ping_endpoint}")

    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            try:
                await asyncio.sleep(45)
                # Only ping when NO other requests are currently handling AND idle >= 45s
                if tracker.active_requests == 0 and tracker.idle_seconds >= 45:
                    try:
                        resp = await client.get(ping_endpoint)
                        if resp.status_code == 200:
                            print(f"[KeepAlive] Ping dispatched (idle: {round(tracker.idle_seconds)}s). Render instance kept awake.")
                    except Exception as err:
                        print(f"[KeepAlive] External ping notice: {err}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[KeepAlive] Worker loop exception: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the anti-sleep background task
    keep_alive_task = asyncio.create_task(render_keep_alive_worker())
    yield
    # Clean up on shutdown
    keep_alive_task.cancel()
    try:
        await keep_alive_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="Community Intelligence API", lifespan=lifespan)

# Activity Tracking Middleware (Records active in-flight requests and idle duration)
@app.middleware("http")
async def activity_middleware(request: Request, call_next):
    path = request.url.path
    is_ping = path.endswith("/ping") or path.endswith("/system-health")
    
    tracker.request_start(is_ping=is_ping)
    try:
        response = await call_next(request)
        return response
    finally:
        tracker.request_end(is_ping=is_ping)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lightweight Anti-Sleep Ping Endpoints (< 1ms, zero database overhead)
@app.get("/api/v1/health/ping")
@app.get("/ping")
def ping():
    return tracker.get_status()

# Include routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router) # WebSockets at root path for now

@app.get("/")
def read_root():
    return {"message": "Welcome to the Community Intelligence API"}

