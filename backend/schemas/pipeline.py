from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class QueryRequest(BaseModel):
    query: str
    chat_id: Optional[str] = None
    message_id: Optional[str] = None
    competitor_model: Optional[str] = "OpenAI (GPT-4o-mini)"

class UserProfile(BaseModel):
    user_id: str
    username: str = "dev_contributor"
    reputation: int
    gold_badges: int
    silver_badges: int
    bronze_badges: int = 0
    total_answers: int

class RawPost(BaseModel):
    post_id: str
    platform: str = "Stack Overflow" # "Stack Overflow", "GitHub", "Reddit", "Forums"
    title: str = ""
    body: str
    score: int
    is_accepted: bool = False
    author: UserProfile
    creation_date: int
    url: str = ""

class Claim(BaseModel):
    claim_id: str
    text: str
    source_post_id: str
    platform: str = "Stack Overflow"
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Evidence(BaseModel):
    evidence_id: str
    claim_id: str
    content: str
    relationship: str # "supports", "contradicts", "qualifies"
    source_post_id: str
    platform: str = "Stack Overflow"
    independence_score: float = 1.0 # MinHash / SimHash independence
    credibility_weight: float = 1.0 # Eq 1: S_cred(a, u)

class ProvenanceNode(BaseModel):
    id: str
    label: str
    type: str # "query", "claim", "evidence", "source", "author"
    platform: Optional[str] = None
    credibility: Optional[float] = None
    details: Optional[str] = None

class ProvenanceEdge(BaseModel):
    source: str
    target: str
    label: str # "extracts_claim", "provides_evidence", "authored_by", "supports", "contradicts"
    weight: float = 1.0

class ProvenanceGraph(BaseModel):
    nodes: List[ProvenanceNode] = Field(default_factory=list)
    edges: List[ProvenanceEdge] = Field(default_factory=list)

class QueryRoutingInfo(BaseModel):
    intent: str # "troubleshooting", "best_practice", "version_compatibility", "general_rag"
    domain: str # "Python AsyncIO", "React/Frontend", "Machine Learning / PyTorch", "DevOps"
    detected_entities: List[str] = Field(default_factory=list)
    is_ci_pipeline: bool = True
    confidence: float = 0.95
    rationale: str = "Query requires empirical community consensus and edge-case resolution."

class UncertaintyCalibration(BaseModel):
    confidence_score: float = 0.92
    epistemic_uncertainty: float = 0.12 # lack of evidence
    aleatoric_uncertainty: float = 0.08 # noisy community conflict
    abstention_flag: bool = False
    abstention_reason: Optional[str] = None
    calibration_method: str = "Bayesian Evidence Update (Eq 5)"

class ConflictInference(BaseModel):
    conflict_detected: bool = False
    competing_viewpoints: List[str] = Field(default_factory=list)
    resolution_strategy: str = "Contextual Qualification (Version/Platform)"
    consensus_rate: float = 0.88

class ConsensusCluster(BaseModel):
    cluster_id: str
    topic: str
    claims: List[Claim] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)
    collective_weight: float = 0.0
    confidence_score: float = 0.0
    status: str = "supported" # "supported", "contradicted", "uncertain", "abstain"
    uncertainty: Optional[UncertaintyCalibration] = None

class FeedbackRequest(BaseModel):
    query: str
    chat_id: Optional[str] = None
    message_id: Optional[str] = None
    feedback_type: str = "preference" # "helpful", "incorrect", "missing_evidence", "preference"
    preferred_model: Optional[str] = None # "ci_pipeline", "competitor", "tie"
    competitor_model: Optional[str] = "OpenAI (GPT-4o-mini)"
    competitor_response: Optional[str] = None
    ci_response: Optional[str] = None
    competitor_latency_ms: Optional[int] = 0
    ci_latency_ms: Optional[int] = 0
    is_locked: bool = True
    comment: Optional[str] = None
    cluster_id: Optional[str] = None

class FeedbackResponse(BaseModel):
    status: str = "recorded"
    message: str = "Feedback logged for Layer 6 Continuous Improvement calibration."
    feedback_id: str
    chat_id: Optional[str] = None
    message_id: Optional[str] = None
    preferred_model: Optional[str] = None
    is_locked: bool = True

class QueryResponse(BaseModel):
    query: str
    chat_id: str = ""
    message_id: str = ""
    competitor_model: str = "OpenAI (GPT-4o-mini)"
    competitor_latency_ms: int = 0
    ci_latency_ms: int = 0
    ci_token_usage: int = 0
    competitor_token_usage: int = 0
    routing: QueryRoutingInfo
    headline_answer: str
    detailed_synthesis: str = ""
    chatgpt_response: Optional[str] = None # Direct Competitor baseline response
    consensus_clusters: List[ConsensusCluster] = Field(default_factory=list)
    provenance_graph: ProvenanceGraph = Field(default_factory=ProvenanceGraph)
    conflict_summary: ConflictInference = Field(default_factory=ConflictInference)
    caveats: List[str] = Field(default_factory=list)
    confidence_explanation: str
    sources_summary: Dict[str, int] = Field(default_factory=dict)


