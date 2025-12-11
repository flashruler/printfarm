"""Event bus for plugin system.

Allows plugins to subscribe to events emitted by the core system.
Events are emitted at key lifecycle points (status updates, print events, errors).
"""

from __future__ import annotations

import asyncio
from typing import Any, Callable, Awaitable
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# Type alias for event handlers
EventHandler = Callable[[dict[str, Any]], Awaitable[None]]


class EventBus:
    """Centralized event bus for plugin communication.
    
    Example usage:
        # Subscribe to events
        event_bus.on("print.completed", my_handler)
        
        # Emit events
        await event_bus.emit("print.completed", {"printer_id": "bambu1", "file": "benchy.gcode"})
        
        # Unsubscribe
        event_bus.off("print.completed", my_handler)
    """
    
    def __init__(self):
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)
        self._wildcard_handlers: list[EventHandler] = []
    
    def on(self, event_name: str, handler: EventHandler) -> None:
        """Subscribe to an event.
        
        Args:
            event_name: Event to subscribe to (e.g., "print.completed", "*" for all events)
            handler: Async function to call when event is emitted
        """
        if event_name == "*":
            self._wildcard_handlers.append(handler)
        else:
            self._handlers[event_name].append(handler)
        logger.info(f"Registered handler for event: {event_name}")
    
    def off(self, event_name: str, handler: EventHandler) -> None:
        """Unsubscribe from an event.
        
        Args:
            event_name: Event to unsubscribe from
            handler: Handler to remove
        """
        if event_name == "*":
            if handler in self._wildcard_handlers:
                self._wildcard_handlers.remove(handler)
        else:
            if handler in self._handlers[event_name]:
                self._handlers[event_name].remove(handler)
        logger.info(f"Unregistered handler for event: {event_name}")
    
    async def emit(self, event_name: str, data: dict[str, Any]) -> None:
        """Emit an event to all subscribers.
        
        Args:
            event_name: Name of event (e.g., "print.completed")
            data: Event payload (arbitrary dict)
        """
        logger.debug(f"Emitting event: {event_name} with data: {data}")
        
        # Call specific handlers
        handlers = self._handlers.get(event_name, [])
        
        # Call wildcard handlers
        all_handlers = handlers + self._wildcard_handlers
        
        if not all_handlers:
            return
        
        # Execute all handlers concurrently
        tasks = []
        for handler in all_handlers:
            try:
                tasks.append(handler({"event": event_name, **data}))
            except Exception as e:
                logger.error(f"Error preparing handler for {event_name}: {e}", exc_info=True)
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Log any exceptions from handlers
            for idx, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(
                        f"Event handler {idx} for '{event_name}' raised exception: {result}",
                        exc_info=result
                    )
    
    def list_events(self) -> dict[str, int]:
        """Get list of registered events and their handler counts.
        
        Returns:
            Dict mapping event names to number of handlers
        """
        result = {event: len(handlers) for event, handlers in self._handlers.items()}
        if self._wildcard_handlers:
            result["*"] = len(self._wildcard_handlers)
        return result


# Global event bus instance
event_bus = EventBus()
