import uuid
import time
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.preference import ModelPreference
from schemas.pipeline import (
    QueryRequest,
    QueryResponse,
    FeedbackRequest,
    FeedbackResponse
)
from pipeline.orchestrator import PipelineOrchestrator
from llm.synthesis import SynthesisEngine
from api.websocket import manager
from api.deps import get_current_user, get_current_admin
from models.user import User
from datetime import datetime

router = APIRouter()
orchestrator = PipelineOrchestrator()
synthesis_engine = SynthesisEngine()


async def process_pipeline_event(event_data: dict):
    # Broadcast event to all connected WebSocket clients
    await manager.broadcast(event_data)

# Hook the orchestrator to the websocket manager
orchestrator.set_event_callback(process_pipeline_event)

@router.post("/query", response_model=QueryResponse)
async def run_query(request: QueryRequest, current_user: User = Depends(get_current_user)):
    try:
        chat_id = request.chat_id or f"chat_{uuid.uuid4().hex[:8]}"
        message_id = request.message_id or f"msg_{uuid.uuid4().hex[:8]}"
        competitor_model = request.competitor_model or "OpenAI (GPT-4o-mini)"

        # Step 1: Execute Layer 2 (Routing), Layer 3 (CI Core 3.1-3.7), and Layer 4 (Provenance Graph)
        ci_start = time.time()
        pipeline_result = await orchestrator.run(request.query)
        
        # Step 2: Layer 5 - Evidence-Grounded LLM Synthesis
        await manager.broadcast({
            "module": "5.0 LLM Synthesis & Response",
            "status": "started",
            "details": {
                "task": "Generating Evidence-Grounded Synthesis",
                "clusters": len(pipeline_result["clusters"])
            }
        })
        
        final_response = await synthesis_engine.synthesize(
            query=request.query,
            routing=pipeline_result["routing"],
            clusters=pipeline_result["clusters"],
            provenance_graph=pipeline_result["provenance_graph"],
            conflict_summary=pipeline_result["conflict_summary"],
            sources_summary=pipeline_result["sources_summary"],
            competitor_model=competitor_model,
            chat_id=chat_id,
            message_id=message_id
        )
        ci_latency_ms = round((time.time() - ci_start) * 1000)
        final_response.ci_latency_ms = ci_latency_ms
        final_response.chat_id = chat_id
        final_response.message_id = message_id
        final_response.competitor_model = competitor_model
        
        await manager.broadcast({
            "module": "5.0 LLM Synthesis & Response",
            "status": "completed",
            "details": {
                "headline": final_response.headline_answer[:80] + "...",
                "confidence": final_response.confidence_explanation
            }
        })
        
        # Step 3: Complete execution
        await manager.broadcast({
            "module": "System",
            "status": "completed",
            "details": {
                "message": "Full 6-Layer Community Intelligence Pipeline Completed",
                "query": request.query
            }
        })
        
        return final_response
    except Exception as e:
        await manager.broadcast({
            "module": "System",
            "status": "error",
            "details": {"error": str(e)}
        })
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Layer 6: Human / Community Feedback & RLHF Model Preference Loop (Persisted in Supabase PostgreSQL)"""
    fb_id = f"fb_{uuid.uuid4().hex[:8]}"
    chat_id = feedback.chat_id or f"chat_{uuid.uuid4().hex[:8]}"
    message_id = feedback.message_id or f"msg_{uuid.uuid4().hex[:8]}"

    # Check if a record with this message_id already exists (update vs insert)
    existing_record = db.query(ModelPreference).filter(ModelPreference.message_id == message_id).first()
    if existing_record:
        existing_record.preferred_model = feedback.preferred_model
        existing_record.is_locked = feedback.is_locked
        if feedback.comment:
            existing_record.comment = feedback.comment
        if feedback.competitor_model:
            existing_record.competitor_model = feedback.competitor_model
        if feedback.competitor_response:
            existing_record.competitor_response = feedback.competitor_response
        if feedback.ci_response:
            existing_record.ci_response = feedback.ci_response
        if feedback.competitor_latency_ms:
            existing_record.competitor_latency_ms = feedback.competitor_latency_ms
        if feedback.ci_latency_ms:
            existing_record.ci_latency_ms = feedback.ci_latency_ms
        db.commit()
        db.refresh(existing_record)
        fb_id = existing_record.feedback_id
    else:
        new_record = ModelPreference(
            feedback_id=fb_id,
            chat_id=chat_id,
            message_id=message_id,
            user_email=current_user.email,
            query=feedback.query,
            feedback_type=feedback.feedback_type,
            preferred_model=feedback.preferred_model,
            competitor_model=feedback.competitor_model or "OpenAI (GPT-4o-mini)",
            competitor_response=feedback.competitor_response or "",
            ci_response=feedback.ci_response or "",
            competitor_latency_ms=feedback.competitor_latency_ms or 0,
            ci_latency_ms=feedback.ci_latency_ms or 0,
            is_locked=feedback.is_locked,
            comment=feedback.comment,
            cluster_id=feedback.cluster_id,
            timestamp=int(time.time()),
            time_str=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)

    total_count = db.query(ModelPreference).count()
    
    # Broadcast to telemetry clients
    await manager.broadcast({
        "module": "6.0 Human / Community Feedback Loop",
        "status": "recorded",
        "details": {
            "feedback_id": fb_id,
            "chat_id": chat_id,
            "message_id": message_id,
            "type": feedback.feedback_type,
            "preferred_model": feedback.preferred_model or "N/A",
            "is_locked": feedback.is_locked,
            "total_feedback_count": total_count,
            "improvement_signal": "RLHF model preference locked and persisted to Supabase database"
        }
    })
    
    return FeedbackResponse(
        status="recorded",
        message="Preference choice locked and persisted in Supabase database.",
        feedback_id=fb_id,
        chat_id=chat_id,
        message_id=message_id,
        preferred_model=feedback.preferred_model,
        is_locked=feedback.is_locked
    )

@router.get("/feedback/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieve all user model preferences and follow-up chains from Supabase PostgreSQL (Admin Only)."""
    db_prefs = db.query(ModelPreference).order_by(ModelPreference.id.desc()).all()
    
    # If table is fresh and has no records yet, seed the two demo records into the real database
    if not db_prefs:
        demo1 = ModelPreference(
            feedback_id="fb_demo_01",
            chat_id="chat_8f2a1b9c",
            message_id="msg_001a",
            user_email="developer@example.com",
            query="React useEffect infinite re-render loop with object dependencies",
            feedback_type="preference",
            preferred_model="ci_pipeline",
            competitor_model="OpenAI (GPT-4o-mini)",
            competitor_response="To resolve infinite re-renders in useEffect, ensure you don't recreate objects inside the component render body without useMemo.",
            ci_response="Community consensus (89% across 4 sources) notes that primitive decomposition or useMemo is required, with specific caveats for React 18 StrictMode double-mounting.",
            competitor_latency_ms=780,
            ci_latency_ms=1120,
            is_locked=True,
            comment="Community intel provided the crucial React 18 StrictMode caveat that ChatGPT missed.",
            timestamp=int(time.time()) - 1800,
            time_str=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        )
        demo2 = ModelPreference(
            feedback_id="fb_demo_02",
            chat_id="chat_8f2a1b9c",
            message_id="msg_002b",
            user_email="developer@example.com",
            query="Follow-up: How do I handle this with custom hooks returning functions?",
            feedback_type="preference",
            preferred_model="ci_pipeline",
            competitor_model="OpenAI (GPT-4o-mini)",
            competitor_response="Wrap the returned functions in useCallback with proper dependencies before passing them to consumer components.",
            ci_response="Proven lineage from GitHub discussion threads shows returning stable ref wrappers avoids triggering downstream subscriber effect re-runs.",
            competitor_latency_ms=650,
            ci_latency_ms=980,
            is_locked=True,
            comment="Follow-up query confirmed stable ref pattern from real production issues.",
            timestamp=int(time.time()) - 900,
            time_str=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        )
        db.add(demo1)
        db.add(demo2)
        db.commit()
        db_prefs = [demo2, demo1]

    return [p.to_dict() for p in db_prefs]

@router.get("/feedback/stats")
async def get_feedback_stats(db: Session = Depends(get_db)):
    """Retrieve Layer 6 continuous improvement metrics from Supabase database"""
    all_prefs = db.query(ModelPreference).all()
    total = len(all_prefs)
    helpful = sum(1 for f in all_prefs if f.feedback_type == "helpful")
    incorrect = sum(1 for f in all_prefs if f.feedback_type == "incorrect")
    missing = sum(1 for f in all_prefs if f.feedback_type == "missing_evidence")
    prefs = sum(1 for f in all_prefs if f.feedback_type == "preference")
    
    return {
        "total_feedback": total,
        "preferences_recorded": prefs,
        "helpful": helpful,
        "incorrect": incorrect,
        "missing_evidence": missing,
        "calibration_factor": round((helpful + prefs + 1) / (total + 2), 3) if total > 0 else 0.5
    }

