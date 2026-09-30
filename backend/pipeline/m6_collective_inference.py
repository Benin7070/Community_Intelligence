from typing import List, Tuple
from .base import BaseModule
from models.schemas import Claim, Evidence, ConsensusCluster, ConflictInference

class CollectiveInferenceModule(BaseModule):
    def __init__(self):
        super().__init__(name="3.6 Collective Support & Conflict Inference")
        
    async def process(self, claims: List[Claim], evidence_list: List[Evidence]) -> Tuple[List[ConsensusCluster], ConflictInference]:
        await self.publish_event("started", {
            "claims_count": len(claims),
            "evidence_count": len(evidence_list),
            "operations": ["Aggregating evidence weights W(C)", "Inferring competing claims", "Formulating dynamic resolution strategy"]
        })
        
        sign_map = {
            "supports": 1.0,
            "qualifies": 0.5,
            "contradicts": -0.8
        }
        
        collective_weight = 0.0
        supporting_items = []
        conflicting_items = []
        qualifying_items = []
        
        for ev in evidence_list:
            sign = sign_map.get(ev.relationship, 1.0)
            eff_weight = ev.credibility_weight * ev.independence_score * sign
            collective_weight += eff_weight
            
            if ev.relationship == "supports":
                supporting_items.append(ev)
            elif ev.relationship == "contradicts":
                conflicting_items.append(ev)
            else:
                qualifying_items.append(ev)
                
        # Derive competing viewpoints dynamically from real claims
        competing_views = []
        if conflicting_items:
            for item in conflicting_items[:2]:
                competing_views.append(f"Contradiction [{item.platform}]: {item.content[:90]}...")
        if supporting_items:
            competing_views.append(f"Consensus [{supporting_items[0].platform}]: {supporting_items[0].content[:90]}...")
            
        # Formulate resolution strategy based on actual evidence stance
        has_conflicts = len(conflicting_items) > 0
        total_ev = len(evidence_list)
        consensus_rate = round(len(supporting_items) / max(1, total_ev), 3)
        
        if has_conflicts:
            strategy = f"Contextual Discrepancy: {len(conflicting_items)} community post(s) report exceptions or version-specific bugs. Inspect runtime environment."
        elif len(qualifying_items) > len(supporting_items):
            strategy = "Conditional Adoption: Majority of community responses outline environmental qualifiers and prerequisite configuration."
        else:
            strategy = "Unified Consensus: High cross-platform agreement across verified high-reputation answers without unhandled contradictions."

        cluster = ConsensusCluster(
            cluster_id="CLUSTER-CONSENSUS",
            topic="Community Consensus & Empirical Resolution",
            claims=claims,
            evidence=evidence_list,
            collective_weight=round(collective_weight, 4),
            status="supported" if collective_weight > 0.5 else "uncertain"
        )
        
        conflict_summary = ConflictInference(
            conflict_detected=has_conflicts,
            competing_viewpoints=competing_views if competing_views else ["Standard single-hypothesis community consensus"],
            resolution_strategy=strategy,
            consensus_rate=consensus_rate
        )
        
        await self.publish_event("completed", {
            "consensus_clusters": 1,
            "collective_weight": cluster.collective_weight,
            "conflict_detected": conflict_summary.conflict_detected,
            "consensus_rate": f"{int(consensus_rate * 100)}%",
            "resolution_strategy": conflict_summary.resolution_strategy,
            "competing_viewpoints": conflict_summary.competing_viewpoints
        })
        
        return [cluster], conflict_summary
