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
from models.user import User, SiteSettings
from models.chat import Chat, ChatMessage
from datetime import datetime
from storage.r2 import upload_text_to_r2, get_presigned_url
import json

router = APIRouter()
orchestrator = PipelineOrchestrator()
synthesis_engine = SynthesisEngine()


async def process_pipeline_event(event_data: dict):
    # Broadcast event to all connected WebSocket clients
    await manager.broadcast(event_data)

# Hook the orchestrator to the websocket manager
orchestrator.set_event_callback(process_pipeline_event)

@router.post("/query", response_model=QueryResponse)
async def run_query(
    request: QueryRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        settings = db.query(SiteSettings).first()
        if settings and settings.maintenance_mode:
            role_val = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
            is_bypassed = getattr(current_user, 'bypass_maintenance', 0) == 1
            if role_val != "admin" and not is_bypassed:
                raise HTTPException(status_code=503, detail=settings.maintenance_message)

        chat_id = request.chat_id or f"chat_{uuid.uuid4().hex[:8]}"
        message_id = request.message_id or f"msg_{uuid.uuid4().hex[:8]}"
        competitor_model = request.competitor_model or "OpenAI (GPT-4o-mini)"

        # 0. Ensure Chat exists and save User Message
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            chat = Chat(id=chat_id, user_email=current_user.email, title=request.query[:50] + "...")
            db.add(chat)
        
        user_msg = ChatMessage(
            id=message_id + "_u", 
            chat_id=chat_id, 
            role="user", 
            preview_text=request.query
        )
        db.add(user_msg)
        db.commit()

        pipeline_mode = settings.pipeline_mode if settings else "real"
        
        # --- DYNAMIC ROUTING FROM TEST RIG DEPLOYMENT ---
        if pipeline_mode == "real":
            import os
            import json
            RULES_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "config", "pipeline_rules.json")
            if os.path.exists(RULES_FILE):
                try:
                    with open(RULES_FILE, "r") as f:
                        rules_data = json.load(f)
                        rule = rules_data.get("routingRule")
                        if rule and rule.get("key") == "destination":
                            from testrig.classifier_node import execute_classifier_node
                            await manager.broadcast({"module": "0.0 Query Router", "status": "started", "details": {"task": "Classifying query intent"}})
                            classification = await execute_classifier_node(request.query)
                            dest = classification.get("destination")
                            
                            # Follow the visual rule set in Test Rig
                            if dest != rule.get("value"):
                                pipeline_mode = "standard"
                                await manager.broadcast({"module": "0.0 Query Router", "status": "completed", "details": {"note": f"Routed to Standard LLM (Intent: {dest})", "confidence": classification.get("confidence")}})
                            else:
                                await manager.broadcast({"module": "0.0 Query Router", "status": "completed", "details": {"note": f"Routed to CI Pipeline (Intent: {dest})", "confidence": classification.get("confidence")}})
                except Exception as e:
                    print(f"Routing rule error: {e}")
                    pass
        
        ci_start = time.time()
        
        if pipeline_mode == "real":
            # --- REAL COMMUNITY INTELLIGENCE PIPELINE ---
            from testrig.acquisition_node import execute_acquisition_node
            from testrig.claim_node import execute_claim_modeling_node
            from testrig.synthesis_node import execute_synthesis_node
            from testrig.reliability_node import execute_reliability_node
            from testrig.uncertainty_node import execute_uncertainty_node
            from testrig.beautifier_node import execute_beautifier_node
            
            # M1: Acquisition
            await manager.broadcast({"module": "1.0 Data Acquisition", "status": "started", "details": {"query": request.query}})
            m1_data = await execute_acquisition_node(request.query, ["Stack Overflow", "GitHub"])
            await manager.broadcast({"module": "1.0 Data Acquisition", "status": "completed", "details": {"note": "Fetched live data"}})
            
            # M2: Claim Extraction
            await manager.broadcast({"module": "2.0 Claim Extraction", "status": "started", "details": {"task": "Extracting technical claims"}})
            m2_data = await execute_claim_modeling_node(m1_data)
            await manager.broadcast({"module": "2.0 Claim Extraction", "status": "completed", "details": {"claims": len(m2_data.get("claims", []))}})
            
            # M3: Synthesis & Clustering
            await manager.broadcast({"module": "3.0 Synthesis & Clustering", "status": "started", "details": {"task": "Clustering semantic claims"}})
            m3_data = await execute_synthesis_node(m2_data)
            await manager.broadcast({"module": "3.0 Synthesis & Clustering", "status": "completed", "details": {"clusters": len(m3_data.get("clusters", []))}})
            
            # M4: Reliability (Math Engine)
            await manager.broadcast({"module": "4.0 Reliability & Math Engine", "status": "started", "details": {"task": "Calculating S_cred"}})
            m4_data = await execute_reliability_node(m3_data, m1_data)
            await manager.broadcast({"module": "4.0 Reliability & Math Engine", "status": "completed", "details": {"confidence": m4_data.get("_meta", {}).get("top_confidence_percent", 0)}})
            
            # M5: Uncertainty (Abstain Guard)
            await manager.broadcast({"module": "5.0 Uncertainty & Abstain Guard", "status": "started", "details": {"task": "Checking confidence threshold"}})
            m5_data = await execute_uncertainty_node(m4_data)
            await manager.broadcast({"module": "5.0 Uncertainty & Abstain Guard", "status": "completed", "details": {"action": m5_data.get("guard_action")}})
            
            # M6: Beautifier (Final Answer)
            await manager.broadcast({"module": "6.0 Beautifier & Generation", "status": "started", "details": {"task": "Writing NLP response"}})
            m6_data = await execute_beautifier_node(m5_data, m1_data, request.query)
            await manager.broadcast({"module": "6.0 Beautifier & Generation", "status": "completed", "details": {"headline": m6_data.get("headline_answer", "")[:80] + "..."}})
            
            headline_answer = m6_data.get("headline_answer", "")
            detailed_synthesis = m6_data.get("detailed_synthesis", "")
            confidence_explanation = m6_data.get("confidence_explanation", "")
            ci_token_usage = m6_data.get("ci_token_usage", 0)
            
            # Generate Competitor Baseline
            from llm.provider import LLMProvider
            provider = LLMProvider()
            try:
                competitor_prompt = f"Please provide a comprehensive technical answer to this query: {request.query}"
                chatgpt_response, competitor_tokens = await provider.generate_completion_with_usage(competitor_prompt, model_preference=competitor_model)
            except Exception as e:
                chatgpt_response = f"Competitor Baseline failed: {str(e)}"
                competitor_tokens = 0
                
        elif pipeline_mode == "mock":
            # --- MOCK COMMUNITY INTELLIGENCE PIPELINE ---
            pipeline_result = await orchestrator.run(request.query)
            
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
            headline_answer = final_response.headline_answer
            detailed_synthesis = final_response.detailed_synthesis
            confidence_explanation = final_response.confidence_explanation
            
            await manager.broadcast({
                "module": "5.0 LLM Synthesis & Response",
                "status": "completed",
                "details": {
                    "headline": headline_answer[:80] + "...",
                    "confidence": confidence_explanation
                }
            })
            
        else:
            # --- STANDARD LLM PIPELINE ---
            from llm.provider import LLMProvider
            provider = LLMProvider()
            await manager.broadcast({"module": "Standard LLM Generation", "status": "started", "details": {"task": "Generating generic response"}})
            
            prompt = f"You are a helpful assistant. Please answer the following query: {request.query}"
            raw_response = await provider.generate_completion(prompt, model_preference=competitor_model)
            
            headline_answer = "Generated via Standard LLM."
            detailed_synthesis = raw_response
            chatgpt_response = raw_response
            confidence_explanation = "Confidence: Unknown (Standard LLMs do not calibrate confidence)."
            
            await manager.broadcast({"module": "Standard LLM Generation", "status": "completed", "details": {"headline": "Standard LLM Response ready."}})

        ci_latency_ms = round((time.time() - ci_start) * 1000)
        
        if pipeline_mode == "mock":
            # final_response is already a QueryResponse from synthesis_engine
            final_response.ci_latency_ms = ci_latency_ms
            final_response.chat_id = chat_id
            final_response.message_id = message_id
            final_response.competitor_model = competitor_model
        else:
            from schemas.pipeline import QueryResponse, QueryRoutingInfo
            final_response = QueryResponse(
                query=request.query,
                headline_answer=headline_answer,
                detailed_synthesis=detailed_synthesis,
                chatgpt_response=chatgpt_response if 'chatgpt_response' in locals() else None,
                confidence_explanation=confidence_explanation,
                ci_latency_ms=ci_latency_ms,
                ci_token_usage=ci_token_usage if 'ci_token_usage' in locals() else 0,
                competitor_token_usage=competitor_tokens if 'competitor_tokens' in locals() else 0,
                competitor_model=competitor_model,
                chat_id=chat_id,
                message_id=message_id,
                routing=QueryRoutingInfo(
                    intent="general_rag",
                    domain="General"
                )
            )
        
        # Step 3: Complete execution
        await manager.broadcast({
            "module": "System",
            "status": "completed",
            "details": {
                "message": f"Pipeline Completed (Mode: {pipeline_mode})",
                "query": request.query
            }
        })
        
        # Save assistant compound message to R2 as JSON to prevent database bloat
        assistant_json = final_response.model_dump_json()
        r2_uri = upload_text_to_r2(assistant_json, prefix="chats/history")
        
        assistant_msg = ChatMessage(
            id=message_id + "_a",
            chat_id=chat_id,
            role="assistant",
            r2_url=r2_uri,
            preview_text=final_response.headline_answer[:100],
            competitor_model=competitor_model
        )
        db.add(assistant_msg)
        db.commit()
        
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
    
    # Removed demo seeding logic to prevent confusion with duplicate dummy records

    results = []
    for p in db_prefs:
        p_dict = p.to_dict()
        if p_dict.get('competitor_response', '').startswith('r2://'):
            p_dict['competitor_response'] = get_presigned_url(p_dict['competitor_response'])
        if p_dict.get('ci_response', '').startswith('r2://'):
            p_dict['ci_response'] = get_presigned_url(p_dict['ci_response'])
        results.append(p_dict)
        
    return results

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

