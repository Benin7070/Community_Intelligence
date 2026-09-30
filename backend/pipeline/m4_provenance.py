from typing import List, Set
from .base import BaseModule
from models.schemas import Evidence

class ProvenanceModule(BaseModule):
    def __init__(self):
        super().__init__(name="3.4 Provenance & Independence")
        
    def _get_shingles(self, text: str, k: int = 3) -> Set[str]:
        """Generate word-level k-shingles for n-gram Jaccard / MinHash similarity"""
        words = text.lower().split()
        if len(words) < k:
            return set(words)
        return {" ".join(words[i:i+k]) for i in range(len(words) - k + 1)}

    def _calculate_jaccard(self, set_a: Set[str], set_b: Set[str]) -> float:
        """Compute Jaccard similarity between two shingle sets"""
        if not set_a or not set_b:
            return 0.0
        intersection = len(set_a.intersection(set_b))
        union = len(set_a.union(set_b))
        return intersection / union if union > 0 else 0.0

    async def process(self, evidence_list: List[Evidence]) -> List[Evidence]:
        await self.publish_event("started", {
            "evidence_count": len(evidence_list),
            "operations": ["Generating n-gram shingle sets", "Computing pairwise Jaccard cross-matrix", "Calculating real independence scores I(e)"]
        })
        
        shingles_list = [self._get_shingles(e.content) for e in evidence_list]
        max_overlaps = []
        
        # Compute pairwise Jaccard overlap to detect content reproduction across platforms
        for i, ev in enumerate(evidence_list):
            max_sim = 0.0
            most_similar_idx = None
            
            for j, other_ev in enumerate(evidence_list):
                if i != j:
                    sim = self._calculate_jaccard(shingles_list[i], shingles_list[j])
                    if sim > max_sim:
                        max_sim = sim
                        most_similar_idx = j
                        
            # Independence Score Eq: I(e) = 1.0 - max_similarity
            # If two posts share 60% text (e.g., syndicated bug report), independence drops to 0.40
            ind_score = max(0.25, round(1.0 - max_sim, 3))
            ev.independence_score = ind_score
            max_overlaps.append({
                "evidence_id": ev.evidence_id,
                "platform": ev.platform,
                "max_similarity": round(max_sim, 3),
                "independence_score": ind_score
            })
            
        avg_ind = sum(e.independence_score for e in evidence_list) / len(evidence_list) if evidence_list else 1.0
        
        await self.publish_event("completed", {
            "processed": len(evidence_list),
            "average_independence_score": round(avg_ind, 3),
            "lineage_matrix": max_overlaps
        })
        return evidence_list
