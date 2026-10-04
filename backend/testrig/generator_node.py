from typing import Dict, Any
from llm.provider import LLMProvider
import json

async def execute_generator_node(query: str, m4_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    M5: Response Generation Node.
    Takes the mathematical JSON from M4 and uses the LLM to generate a human-readable, 
    evidence-grounded response, strictly adhering to Abstain/Conflict statuses.
    """
    provider = LLMProvider()
    
    meta = m4_data.get("_meta", {})
    status = meta.get("status", "resolved")
    confidence = meta.get("top_confidence_percent", 0)
    ranked_solutions = m4_data.get("ranked_solutions", [])
    
    # Fast-fail for abstain
    if status == "abstain_insufficient_evidence":
        prompt = (
            f"You are the final response generator for a Community Intelligence system.\n"
            f"The user asked: '{query}'\n"
            f"CRITICAL INSTRUCTION: The mathematical reliability engine has flagged this query with 'abstain_insufficient_evidence'. "
            f"The top confidence score was only {confidence}%. "
            f"You MUST gracefully refuse to answer the question. Explain that while you searched GitHub and Stack Overflow, "
            f"the community evidence is too weak or low-reputation to provide a safe, verifiable answer. Do not guess the answer."
        )
    elif status == "contested_high_uncertainty":
        prompt = (
            f"You are the final response generator for a Community Intelligence system.\n"
            f"The user asked: '{query}'\n"
            f"CRITICAL INSTRUCTION: The community is fiercely divided. Status is 'contested_high_uncertainty' (Confidence: {confidence}%).\n"
            f"Here is the mathematical breakdown of the top solutions:\n"
            f"{json.dumps(ranked_solutions[:2], indent=2)}\n\n"
            f"Draft a response that provides the top solution, but explicitly warns the user that there is a strong competing claim. "
            f"Mention the mathematical reasons (e.g. upvotes, reputation) why they are contested."
        )
    else:
        prompt = (
            f"You are the final response generator for a Community Intelligence system.\n"
            f"The user asked: '{query}'\n"
            f"The mathematical reliability engine has declared a clear winner with {confidence}% confidence.\n"
            f"Here is the mathematical breakdown of the winning solution:\n"
            f"{json.dumps(ranked_solutions[0], indent=2)}\n\n"
            f"Draft a confident, helpful response providing this solution. Ground your response in the community evidence by briefly "
            f"mentioning *why* we trust it (e.g. 'Based on high reputation Stack Overflow users' or 'As confirmed by GitHub Maintainers')."
        )

    llm_response = await provider.generate_completion(prompt)
    
    return {
        "final_response": llm_response,
        "enforced_status": status,
        "confidence_percent": confidence
    }
