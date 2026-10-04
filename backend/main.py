import os
import asyncio
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from api.routers import (
    auth_router,
    pipeline_router as api_router,
    websocket_router as ws_router,
    chat_router,
    testrig_router
)
from database import engine, Base
from models.user import User
from models.preference import ModelPreference
from models.chat import Chat, ChatMessage
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

async def system_health_auto_worker():
    """
    Autonomous System Health Worker:
    Runs every 10 minutes. If any service is down, it sends an email to the admin.
    """
    from api.routers.auth import run_system_health_checks
    from mailer import send_email
    from config import settings
    from database import SessionLocal
    from models.user import SiteSettings
    
    if not settings.ADMIN_EMAILS:
        print("[AutoHealth] No ADMIN_EMAILS configured. Auto-alerting disabled.")
        return
        
    admin_emails = [e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    
    while True:
        try:
            await asyncio.sleep(600)  # Wait 10 minutes between checks
            
            print("[AutoHealth] Running background system health check...")
            
            db = SessionLocal()
            try:
                health_data = await run_system_health_checks(db=db)
                settings_rec = db.query(SiteSettings).first()
                email_alerts_enabled = settings_rec.email_alerts_enabled if settings_rec else True
            finally:
                db.close()
                
            if health_data["overall_status"] != "active" and email_alerts_enabled:
                failed_services = [s for s in health_data["services"] if s["status"] != "active"]
                print(f"[AutoHealth] Detected {len(failed_services)} degraded/failed services. Sending alerts.")
                
                html_list = ""
                for s in failed_services:
                    details_html = "<ul>"
                    for k, v in s.get("details", {}).items():
                        details_html += f"<li><em>{k}</em>: {v}</li>"
                    details_html += "</ul>"
                    
                    html_list += f"<li><strong>{s['name']}</strong> ({s['type']})<br/>Status: <b>{s['status'].upper()}</b><br/>Message: {s['message']}<br/>Details: {details_html}</li><br/>"

                subject = f"⚠️ [Alert] {settings.APP_NAME} System Degraded"
                body = f"""
                <h2>System Health Alert</h2>
                <p>The automated health check detected the following issues across your services:</p>
                <ul>
                    {html_list}
                </ul>
                <p>Please check the Admin Console for more details.</p>
                """
                
                # Send to all admins
                for email in admin_emails:
                    await send_email(email, subject, body)
                    
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[AutoHealth] Worker loop exception: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the background tasks
    keep_alive_task = asyncio.create_task(render_keep_alive_worker())
    auto_health_task = asyncio.create_task(system_health_auto_worker())
    yield
    # Clean up on shutdown
    keep_alive_task.cancel()
    auto_health_task.cancel()
    try:
        await keep_alive_task
        await auto_health_task
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

from config import settings

# Parse allowed origins from environment (comma-separated if multiple)
env_origins = []
if settings.ALLOWED_ORIGINS:
    env_origins.extend([org.strip() for org in settings.ALLOWED_ORIGINS.split(",") if org.strip()])
if settings.FRONTEND_URL and settings.FRONTEND_URL not in env_origins:
    env_origins.append(settings.FRONTEND_URL)

if settings.ENVIRONMENT == "production":
    # In production, require strict origins from environment
    allowed_origins = env_origins if env_origins else []
else:
    # In development, allow local development ports + env origins
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ] + env_origins

from fastapi.responses import JSONResponse

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler (Ensures 500 errors still pass through CORS with JSON body)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[Server Error] Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred.", "error": str(exc)},
    )

# Lightweight Anti-Sleep Ping Endpoints (< 1ms, zero database overhead)
@app.get("/api/v1/health/ping")
@app.get("/ping")
def ping():
    return tracker.get_status()

# Include routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(api_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1", tags=["chat"])
app.include_router(testrig_router, prefix="/api/v1/testrig", tags=["testrig"])
app.include_router(ws_router) # WebSockets at root path for now

@app.get("/")
def read_root():
    return {"message": "Welcome to the Community Intelligence API"}

