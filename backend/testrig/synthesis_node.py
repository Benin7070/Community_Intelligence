import os
import json
from openai import OpenAI
from typing import List, Dict, Any

# Ensure OpenAI API key is set
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

async def execute_synthesis_node(claims_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes the JSON output from M2 (Claim Modeling), containing an array of claims.
    Uses an LLM to cluster (deduplicate) semantically identical claims into distinct arguments/solutions.
    """
    
    claims = claims_data.get("claims", [])
    if not claims:
        return {"error": "No claims provided to synthesize.", "clusters": []}

    # Prepare a highly compressed list of claims to send to the LLM to save tokens
    compressed_claims = []
    for claim in claims:
        compressed_claims.append({
            "claim_id": claim.get("post_id"),  # Using post_id as the unique identifier for the claim
            "core_claim": claim.get("core_claim"),
            "frameworks": claim.get("frameworks", []),
            "sentiment": claim.get("sentiment")
        })

    prompt = f"""
    You are an expert technical aggregator.
    I will provide you with a list of extracted technical claims made by developers.
    Many of these claims are duplicates or variations of the exact same argument or solution.

    Your job is to perform Semantic Clustering:
    1. Group all claims that are making the exact same argument or proposing the exact same solution together into a single "Cluster".
    2. Write a clear, distinct summary of that grouped argument/solution.
    3. List the original 'claim_id's of all the claims that support this cluster.
    4. Calculate the 'support_count' (the number of claims in the cluster).

    Input Claims:
    {json.dumps(compressed_claims)}

    Output strictly in this JSON schema:
    {{
      "clusters": [
        {{
          "distinct_argument": "Use Vite 6.1 instead of Webpack",
          "supporting_claim_ids": ["1", "5", "8"],
          "support_count": 3,
          "overall_sentiment": "positive"
        }}
      ]
    }}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You output only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" },
            temperature=0.0
        )
        
        result_content = response.choices[0].message.content
        result_json = json.loads(result_content)
        
        # Add metadata
        result_json["_meta"] = {
            "total_input_claims": len(claims),
            "total_distinct_clusters": len(result_json.get("clusters", [])),
            "note": "M3 clustered the raw claims into distinct, deduplicated arguments."
        }
        
        return result_json
        
    except Exception as e:
        print(f"Error in M3 Synthesis: {e}")
        return {"error": str(e), "clusters": []}
