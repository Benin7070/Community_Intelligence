from sqlalchemy import Column, Integer, String, DateTime, Enum
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
    
    created_at = Column(DateTime, default=datetime.utcnow)
