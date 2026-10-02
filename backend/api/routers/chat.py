from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.chat import Chat, ChatMessage
from api.deps import get_current_user
from storage.r2 import get_text_from_r2
from fastapi.responses import Response

router = APIRouter()

@router.get("/chats")
def get_user_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the list of chat sessions for the current user.
    Only fetches metadata to keep it lightning fast for the sidebar.
    """
    chats = db.query(Chat).filter(Chat.user_email == current_user.email).order_by(Chat.updated_at.desc()).all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat(),
            "created_at": c.created_at.isoformat()
        }
        for c in chats
    ]

@router.get("/chats/{chat_id}/messages")
def get_chat_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the messages for a specific chat.
    For the assistant messages, it provides a presigned R2 URL where the frontend
    can download the massive JSON payload on the fly (sliding window).
    """
    # Verify ownership
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_email == current_user.email).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    messages = db.query(ChatMessage).filter(ChatMessage.chat_id == chat_id).order_by(ChatMessage.created_at.asc()).all()
    
    from models.preference import ModelPreference
    
    # Pre-fetch preferences to enrich the assistant messages
    preferences = db.query(ModelPreference).filter(ModelPreference.chat_id == chat_id).all()
    pref_map = {p.message_id: p for p in preferences}
    
    result = []
    for m in messages:
        base_msg_id = m.id.replace("_u", "").replace("_a", "")
        pref = pref_map.get(base_msg_id)
        
        msg_dict = {
            "id": m.id,
            "role": m.role,
            "preview_text": m.preview_text,
            "created_at": m.created_at.isoformat(),
            "competitor_model": m.competitor_model,
            "is_locked": pref.is_locked if pref else False,
            "voted_preference": pref.preferred_model if pref else None,
            "r2_url": f"/api/v1/chats/{chat_id}/messages/{m.id}/payload" if m.r2_url else None
        }
        result.append(msg_dict)
        
    return result

@router.get("/chats/{chat_id}/messages/{message_id}/payload")
def get_message_payload(
    chat_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bypasses Cloudflare R2 CORS by fetching the JSON payload server-side and returning it.
    """
    # Verify ownership
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_email == current_user.email).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id, ChatMessage.chat_id == chat_id).first()
    if not msg:
        # Fallback if the client passes the base message_id (e.g. from ModelPreference) instead of the assistant specific _a ID
        msg = db.query(ChatMessage).filter(ChatMessage.id == f"{message_id}_a", ChatMessage.chat_id == chat_id).first()
        
    if not msg or not msg.r2_url:
        raise HTTPException(status_code=404, detail=f"Payload not found for message_id: {message_id}")
        
    text_content = get_text_from_r2(msg.r2_url)
    if not text_content:
        raise HTTPException(status_code=404, detail="Failed to fetch payload from R2")
        
    # It's JSON, return directly
    return Response(content=text_content, media_type="application/json")
