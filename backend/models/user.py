from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean
import enum
from database import Base
from datetime import datetime

class RoleEnum(str, enum.Enum):
    normal = "normal"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.normal, nullable=False)
    
    # Password authentication
    hashed_password = Column(String, nullable=True)

    # OTP fields
    otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    
    is_suspended = Column(Boolean, default=False, nullable=False)
    bypass_maintenance = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class SiteSettings(Base):
    __tablename__ = "site_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    maintenance_mode = Column(Boolean, default=False, nullable=False)
    maintenance_message = Column(String, default="The site is temporarily closed for maintenance. Please check back later.")
    email_alerts_enabled = Column(Boolean, default=True, nullable=False)
    pipeline_mode = Column(String, default="real", nullable=False)
    competitor_model = Column(String, default="gpt-4o", nullable=False)
