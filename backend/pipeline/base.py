from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseModule(ABC):
    """
    Abstract base class for all Community Intelligence pipeline modules.
    Each module processes data and returns the transformed data, 
    publishing progress events along the way if an event_callback is provided.
    """
    
    def __init__(self, name: str):
        self.name = name
        self.event_callback = None
        
    def set_event_callback(self, callback):
        """Set a callback function for async real-time updates (e.g. websockets)."""
        self.event_callback = callback
        
    async def publish_event(self, status: str, details: Any = None):
        """Publish an event to the callback if it exists."""
        if self.event_callback:
            await self.event_callback({
                "module": self.name,
                "status": status,
                "details": details
            })

    @abstractmethod
    async def process(self, *args, **kwargs) -> Any:
        """The core processing logic for the module."""
        pass
