from llm.provider import LLMProvider
from pipeline.classifier import classifier

async def execute_classifier_node(query: str) -> dict:
    """Execute the heuristic classifier logic for the Test Rig."""
    result = classifier.classify(query)
    
    # HYBRID APPROACH: If confidence is low, ask the LLM for a second opinion
    if result["confidence"] < 0.99:
        provider = LLMProvider()
        prompt = (
            f"You are a routing agent. Given this user query: '{query}'\n"
            f"Does it require a specialized Community Intelligence system (e.g., developer debates, tech stack opinions, infrastructure comparisons, local reports, bugs with specific frameworks, community consensus) or is it a standard request that an LLM can answer safely (e.g., math, generic code syntax, creative writing, basic facts)?\n"
            f"If it involves developer opinions, comparing tools/frameworks, or finding fixes for bugs, reply 'CI_SYSTEM'. Otherwise reply 'NORMAL_LLM'.\n"
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
