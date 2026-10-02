import time
from typing import Dict, Any

class ActivityTracker:
    """
    Tracks active HTTP requests and idle duration to power the 
    Render Anti-Sleep Keep-Alive mechanism.
    """
    def __init__(self):
        self._active_requests: int = 0
        self._last_activity_time: float = time.time()
        self._total_pings: int = 0

    def request_start(self, is_ping: bool = False):
        if is_ping:
            self._total_pings += 1
        else:
            self._active_requests += 1

    def request_end(self, is_ping: bool = False):
        if not is_ping:
            self._active_requests = max(0, self._active_requests - 1)
            self._last_activity_time = time.time()

    @property
    def active_requests(self) -> int:
        return self._active_requests

    @property
    def idle_seconds(self) -> float:
        return time.time() - self._last_activity_time

    @property
    def total_pings(self) -> int:
        return self._total_pings

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "alive",
            "active_requests": self._active_requests,
            "idle_seconds": round(self.idle_seconds, 1),
            "total_pings": self._total_pings,
            "is_idle": self._active_requests == 0 and self.idle_seconds >= 45
        }

tracker = ActivityTracker()
