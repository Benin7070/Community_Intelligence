import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from dotenv import load_dotenv

# Load .env from cwd or backend directory
load_dotenv(".env", override=True)
load_dotenv("backend/.env", override=True)

class Settings(BaseSettings):
    APP_NAME: str = "Community Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    
    # LLM Providers
    DEFAULT_LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    
    # External APIs
    STACK_EXCHANGE_API_KEY: str = ""
    GITHUB_TOKEN: str = ""

    # CORS Settings
    FRONTEND_URL: str = ""
    ALLOWED_ORIGINS: str = ""
    
    # Security Protocol
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database
    SUPABASE_DB_URL: str = ""

    # Email / SMTP2GO Configuration
    SMTP_HOST: str = "mail.smtp2go.com"
    SMTP_PORT: int = 2525
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Community Intelligence Platform"
    SMTP2GO_API_KEY: str = ""
    SMTP_BASE_URL: str = "https://api.smtp2go.com/v3"

    @field_validator("PORT", mode="before")
    def validate_port(cls, v):
        if not v or (isinstance(v, str) and not v.strip().isdigit()):
            return 8000
        return int(v)

    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES", mode="before")
    def validate_access_token_expiry(cls, v):
        if not v or (isinstance(v, str) and not v.strip().isdigit()):
            return 60 * 24 * 7
        return int(v)

    @field_validator("DEFAULT_LLM_PROVIDER", mode="before")
    def validate_llm_provider(cls, v):
        if not v or not str(v).strip():
            return "openai"
        return str(v).strip()

    @field_validator("SECRET_KEY", mode="before")
    def validate_secret_key(cls, v):
        if not v or not str(v).strip():
            return "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
        return str(v).strip()

    @field_validator("SMTP_PORT", mode="before")
    def validate_smtp_port(cls, v):
        if not v or (isinstance(v, str) and not v.strip().isdigit()):
            return 2525
        return int(v)

    @field_validator("SMTP_HOST", mode="before")
    def validate_smtp_host(cls, v):
        if not v or not str(v).strip():
            return "mail.smtp2go.com"
        return str(v).strip()

    @field_validator("SMTP_FROM_NAME", mode="before")
    def validate_smtp_from_name(cls, v):
        if not v or not str(v).strip():
            return "Community Intelligence Platform"
        return str(v).strip()

    @field_validator("SMTP_FROM_EMAIL", mode="before")
    def validate_smtp_from_email(cls, v):
        if not v or not str(v).strip():
            return ""
        return str(v).strip()

    @field_validator("SMTP_BASE_URL", mode="before")
    def validate_smtp_base_url(cls, v):
        if not v or not str(v).strip():
            return "https://api.smtp2go.com/v3"
        return str(v).strip().rstrip("/")

    @field_validator("SUPABASE_DB_URL", mode="before")
    def validate_supabase_db_url(cls, v):
        if not v:
            return ""
        return str(v).strip().strip("'\"").strip()

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
