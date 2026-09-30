import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

import urllib.parse

def _normalize_db_url(url: str) -> str:
    if not url:
        return "sqlite:///./community_intel.db"
    
    # Scheme normalization to use psycopg2 driver
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # If it's a PostgreSQL URL, safely quote special characters in password
    if "postgresql" in url and "@" in url:
        try:
            scheme, rest = url.split("://", 1)
            creds, host_part = rest.rsplit("@", 1)
            if ":" in creds:
                user, pwd = creds.split(":", 1)
                clean_pwd = urllib.parse.unquote(pwd)
                encoded_pwd = urllib.parse.quote_plus(clean_pwd)
                url = f"{scheme}://{user}:{encoded_pwd}@{host_part}"
        except Exception:
            pass
            
    return url

# Define database URL
DB_URL = _normalize_db_url(settings.SUPABASE_DB_URL)

# Create engine
connect_args = {"check_same_thread": False} if "sqlite" in DB_URL else {}
engine = create_engine(DB_URL, connect_args=connect_args)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
