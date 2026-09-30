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
    
    class Config:
        from_attributes = True

class UserCreateRequest(BaseModel):
    email: EmailStr
    role: RoleEnum = RoleEnum.normal
    password: Optional[str] = None

class RoleUpdateRequest(BaseModel):
    role: RoleEnum

class PasswordResetRequest(BaseModel):
    password: str

class PasswordResetWithOtpRequest(BaseModel):
    otp: str
    new_password: str

