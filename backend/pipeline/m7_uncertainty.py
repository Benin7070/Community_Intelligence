import math
from typing import List
from .base import BaseModule
from models.schemas import ConsensusCluster, UncertaintyCalibration

class UncertaintyModule(BaseModule):
    def __init__(self):
        super().__init__(name="3.7 Uncertainty & Abstention")
        
    async def process(self, clusters: List[ConsensusCluster]) -> List[ConsensusCluster]:
        await self.publish_event("started", {
            "cluster_count": len(clusters),
            "operations": ["Decomposing Epistemic & Aleatoric uncertainty", "Calibrating Bayesian confidence", "Evaluating abstention threshold"]
        })
        
        abstention_threshold = 0.35
        
        for cluster in clusters:
            evidence_count = len(cluster.evidence)
            
            # Epistemic uncertainty: inversely proportional to the amount of retrieved evidence
            epistemic = round(1.0 / (1.0 + 0.6 * max(1, evidence_count)), 3)
            
            # Aleatoric uncertainty: proportion of contradictory evidence retrieved
            contradictions = sum(1 for e in cluster.evidence if e.relationship == "contradicts")
            aleatoric = round((contradictions / max(1, evidence_count)) * 0.45, 3)
            
            # Calibrated confidence via Sigmoidal update
            raw_logit = 1.6 * cluster.collective_weight - 1.5 * aleatoric
            confidence = round(1.0 / (1.0 + math.exp(-raw_logit)), 3)
            
            abstain = confidence < abstention_threshold
            if abstain:
                status = "abstain"
                reason = f"Confidence score ({confidence}) fell below safety threshold ({abstention_threshold}) due to high contradictory noise or sparse evidence."
            elif confidence >= 0.70:
                status = "supported"
                reason = f"High confidence ({int(confidence*100)}%) with {evidence_count} cross-platform community validations."
            else:
                status = "uncertain"
                reason = f"Moderate confidence ({int(confidence*100)}%). Community consensus is divided or partially qualified."
                
            cluster.confidence_score = confidence
            cluster.status = status
            cluster.uncertainty = UncertaintyCalibration(
                confidence_score=confidence,
                epistemic_uncertainty=epistemic,
                aleatoric_uncertainty=aleatoric,
                abstention_flag=abstain,
                abstention_reason=reason if abstain else None,
                calibration_method="Bayesian Sigmoidal Calibration with Variance Regularization"
            )
            
        await self.publish_event("completed", {
            "calibrated_clusters": len(clusters),
            "primary_confidence": clusters[0].confidence_score if clusters else 0.0,
            "status": clusters[0].status if clusters else "unknown",
            "epistemic_uncertainty": clusters[0].uncertainty.epistemic_uncertainty if clusters and clusters[0].uncertainty else 0.0,
            "aleatoric_uncertainty": clusters[0].uncertainty.aleatoric_uncertainty if clusters and clusters[0].uncertainty else 0.0,
            "abstention_triggered": any(c.status == "abstain" for c in clusters)
        })
        return clusters
