from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from database import Base
from datetime import datetime
import time

class ModelPreference(Base):
    __tablename__ = "model_preferences"

    id = Column(Integer, primary_key=True, index=True)
    feedback_id = Column(String, unique=True, index=True, nullable=False)
    chat_id = Column(String, index=True, nullable=False)
    message_id = Column(String, index=True, nullable=False)
    user_email = Column(String, index=True, nullable=False)
    query = Column(Text, nullable=False)
    feedback_type = Column(String, default="preference", nullable=False)
    preferred_model = Column(String, nullable=True) # "ci_pipeline", "competitor", "tie"
    competitor_model = Column(String, default="OpenAI (GPT-4o-mini)", nullable=False)
    competitor_response = Column(Text, nullable=True)
    ci_response = Column(Text, nullable=True)
    competitor_latency_ms = Column(Integer, default=0)
    ci_latency_ms = Column(Integer, default=0)
    is_locked = Column(Boolean, default=True, nullable=False)
    comment = Column(String, nullable=True)
    cluster_id = Column(String, nullable=True)
    timestamp = Column(Integer, default=lambda: int(time.time()), nullable=False)
    time_str = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "feedback_id": self.feedback_id,
            "chat_id": self.chat_id,
            "message_id": self.message_id,
            "user_email": self.user_email,
            "query": self.query,
            "feedback_type": self.feedback_type,
            "preferred_model": self.preferred_model,
            "competitor_model": self.competitor_model,
            "competitor_response": self.competitor_response or "",
            "ci_response": self.ci_response or "",
            "competitor_latency_ms": self.competitor_latency_ms or 0,
            "ci_latency_ms": self.ci_latency_ms or 0,
            "is_locked": self.is_locked,
            "comment": self.comment or "",
            "cluster_id": self.cluster_id or "",
            "timestamp": self.timestamp,
            "time_str": self.time_str or self.created_at.strftime("%Y-%m-%d %H:%M UTC") if self.created_at else ""
        }
