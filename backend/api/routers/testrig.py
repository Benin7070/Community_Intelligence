from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class ClassifyRequest(BaseModel):
    query: str

class ClassifyResponse(BaseModel):
    destination: str
    confidence: float
    probabilities: dict
    prediction_raw: str

class DeployRequest(BaseModel):
    routingRule: dict = None

import json
import os

RULES_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "config", "pipeline_rules.json")

@router.post("/deploy")
async def deploy_pipeline_rules(request: DeployRequest):
    """Save the decision node routing rule to production."""
    os.makedirs(os.path.dirname(RULES_FILE), exist_ok=True)
    with open(RULES_FILE, "w") as f:
        json.dump({"routingRule": request.routingRule}, f)
    return {"status": "success", "message": "Rules deployed"}

@router.post("/classify", response_model=ClassifyResponse)
async def classify_query(request: ClassifyRequest):
    """Classify a query as CI_SYSTEM or NORMAL_LLM using the trained Naive Bayes model, falling back to LLM if uncertain."""
    try:
        from testrig.classifier_node import execute_classifier_node
        return await execute_classifier_node(request.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

class AcquireRequest(BaseModel):
    query: str
    active_sources: list[str]

@router.get("/m1-sources")
async def get_m1_sources_endpoint():
    """Return the single source of truth for M1 sources."""
    from pipeline.sources import get_m1_sources
    return {
        "sources": get_m1_sources()
    }

@router.post("/acquire")
async def acquire_data(request: AcquireRequest):
    """Fetch raw data directly for the Test Rig without coupling to the production M1 module."""
    try:
        from testrig.acquisition_node import execute_acquisition_node
        results = await execute_acquisition_node(request.query, request.active_sources)
        return {
            "query": request.query,
            "acquired_data": results
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class ModelClaimsRequest(BaseModel):
    acquired_data: dict

@router.post("/model-claims")
async def model_claims(request: ModelClaimsRequest):
    """Run LLM-powered Claim Modeling for the Test Rig."""
    try:
        from testrig.claim_node import execute_claim_modeling_node
        results = await execute_claim_modeling_node(request.acquired_data)
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class SynthesisRequest(BaseModel):
    claims_data: dict

@router.post("/synthesize")
async def synthesize_claims(request: SynthesisRequest):
    """Run LLM-powered Claim Synthesis and Clustering (M3)."""
    try:
        from testrig.synthesis_node import execute_synthesis_node
        results = await execute_synthesis_node(request.claims_data)
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class ReliabilityRequest(BaseModel):
    clusters_data: dict
    acquired_data: dict

@router.post("/reliability")
async def calculate_reliability(request: ReliabilityRequest):
    """Run Deterministic Math for Reliability & Signals (M4)."""
    try:
        from testrig.reliability_node import execute_reliability_node
        results = await execute_reliability_node(request.clusters_data, request.acquired_data)
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class UncertaintyRequest(BaseModel):
    m4_data: dict

@router.post("/uncertainty")
async def calculate_uncertainty(request: UncertaintyRequest):
    """Run M5 Uncertainty & Abstention Guard."""
    try:
        from testrig.uncertainty_node import execute_uncertainty_node
        results = await execute_uncertainty_node(request.m4_data)
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
