import math
import time
from typing import List
from .base import BaseModule
from models.schemas import Evidence, RawPost

class ReliabilityModule(BaseModule):
    def __init__(self):
        super().__init__(name="3.5 Reliability & Community Signals")
        
    async def process(self, evidence_list: List[Evidence], posts: List[RawPost]) -> List[Evidence]:
        await self.publish_event("started", {
            "evidence_count": len(evidence_list),
            "formula": "S_cred(a, u) = 0.35*Norm(log(1+v)) + 0.25*Norm(log(1+R)) + 0.15*B + 0.15*I_acc + 0.10*Recency",
            "signals": ["Post Upvotes (v)", "Author Reputation (R)", "Badges (B)", "Accepted Answer (I_acc)", "Creation Recency (t)"]
        })
        
        post_map = {post.post_id: post for post in posts}
        current_time = int(time.time())
        weights_detail = []
        
        for ev in evidence_list:
            post = post_map.get(ev.source_post_id)
            if post:
                author = post.author
                
                # Real log-scaled normalization for upvotes and reputation
                v_norm = min(1.0, math.log10(1 + max(0, post.score)) / 3.0)
                r_norm = min(1.0, math.log10(1 + max(0, author.reputation)) / 5.0)
                b_norm = min(1.0, (author.gold_badges * 3 + author.silver_badges * 1.5 + author.bronze_badges * 0.5) / 50.0)
                a_score = 1.0 if post.is_accepted else 0.0
                
                # Real recency decay from post creation date
                age_days = max(0.1, (current_time - post.creation_date) / 86400.0)
                t_score = math.exp(-0.0019 * age_days)
                
                cred_score = (
                    0.35 * v_norm +
                    0.25 * r_norm +
                    0.15 * b_norm +
                    0.15 * a_score +
                    0.10 * t_score
                )
                
                ev.credibility_weight = round(cred_score, 4)
                weights_detail.append({
                    "evidence_id": ev.evidence_id,
                    "platform": ev.platform,
                    "author": author.username,
                    "reputation": author.reputation,
                    "upvotes": post.score,
                    "is_accepted": post.is_accepted,
                    "credibility_weight": ev.credibility_weight
                })
                
        await self.publish_event("completed", {
            "weighted_evidence_count": len(evidence_list),
            "credibility_breakdown": weights_detail
        })
        return evidence_list
