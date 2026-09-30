"""
Backward-compatibility re-export shim for api.routes
Endpoints have been modularized to api.routers.pipeline
"""

from api.routers.pipeline import (
    router,
    orchestrator,
    synthesis_engine,
    feedback_store,
    process_pipeline_event,
    run_query,
    submit_feedback,
    get_feedback_stats
)
from schemas.pipeline import QueryRequest
