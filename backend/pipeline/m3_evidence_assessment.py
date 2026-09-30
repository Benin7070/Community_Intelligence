import re
from typing import List
from .base import BaseModule
from models.schemas import Claim, Evidence

class EvidenceAssessmentModule(BaseModule):
    def __init__(self):
        super().__init__(name="3.3 Evidence Assessment")
        
    def _determine_relationship(self, claim_text: str, is_accepted: bool, score: int) -> str:
        """Classify empirical relationship using lexical semantics and contradiction markers"""
        lower = claim_text.lower()
        
        contradiction_keywords = ["bug", "issue", "error", "fail", "broken", "leak", "infinite", "crash", "cannot", "regression", "deprecated"]
        qualification_keywords = ["depends", "unless", "except", "version", "requires", "workaround", "flag", "config", "caveat", "fallback"]
        
        has_contradiction = any(re.search(rf"\b{k}\b", lower) for k in contradiction_keywords)
        has_qualification = any(re.search(rf"\b{k}\b", lower) for k in qualification_keywords)
        
        if is_accepted or score > 50:
            if has_qualification:
                return "qualifies"
            return "supports"
        elif has_contradiction:
            return "contradicts"
        elif has_qualification:
            return "qualifies"
        else:
            return "supports"

    async def process(self, claims: List[Claim]) -> List[Evidence]:
        await self.publish_event("started", {
            "claim_count": len(claims),
            "operations": ["Analyzing lexical stance", "Detecting contradiction & qualification markers", "Assigning relationship"]
        })
        
        evidence_list: List[Evidence] = []
        for i, claim in enumerate(claims):
            is_acc = claim.metadata.get("is_accepted", False)
            raw_score = claim.metadata.get("raw_score", 0)
            rel = self._determine_relationship(claim.text, is_acc, raw_score)
            
            evidence_list.append(
                Evidence(
                    evidence_id=f"EVD-{claim.claim_id}",
                    claim_id=claim.claim_id,
                    content=claim.text,
                    relationship=rel,
                    source_post_id=claim.source_post_id,
                    platform=claim.platform,
                    independence_score=1.0,
                    credibility_weight=1.0
                )
            )
            
        rel_counts = {
            "supports": sum(1 for e in evidence_list if e.relationship == "supports"),
            "qualifies": sum(1 for e in evidence_list if e.relationship == "qualifies"),
            "contradicts": sum(1 for e in evidence_list if e.relationship == "contradicts")
        }
        
        await self.publish_event("completed", {
            "evidence_assessed": len(evidence_list),
            "stance_distribution": rel_counts,
            "evidence_items": [
                {
                    "id": e.evidence_id,
                    "rel": e.relationship,
                    "platform": e.platform,
                    "preview": e.content[:60] + "..."
                }
                for e in evidence_list
            ]
        })
        return evidence_list
