from llm.provider import LLMProvider
import json

async def execute_claim_modeling_node(acquired_data: dict) -> dict:
    """Execute the Claim & Context Modeling logic using an LLM for the Test Rig."""
    provider = LLMProvider()
    claims = []
    
    # 1. Parse and gather minimal raw text (to reduce token usage & hallucination)
    posts_to_process = []
    
    for source_name, source_data in acquired_data.items():
        if source_data.get("status") == "success":
            items = source_data.get("data", {}).get("items", [])
            for item in items:
                title = item.get("title", "")
                body = item.get("body", "") or item.get("body_html", "")
                url = item.get("url") or item.get("link", "unknown")
                score = item.get("score") or item.get("upvoteCount") or 0
                
                # Extract the REAL unique ID so M4 can cross-reference it
                real_id = str(item.get("id") or item.get("question_id") or item.get("objectID", ""))
                
                if real_id and len(title.strip()) > 5:
                    posts_to_process.append({
                        "id": real_id,
                        "source": source_name, 
                        "url": url, 
                        "score": score, 
                        "title": title,
                        "body_snippet": body[:600] # Strictly limit snippet length to save tokens
                    })

    # 2. Use LLM to extract structured claims for ALL posts in a single batch
    # No filtering is done here (unlike before), we extract all claims.
    if not posts_to_process:
        return {"_meta": {"note": "No posts to process"}, "claims": []}

    prompt = (
        "You are an AI data extractor. Read the following JSON list of forum posts. "
        "Extract the technical claims from these posts. A post might have multiple claims, or none. "
        "Return ONLY a valid JSON array matching exactly this schema:\n"
        '[\n'
        '  {"post_id": "1", "core_claim": "The main technical statement or bug", "frameworks": ["react"], "versions": ["19"], "sentiment": "negative/neutral/positive"}\n'
        ']\n\n'
        "Posts Data:\n" + json.dumps([{"id": p["id"], "title": p["title"], "body": p["body_snippet"]} for p in posts_to_process])
    )
    
    try:
        llm_resp = await provider.generate_completion(prompt)
        # Clean up potential markdown code blocks
        clean_json = llm_resp.replace('```json', '').replace('```', '').strip()
        extracted_claims = json.loads(clean_json)
        
        # Merge back metadata
        for c in extracted_claims:
            orig_post = next((p for p in posts_to_process if p["id"] == str(c.get("post_id"))), None)
            if orig_post:
                c["source"] = orig_post["source"]
                c["url"] = orig_post["url"]
                c["relevance_score"] = orig_post["score"]
            claims.append(c)
    except Exception as e:
        claims.append({
            "core_claim": "Error parsing LLM batch response",
            "error": str(e),
            "raw_response": llm_resp if 'llm_resp' in locals() else "None"
        })
            
    return {
        "_meta": {
            "processed_posts_count": len(posts_to_process),
            "total_claims_extracted": len(claims),
            "note": "LLM processed all posts in batch to extract claims without arbitrary top-N filtering."
        },
        "claims": claims
    }
