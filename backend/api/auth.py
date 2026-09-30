"""
Backward-compatibility re-export shim for api.auth
Endpoints have been modularized to api.routers.auth and schemas to schemas.auth
"""

from api.routers.auth import router
from schemas.auth import *
