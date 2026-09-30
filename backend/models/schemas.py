"""
Backward compatibility layer for models.schemas
All schemas are now modularized in backend/schemas/
"""

from schemas.pipeline import (
    QueryRequest,
    UserProfile,
    RawPost,
    Claim,
    Evidence,
    ProvenanceNode,
    ProvenanceEdge,
    ProvenanceGraph,
    QueryRoutingInfo,
    UncertaintyCalibration,
    ConflictInference,
    ConsensusCluster,
    FeedbackRequest,
    FeedbackResponse,
    QueryResponse
)
