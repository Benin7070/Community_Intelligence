from pydantic import BaseModel, EmailStr
from typing import Optional, List
from models.user import RoleEnum

class CheckEmailRequest(BaseModel):
    email: EmailStr

class CheckEmailResponse(BaseModel):
    exists: bool
    email: str
    has_password: bool
    role: Optional[str] = None

class PasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterOtpRequest(BaseModel):
    email: EmailStr

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    otp: str

class OTPRequest(BaseModel):
    email: EmailStr
    role: RoleEnum = RoleEnum.normal

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: RoleEnum
    has_password: Optional[bool] = False
    is_suspended: Optional[int] = 0
    bypass_maintenance: Optional[int] = 0
    
    class Config:
        from_attributes = True

class UserCreateRequest(BaseModel):
    email: EmailStr
    role: RoleEnum = RoleEnum.normal
    password: Optional[str] = None

class RoleUpdateRequest(BaseModel):
    role: RoleEnum

class UserSuspendRequest(BaseModel):
    is_suspended: int

class UserBypassMaintenanceRequest(BaseModel):
    bypass_maintenance: int

class PasswordResetRequest(BaseModel):
    password: str

class PasswordResetWithOtpRequest(BaseModel):
    otp: str
    new_password: str

class SiteSettingsResponse(BaseModel):
    maintenance_mode: int
    maintenance_message: str
    email_alerts_enabled: int
    pipeline_mode: str
    competitor_model: str
    
    class Config:
        from_attributes = True

class SiteSettingsUpdateRequest(BaseModel):
    maintenance_mode: int
    maintenance_message: str
    email_alerts_enabled: int
    pipeline_mode: str
    competitor_model: str

