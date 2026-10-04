from typing import Dict, Any

async def execute_uncertainty_node(m4_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    M5: Uncertainty & Abstention Node.
    Acts as the 'Abstain Guard' (Bayesian Calibration).
    Does NOT generate the final response. It only determines if the system is allowed to proceed to Generation.
    """
    meta = m4_data.get("_meta", {})
    status = meta.get("status", "resolved")
    confidence = meta.get("top_confidence_percent", 0)
    
    # Analyze Epistemic vs Aleatoric Uncertainty
    uncertainty_type = "None"
    guard_action = "PROCEED"
    reason = "Evidence is strong and consensus is clear."

    if status == "abstain_insufficient_evidence":
        uncertainty_type = "Epistemic (Lack of Data)"
        guard_action = "HALT_PIPELINE"
        reason = f"Bayesian Confidence is critically low ({confidence}%). The system does not have enough high-quality data to safely answer."
    
    elif status == "contested_high_uncertainty":
        uncertainty_type = "Aleatoric (Chaotic/Conflicting Data)"
        guard_action = "PROCEED_WITH_WARNING"
        reason = f"Confidence is degraded ({confidence}%). The system has data, but the developer community is fiercely divided. Generation must include a warning."

    return {
        "guard_action": guard_action,
        "uncertainty_type": uncertainty_type,
        "bayesian_confidence": confidence,
        "calibration_reason": reason,
        "ranked_solutions_passthrough": m4_data.get("ranked_solutions", [])
    }
