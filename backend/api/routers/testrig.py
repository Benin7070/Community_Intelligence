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

@router.post("/classify", response_model=ClassifyResponse)
async def classify_query(request: ClassifyRequest):
    """Classify a query as CI_SYSTEM or NORMAL_LLM using the trained Naive Bayes model, falling back to LLM if uncertain."""
    try:
        from pipeline.classifier import classifier
        from llm.provider import LLMProvider
        
        result = classifier.classify(request.query)
        
        # HYBRID APPROACH: If confidence is low, ask the LLM for a second opinion
        if result["confidence"] < 0.85:
            provider = LLMProvider()
            prompt = (
                f"You are a router. Given this user query: '{request.query}'\n"
                f"Does it require a specialized Community Intelligence system (local reports, "
                f"infrastructure, opinions, surveys) or is it a general LLM request "
                f"(math, coding, creative, general knowledge)?\n"
                f"Reply ONLY with 'CI_SYSTEM' or 'NORMAL_LLM'."
            )
            
            llm_decision = await provider.generate_completion(prompt)
            if llm_decision:
                llm_decision = llm_decision.strip().upper()
                if llm_decision in ["CI_SYSTEM", "NORMAL_LLM"]:
                    result["destination"] = llm_decision
                    result["prediction_raw"] = f"LLM Override: {llm_decision}"
                    # Boost confidence since we used a smart model
                    result["confidence"] = 0.95
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
