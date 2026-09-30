"""
Backward-compatibility re-export shim for api.websocket
Endpoints have been modularized to api.routers.websocket
"""

from api.routers.websocket import router, manager, ConnectionManager
