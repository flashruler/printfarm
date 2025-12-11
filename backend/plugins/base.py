"""Base plugin abstract class.

All plugins must inherit from BasePlugin and implement required methods.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.event_bus import EventBus
    from registry import PrinterRegistry
    from fastapi import FastAPI


class BasePlugin(ABC):
    """Abstract base class for all plugins.
    
    Plugins should inherit from this class and implement the required methods.
    
    Example:
        class MyPlugin(BasePlugin):
            name = "my-plugin"
            version = "1.0.0"
            
            async def on_load(self, app: FastAPI, registry: PrinterRegistry, event_bus: EventBus):
                # Register routes
                @app.get("/api/plugins/my-plugin/status")
                async def get_status():
                    return {"status": "ok"}
                
                # Subscribe to events
                event_bus.on("print.completed", self.on_print_complete)
            
            async def on_print_complete(self, event_data: dict):
                print(f"Print completed: {event_data}")
            
            async def on_unload(self):
                print("Plugin unloading...")
    """
    
    # Plugin metadata - must be set by subclass
    name: str
    version: str
    author: str = "Unknown"
    description: str = ""
    
    def __init__(self):
        """Initialize plugin instance."""
        self._loaded = False
    
    @abstractmethod
    async def on_load(
        self, 
        app: FastAPI, 
        registry: PrinterRegistry, 
        event_bus: EventBus
    ) -> None:
        """Called when plugin is loaded.
        
        Register API routes, subscribe to events, initialize resources.
        
        Args:
            app: FastAPI application instance
            registry: Printer registry for accessing printers
            event_bus: Event bus for subscribing to events
        """
        pass
    
    async def on_unload(self) -> None:
        """Called when plugin is unloaded.
        
        Clean up resources, close connections, unsubscribe from events.
        This is optional - only implement if needed.
        """
        pass
    
    async def on_settings_changed(self, settings: dict[str, Any]) -> None:
        """Called when plugin settings are updated via API.
        
        Args:
            settings: New settings dict
        """
        pass
    
    @property
    def is_loaded(self) -> bool:
        """Check if plugin is currently loaded."""
        return self._loaded
    
    def _mark_loaded(self) -> None:
        """Internal: Mark plugin as loaded."""
        self._loaded = True
    
    def _mark_unloaded(self) -> None:
        """Internal: Mark plugin as unloaded."""
        self._loaded = False
