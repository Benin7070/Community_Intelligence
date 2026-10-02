from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, index=True) # e.g. "chat_12345678"
    user_email = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False) # e.g. "New Chat" or first 5 words of query
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to messages
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True) # e.g. "msg_12345678"
    chat_id = Column(String, ForeignKey("chats.id"), index=True, nullable=False)
    role = Column(String, nullable=False) # "user" or "assistant"
    
    # Store pointers to R2 where the large text is stored to save Postgres space
    r2_url = Column(String, nullable=True) 
    
    # Small metadata can still be kept in DB for fast frontend rendering without hitting R2
    preview_text = Column(String, nullable=True) # First 100 chars
    
    # Additional optional metadata
    competitor_model = Column(String, nullable=True)
    is_locked = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    chat = relationship("Chat", back_populates="messages")
