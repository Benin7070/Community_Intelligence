import math
from datetime import datetime, timezone
from dateutil.parser import parse as parse_date
from typing import Dict, Any, List

# --- Math Weights (w) and Constants (lambda) from User Logic ---
# Upvotes (W_V) is highest: Proves the answer worked for many people.
# Accepted (W_A) is high: Proves it worked for the original author.
# Reputation (W_R) is lower: A C++ expert answering Python could be wrong.
# Badges (W_B) is lowest: Redundant to reputation but cannot be ignored.
# --- Math Weights (w) from User Logic ---
W_V = 2.0   # Weight for upvotes
W_A = 1.5   # Weight for accepted answer
W_R = 1.0   # Weight for reputation
W_B = 0.5   # Weight for badges (Gold/Silver/Bronze)

def determine_lambda_decay(text: str) -> float:
    """
    Zero-token Domain Velocity Detector.
    Determines how fast information becomes obsolete based on tech keywords.
    """
    text = text.lower()
    # Fast-moving frontend/experimental tech decays very rapidly (0.005)
    fast_tech = ["react", "next", "vite", "svelte", "bun", "angular", "vue", "tailwind", "compiler"]
    # Slow-moving core tech remains valid for years (0.0001)
    slow_tech = ["sql", "postgres", "mysql", "c++", "bash", "linux", "git", "regex", "java", "c#"]
    
    for tech in fast_tech:
        if tech in text: return 0.005
    for tech in slow_tech:
        if tech in text: return 0.0001
        
    return 0.001 # Standard medium decay for everything else

def calculate_decay(created_at_str: str, decay_rate: float) -> float:
    """Calculates e^(-lambda * delta_t) using dynamic lambda"""
    if not created_at_str: return 1.0
    try:
        dt = parse_date(created_at_str)
        if not dt.tzinfo: dt = dt.replace(tzinfo=timezone.utc)
        delta_days = (datetime.now(timezone.utc) - dt).days
        if delta_days < 0: delta_days = 0
        return math.exp(-decay_rate * delta_days)
    except:
        return 1.0

async def execute_reliability_node(clusters_data: Dict[str, Any], acquired_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    M4: Reliability & Signals Node.
    Implements the S_cred(a, u) IEEE formula with Logarithmic Normalization and Exponential Time Decay.
    """
    clusters = clusters_data.get("clusters", [])
    
    # Flatten M1 acquired_data for O(1) lookup
    lookup_table = {}
    for platform, platform_data in acquired_data.items():
        if isinstance(platform_data, dict):
            # Test Rig Structure (has data.items)
            if "data" in platform_data and "items" in platform_data["data"]:
                for hit in platform_data["data"]["items"]:
                    post_id = str(hit.get("id") or hit.get("question_id") or hit.get("objectID", ""))
                    if post_id:
                        hit["_platform"] = platform
                        lookup_table[post_id] = hit
            # Production Structure (hits are inside queries_run)
            elif "queries_run" in platform_data:
                for query_run in platform_data["queries_run"]:
                    for hit in query_run.get("hits", []):
                        post_id = str(hit.get("id") or hit.get("question_id") or hit.get("objectID", ""))
                        if post_id:
                            hit["_platform"] = platform
                            lookup_table[post_id] = hit

    scored_clusters = []

    for cluster in clusters:
        claim_ids = cluster.get("supporting_claim_ids", [])
        
        # Zero-Token Domain Detection for this specific solution
        dynamic_lambda = determine_lambda_decay(cluster.get("distinct_argument", ""))
        
        # W(C_k) - Collective Weight of Consensus Cluster
        cluster_credibility = 0.0
        details = []

        for cid in claim_ids:
            hit = lookup_table.get(str(cid))
            if not hit: 
                print(f"[M4 DEBUG] Failed to find cid '{cid}' in lookup_table! Keys available: {list(lookup_table.keys())[:5]}...")
                continue
            
            platform = hit.get("_platform")
            created_at = hit.get("created_at")
            
            time_decay = calculate_decay(created_at, dynamic_lambda)
            
            s_cred = 0.0
            
            if platform == "Stack Overflow":
                v = hit.get("score", 0)
                ru = hit.get("owner", {}).get("reputation", 0)
                is_accepted = hit.get("is_answered", False)
                
                # Badges (if available in raw data, otherwise defaults to 0)
                badges = hit.get("owner", {}).get("badge_counts", {})
                gold = badges.get("gold", 0)
                silver = badges.get("silver", 0)
                bronze = badges.get("bronze", 0)
                badge_score_total = (gold * 3) + (silver * 2) + (bronze * 1)
                
                # IEEE Formula with User-defined Weights
                upvote_score = W_V * math.log1p(max(0, v))
                rep_score = W_R * math.log1p(max(0, ru))
                badge_score = W_B * math.log1p(max(0, badge_score_total))
                accepted_score = W_A if is_accepted else 0.0
                
                raw_cred = upvote_score + rep_score + badge_score + accepted_score
                s_cred = raw_cred * time_decay
                
            elif platform == "GitHub":
                # GitHub approximation using the same Log constraints
                comments = hit.get("comments", 0)
                assoc = hit.get("author_association", "NONE")
                
                assoc_points = 0
                if assoc in ["OWNER", "MEMBER"]: assoc_points = 5000 # Treated like 5k rep
                elif assoc == "COLLABORATOR": assoc_points = 1000
                elif assoc == "CONTRIBUTOR": assoc_points = 100
                
                upvote_score = W_V * math.log1p(max(0, comments))
                rep_score = W_R * math.log1p(max(0, assoc_points))
                
                raw_cred = upvote_score + rep_score
                s_cred = raw_cred * time_decay
                
            cluster_credibility += s_cred
            details.append(f"Post {cid}: S_cred={s_cred:.2f} (Decay: {time_decay:.2f})")

        scored_clusters.append({
            "distinct_argument": cluster.get("distinct_argument"),
            "collective_weight_W": round(cluster_credibility, 2),
            "math_breakdown": details,
            "supporting_claim_ids": claim_ids,
            "support_count": len(claim_ids)
        })

    # Sort descending
    scored_clusters.sort(key=lambda x: x["collective_weight_W"], reverse=True)

    # Bayesian Uncertainty Threshold (Module 3.7)
    # Convert absolute weight into a relative Sigmoid Confidence %
    if not scored_clusters:
        return {"ranked_solutions": []}
        
    top_score = scored_clusters[0]["collective_weight_W"]
    runner_up_score = scored_clusters[1]["collective_weight_W"] if len(scored_clusters) > 1 else 0
    
    # Sigmoid function modeling confidence based on absolute score and conflict gap
    # Confidence(C_k) = sigma( alpha * W - beta * U_conflict )
    conflict_penalty = runner_up_score * 0.5
    confidence_raw = 1 / (1 + math.exp(-(top_score - conflict_penalty - 5))) # Offset by 5
    confidence_pct = round(confidence_raw * 100, 1)
    
    status = "resolved"
    if confidence_pct < 60:
        status = "abstain_insufficient_evidence"
    elif confidence_pct < 80:
        status = "contested_high_uncertainty"

    return {
        "_meta": {
            "status": status,
            "top_confidence_percent": confidence_pct,
            "note": "Calculated via IEEE S_cred(a, u) Log-Norm and Exponential Decay."
        },
        "ranked_solutions": scored_clusters
    }
