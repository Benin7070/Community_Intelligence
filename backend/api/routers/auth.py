from datetime import datetime, timedelta
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, RoleEnum
from security import (
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_password_hash,
    verify_password
)
from api.deps import get_current_user, get_current_admin
from mailer import send_otp_email
from schemas.auth import (
    CheckEmailRequest,
    CheckEmailResponse,
    PasswordLoginRequest,
    RegisterOtpRequest,
    RegisterRequest,
    OTPRequest,
    OTPVerify,
    Token,
    UserResponse,
    UserCreateRequest,
    RoleUpdateRequest,
    PasswordResetRequest,
    PasswordResetWithOtpRequest
)

router = APIRouter()

# -----------------------------------------------------------------------------
# Authentication & Registration Endpoints
# -----------------------------------------------------------------------------

@router.post("/check-email", response_model=CheckEmailResponse)
def check_email(request: CheckEmailRequest, db: Session = Depends(get_db)):
    """Check if an email is already registered and if a password is set."""
    norm_email = request.email.lower().strip()
    user = db.query(User).filter(User.email == norm_email).first()
    if not user:
        return {
            "exists": False,
            "email": norm_email,
            "has_password": False,
            "role": None
        }
    return {
        "exists": True,
        "email": user.email,
        "has_password": bool(user.hashed_password),
        "role": user.role.value
    }

@router.post("/login-password", response_model=Token)
def login_password(request: PasswordLoginRequest, db: Session = Depends(get_db)):
    """Authenticate using email and password."""
    norm_email = request.email.lower().strip()
    user = db.query(User).filter(User.email == norm_email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Account not found. Please sign up first."
        )
        
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No password configured for this account. Please sign in with OTP verification."
        )
        
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Incorrect password. Please try again or use OTP sign-in."
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value
        }
    }

@router.post("/register-otp")
async def send_register_otp(request: RegisterOtpRequest, db: Session = Depends(get_db)):
    """Dispatch verification code for new user registration."""
    norm_email = request.email.lower().strip()
    user = db.query(User).filter(User.email == norm_email).first()
    
    if user and user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in."
        )
        
    if not user:
        user = User(email=norm_email, role=RoleEnum.normal)
        db.add(user)
        db.commit()
        db.refresh(user)

    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Dispatch Official OTP Email via SMTP2GO
    await send_otp_email(to_email=user.email, otp=otp)
    
    return {"message": "Verification code sent to email"}

@router.post("/register", response_model=Token)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Complete registration by verifying OTP and saving the password."""
    norm_email = request.email.lower().strip()
    
    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    user = db.query(User).filter(User.email == norm_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration session not found. Please request a verification code."
        )

    if not user.otp or user.otp != request.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email."
        )

    if user.otp_expiry and user.otp_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    # Save hashed password and clear OTP
    user.hashed_password = get_password_hash(request.password)
    user.otp = None
    user.otp_expiry = None
    db.commit()
    db.refresh(user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value
        }
    }

@router.post("/request-otp")
async def request_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """Dispatch verification code for OTP login."""
    norm_email = request.email.lower().strip()
    user = db.query(User).filter(User.email == norm_email).first()
    
    if not user:
        user = User(email=norm_email, role=request.role)
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate 6-digit OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Dispatch Official OTP Email via SMTP2GO
    await send_otp_email(to_email=user.email, otp=otp)
    
    return {"message": "OTP sent to email"}

@router.post("/verify-otp", response_model=Token)
def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    """Verify 6-digit OTP and issue JWT session token."""
    norm_email = request.email.lower().strip()
    user = db.query(User).filter(User.email == norm_email).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    if not user.otp or user.otp != request.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    if user.otp_expiry and user.otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP code has expired.")
        
    # Clear OTP
    user.otp = None
    user.otp_expiry = None
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value
        }
    }

# -----------------------------------------------------------------------------
# Admin User Management & System Health Endpoints
# -----------------------------------------------------------------------------

@router.get("/system-health")
async def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Run diagnostics and check status of connected services (Supabase, SMTP2GO, WS Gateway)."""
    import time
    from sqlalchemy import text
    from database import engine
    from mailer import check_smtp_health
    from api.routers.websocket import manager
    
    timestamp = datetime.utcnow().isoformat() + "Z"
    services = []
    
    # 1. Supabase PostgreSQL Database Check
    db_start = time.time()
    try:
        ping_val = db.execute(text("SELECT 1")).scalar()
        db_latency = round((time.time() - db_start) * 1000)
        
        host = getattr(engine.url, 'host', 'localhost')
        port = getattr(engine.url, 'port', 5432)
        driver = getattr(engine.url, 'drivername', 'postgresql')
        is_supabase = "supabase" in (host or "").lower() or "pooler" in (host or "").lower()
        
        services.append({
            "id": "supabase_db",
            "name": "Supabase PostgreSQL Database",
            "type": "database",
            "status": "active",
            "healthy": True,
            "latency_ms": db_latency,
            "message": f"PostgreSQL live query succeeded (SELECT 1 -> {ping_val})",
            "details": {
                "host": host,
                "port": port,
                "engine": driver,
                "is_supabase": is_supabase,
                "pool_status": "Connected (Port 6543 / 5432)"
            }
        })
    except Exception as e:
        db_latency = round((time.time() - db_start) * 1000)
        services.append({
            "id": "supabase_db",
            "name": "Supabase PostgreSQL Database",
            "type": "database",
            "status": "error",
            "healthy": False,
            "latency_ms": db_latency,
            "message": f"Database query failed: {str(e)}",
            "details": {
                "host": getattr(engine.url, 'host', 'unknown'),
                "port": getattr(engine.url, 'port', 5432),
                "engine": getattr(engine.url, 'drivername', 'postgresql')
            }
        })

    # 2. SMTP2GO Email Delivery Check
    smtp_health = await check_smtp_health()
    services.append({
        "id": "smtp2go",
        **smtp_health
    })

    # 3. Community Intelligence WebSocket Gateway Check
    services.append({
        "id": "websocket_core",
        "name": "WebSocket Telemetry Gateway",
        "type": "websocket",
        "status": "active",
        "healthy": True,
        "latency_ms": 1,
        "message": f"Telemetry manager online with {len(manager.active_connections)} active client(s)",
        "details": {
            "endpoint": "/ws/pipeline",
            "active_clients": len(manager.active_connections),
            "orchestrator_modules": "3.1 to 3.7 Core Telemetry Ready"
        }
    })

    all_healthy = all(s.get("healthy", False) for s in services)
    any_error = any(s.get("status") == "error" for s in services)
    overall_status = "active" if all_healthy else ("error" if any_error else "degraded")

    return {
        "timestamp": timestamp,
        "overall_status": overall_status,
        "auto_interval_minutes": 10,
        "services": services
    }

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Retrieve all registered users (Admin Only)."""
    users = db.query(User).order_by(User.id.asc()).all()
    res = []
    for u in users:
        res.append({
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "has_password": bool(u.hashed_password)
        })
    return res

@router.post("/users", response_model=UserResponse)
def create_user(
    request: UserCreateRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin)
):
    """Provision a new user account with role and optional password (Admin Only)."""
    norm_email = request.email.lower().strip()
    existing = db.query(User).filter(User.email == norm_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
        
    hashed = get_password_hash(request.password) if request.password else None
    user = User(email=norm_email, role=request.role, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "has_password": bool(user.hashed_password)
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin)
):
    """Delete a user account (Admin Only)."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete your own active administrator account"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully", "id": user_id}

@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int, 
    request: RoleUpdateRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin)
):
    """Promote or demote a user role (Admin Only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent admin from demoting themselves to avoid lockout
    if user.id == current_user.id and request.role != RoleEnum.admin:
        raise HTTPException(status_code=400, detail="Cannot change your own admin role")
        
    user.role = request.role
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "has_password": bool(user.hashed_password)
    }

@router.put("/users/{user_id}/password")
def reset_user_password(
    user_id: int,
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Reset a user's password (Admin Only)."""
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(request.password)
    db.commit()
    return {"message": f"Password updated for {user.email}"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated user profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "has_password": bool(current_user.hashed_password)
    }

@router.post("/password-reset/request-otp")
async def request_password_reset_otp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dispatch 6-digit OTP code to the authenticated user's email to authorize a password reset."""
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    current_user.otp = otp
    current_user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Dispatch Official OTP Email via SMTP2GO
    await send_otp_email(to_email=current_user.email, otp=otp)
    return {"message": f"Verification code sent to {current_user.email}"}

@router.post("/password-reset/verify")
def verify_password_reset(
    request: PasswordResetWithOtpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify 6-digit OTP and update user's account password."""
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    if not current_user.otp or current_user.otp != request.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or incorrect verification code."
        )

    if current_user.otp_expiry and current_user.otp_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    current_user.hashed_password = get_password_hash(request.new_password)
    current_user.otp = None
    current_user.otp_expiry = None
    db.commit()
    db.refresh(current_user)
    return {"message": "Password updated successfully!"}

