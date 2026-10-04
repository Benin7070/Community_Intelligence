from llm.provider import LLMProvider
import json
from schemas.pipeline import QueryResponse

async def execute_beautifier_node(m5_data: dict, m1_data: dict, query: str) -> dict:
    """
    M6: Beautifier Node / Final Answer Generator.
    Takes the resolved claims, matches them to raw sources, and generates a natural language response.
    """
    provider = LLMProvider()
    
    status = m5_data.get("guard_action", "PROCEED")
    reason = m5_data.get("calibration_reason", "")
    ranked_solutions = m5_data.get("ranked_solutions_passthrough", [])
    
    warning_injection = ""
    if status == "HALT_PIPELINE":
        warning_injection = f"\n\nCRITICAL INSTRUCTION: Your detailed_synthesis MUST begin with this exact bolded warning: '**Caution - Abstain Guard Triggered:** {reason} The evidence below is weak or unverified.' Then proceed to summarize what little data was found."
    elif status == "PROCEED_WITH_WARNING":
        warning_injection = f"\n\nCRITICAL INSTRUCTION: Your detailed_synthesis MUST begin with a warning about conflicting community data: '**Community Conflict Warning:** {reason}'"
        
    # Gather the sources for the citations
    lookup_table = {}
    for platform, platform_data in m1_data.items():
        if isinstance(platform_data, dict):
            if "data" in platform_data and "items" in platform_data["data"]:
                for hit in platform_data["data"]["items"]:
                    post_id = str(hit.get("id") or hit.get("question_id") or hit.get("objectID", ""))
                    if post_id:
                        hit["_platform"] = platform
                        lookup_table[post_id] = hit
            elif "queries_run" in platform_data:
                for query_run in platform_data["queries_run"]:
                    for hit in query_run.get("hits", []):
                        post_id = str(hit.get("id") or hit.get("question_id") or hit.get("objectID", ""))
                        if post_id:
                            hit["_platform"] = platform
                            lookup_table[post_id] = hit

    context_str = ""
    for idx, sol in enumerate(ranked_solutions):
        context_str += f"\nSolution {idx+1} (Weight: {sol.get('collective_weight_W', 0)}):\n"
        context_str += f"Argument: {sol.get('distinct_argument')}\n"
        context_str += "Supporting Sources:\n"
        
        for cid in sol.get("supporting_claim_ids", []):
            hit = lookup_table.get(str(cid))
            if hit:
                title = hit.get("title", "")
                url = hit.get("url") or hit.get("link", f"ID:{cid}")
                score = hit.get("score", 0)
                platform = hit.get("_platform", "Unknown")
                context_str += f" - [{platform}] {title} (Score: {score}) -> {url}\n"
                
    prompt = f"""You are a principal engineer writing a comprehensive, beautifully structured technical synthesis.
Based STRICTLY and ONLY on the community consensus data below, provide a detailed final answer to the user's query.

CRITICAL GROUNDING RULES:
1. DO NOT use your internal training data to hallucinate generic "pros and cons" or facts. Every single claim, argument, or insight you write MUST be directly extracted from the Community Data provided below. 
2. If the community data only discusses one specific bug or one specific edge-case, focus your entire synthesis on that specific insight. Do not invent filler content.
3. You MUST use inline markdown links to cite the sources immediately after making a claim derived from them (e.g., [StackOverflow](url)).

CRITICAL FORMATTING RULES:
1. Use rich Markdown formatting (H3/H4 headings, bolding, bullet points). 
2. Structure the answer logically around the specific arguments provided in the data. Use headings like "Community Consensus", "Key Technical Arguments", or "Reported Edge Cases".
3. Explicitly explain *WHY* the community favors certain approaches based on the arguments provided.

User Query: {query}

Community Data (Ranked by Math Weight):
{context_str}
{warning_injection}

Return a valid JSON object matching exactly this schema:
{{
  "headline_answer": "A 1-2 sentence direct and definitive answer.",
  "detailed_synthesis": "The beautifully formatted, multi-section markdown response explaining the 'why', complete with inline citations.",
  "confidence_explanation": "A short sentence explaining why you are confident based on the weights."
}}
"""
    try:
        resp, tokens = await provider.generate_completion_with_usage(prompt)
        clean_json = resp.replace('```json', '').replace('```', '').strip()
        data = json.loads(clean_json)
        data["ci_token_usage"] = tokens
        return data
    except Exception as e:
        return {
            "headline_answer": "Error generating final response.",
            "detailed_synthesis": f"An error occurred while beautifying the output: {str(e)}",
            "confidence_explanation": "Error"
        }
