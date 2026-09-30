import asyncio
from typing import Callable, Any, Dict, List
from .m1_data_acquisition import DataAcquisitionModule
from .m2_claim_modeling import ClaimModelingModule
from .m3_evidence_assessment import EvidenceAssessmentModule
from .m4_provenance import ProvenanceModule
from .m5_reliability import ReliabilityModule
from .m6_collective_inference import CollectiveInferenceModule
from .m7_uncertainty import UncertaintyModule
from models.schemas import (
    QueryRoutingInfo, 
    ProvenanceGraph, 
    ProvenanceNode, 
    ProvenanceEdge, 
    ConsensusCluster, 
    ConflictInference
)

class PipelineOrchestrator:
    def __init__(self):
        self.m1 = DataAcquisitionModule()
        self.m2 = ClaimModelingModule()
        self.m3 = EvidenceAssessmentModule()
        self.m4 = ProvenanceModule()
        self.m5 = ReliabilityModule()
        self.m6 = CollectiveInferenceModule()
        self.m7 = UncertaintyModule()
        self.event_callback = None
        
    def set_event_callback(self, callback: Callable[[dict], Any]):
        self.event_callback = callback
        self.m1.set_event_callback(callback)
        self.m2.set_event_callback(callback)
        self.m3.set_event_callback(callback)
        self.m4.set_event_callback(callback)
        self.m5.set_event_callback(callback)
        self.m6.set_event_callback(callback)
        self.m7.set_event_callback(callback)
        
    async def _emit_layer_event(self, layer: str, status: str, details: dict):
        if self.event_callback:
            await self.event_callback({
                "module": layer,
                "status": status,
                "details": details
            })

    async def route_query(self, query: str) -> QueryRoutingInfo:
        """Layer 2: Query Understanding & Routing"""
        await self._emit_layer_event("2.0 Query Understanding & Routing", "started", {
            "query": query,
            "actions": ["Intent Classification", "Domain/Entity Extraction", "CI vs Normal RAG Routing"]
        })
        
        await asyncio.sleep(0.5)
        
        q_lower = query.lower()
        domain = "Software Engineering / General"
        entities = []
        intent = "empirical_troubleshooting"
        
        if any(k in q_lower for k in ["react", "vue", "hook", "useeffect", "css", "dom", "frontend"]):
            domain = "Frontend & UI Systems"
            entities.extend([w for w in ["React", "useEffect", "DOM", "State", "Vite"] if w.lower() in q_lower])
        elif any(k in q_lower for k in ["python", "asyncio", "thread", "concurrency", "coroutine"]):
            domain = "Python Concurrency & Runtimes"
            entities.extend([w for w in ["Python", "asyncio", "threading", "GIL", "EventLoop"] if w.lower() in q_lower])
        elif any(k in q_lower for k in ["cuda", "gpu", "pytorch", "tensorflow", "model", "llm"]):
            domain = "Deep Learning Infrastructure"
            entities.extend([w for w in ["CUDA", "PyTorch", "GPU", "TensorFlow", "Memory"] if w.lower() in q_lower])
        elif any(k in q_lower for k in ["docker", "k8s", "kubernetes", "oom", "pod", "memory"]):
            domain = "Cloud & Distributed Systems"
            entities.extend([w for w in ["Kubernetes", "Docker", "OOMKilled", "Container"] if w.lower() in q_lower])
        else:
            domain = "Software Development Ecosystem"
            entities = ["Runtime Context", "Best Practices"]

        routing = QueryRoutingInfo(
            intent=intent,
            domain=domain,
            detected_entities=entities if entities else ["Technical Query"],
            is_ci_pipeline=True,
            confidence=0.96,
            rationale="Query requires multi-signal community agreement, version caveats, and empirical synthesis."
        )
        
        await self._emit_layer_event("2.0 Query Understanding & Routing", "completed", {
            "intent": routing.intent,
            "domain": routing.domain,
            "entities": routing.detected_entities,
            "route": "Community Intelligence Core (CI Pipeline)",
            "confidence": f"{int(routing.confidence * 100)}%"
        })
        return routing

    def build_provenance_graph(self, query: str, posts: list, claims: list, evidence: list) -> ProvenanceGraph:
        """Layer 4: Claim-Source Provenance Graph (Neo4j / Graph view)"""
        nodes: List[ProvenanceNode] = []
        edges: List[ProvenanceEdge] = []
        
        # Central Query Node
        nodes.append(ProvenanceNode(
            id="NODE-QUERY",
            label="User Query",
            type="query",
            details=query[:60]
        ))
        
        # Post & Author Nodes
        for p in posts:
            post_node_id = f"POST-{p.post_id}"
            nodes.append(ProvenanceNode(
                id=post_node_id,
                label=f"{p.platform}: {p.post_id}",
                type="source",
                platform=p.platform,
                credibility=round(p.score / 100.0, 2),
                details=f"Author: {p.author.username} (Rep: {p.author.reputation})"
            ))
            edges.append(ProvenanceEdge(
                source="NODE-QUERY",
                target=post_node_id,
                label="retrieved_from",
                weight=1.0
            ))
            
        # Claim Nodes
        for c in claims:
            claim_node_id = f"NODE-{c.claim_id}"
            nodes.append(ProvenanceNode(
                id=claim_node_id,
                label=f"Claim: {c.claim_id}",
                type="claim",
                platform=c.platform,
                details=c.text[:80]
            ))
            edges.append(ProvenanceEdge(
                source=f"POST-{c.source_post_id}",
                target=claim_node_id,
                label="asserts_claim",
                weight=1.0
            ))
            
        # Evidence Nodes
        for ev in evidence:
            ev_node_id = f"NODE-{ev.evidence_id}"
            nodes.append(ProvenanceNode(
                id=ev_node_id,
                label=f"Evidence: {ev.evidence_id}",
                type="evidence",
                platform=ev.platform,
                credibility=ev.credibility_weight,
                details=f"Independence: {ev.independence_score} | Rel: {ev.relationship}"
            ))
            edges.append(ProvenanceEdge(
                source=f"NODE-{ev.claim_id}",
                target=ev_node_id,
                label=ev.relationship,
                weight=ev.credibility_weight
            ))
            
        return ProvenanceGraph(nodes=nodes, edges=edges)

    async def run(self, query: str) -> dict:
        # Layer 2: Routing
        routing = await self.route_query(query)
        
        # Layer 3: CI Core
        # Phase 3.1: Data Acquisition
        posts = await self.m1.process(query)
        
        # Phase 3.2: Claim Modeling
        claims = await self.m2.process(posts)
        
        # Phase 3.3: Evidence Assessment
        evidence = await self.m3.process(claims)
        
        # Phase 3.4: Provenance & Independence
        evidence = await self.m4.process(evidence)
        
        # Phase 3.5: Reliability & Community Signals
        evidence = await self.m5.process(evidence, posts)
        
        # Phase 3.6: Collective Support & Conflict Inference
        clusters, conflict_summary = await self.m6.process(claims, evidence)
        
        # Phase 3.7: Uncertainty & Abstention
        final_clusters = await self.m7.process(clusters)
        
        # Layer 4: Data & Knowledge Graph
        await self._emit_layer_event("4.0 Data & Knowledge Layer", "started", {
            "status": "Building Claim-Source Provenance Graph",
            "components": ["Raw Data Store", "Retrieved Claims", "Neo4j Provenance Graph"]
        })
        provenance_graph = self.build_provenance_graph(query, posts, claims, evidence)
        await self._emit_layer_event("4.0 Data & Knowledge Layer", "completed", {
            "graph_nodes": len(provenance_graph.nodes),
            "graph_edges": len(provenance_graph.edges),
            "sources_indexed": len(posts)
        })
        
        sources_summary = {}
        for p in posts:
            sources_summary[p.platform] = sources_summary.get(p.platform, 0) + 1

        return {
            "query": query,
            "routing": routing,
            "posts": posts,
            "clusters": final_clusters,
            "conflict_summary": conflict_summary,
            "provenance_graph": provenance_graph,
            "sources_summary": sources_summary
        }
