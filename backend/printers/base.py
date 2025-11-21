from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Mapping


class PrinterAdapter(ABC):
    """Abstract base class for printer adapters (Java-style interface).

    Implementations must inherit from this class and implement all abstract methods.
    Methods can normalize outputs to plain JSON-serializable primitives so the
    REST/WS layer can be backend-agnostic.
    
    Example:
        class MyPrinter(PrinterAdapter):
            type = "myprinter"
            
            def __init__(self, url: str):
                self.url = url
                self.connected = False
            
            async def connect(self) -> None:
                # Implementation here
                self.connected = True
            
            async def get_status(self) -> Mapping[str, Any]:
                # Implementation here
                return {"bed_temperature": 60, ...}
    """

    # Class attribute - must be overridden in subclass
    type: str

    # Instance attribute - subclass should initialize in __init__
    connected: bool

    # Abstract methods - MUST be implemented by subclasses
    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the printer."""
        ...

    @abstractmethod
    async def get_status(self) -> Mapping[str, Any]:
        """Return printer status with temperatures and state.
        
        Returns:
            dict with keys: bed_temperature, nozzle_temperatures, print_status,
            print_phase, print_error_code, has_error
        """
        ...

    @abstractmethod
    async def get_print_status_raw(self) -> Mapping[str, Any]:
        """Return raw status string from printer API.
        
        Returns:
            dict with key: print_status
        """
        ...

    @abstractmethod
    async def get_percentage(self) -> Mapping[str, Any]:
        """Return print progress percentage.
        
        Returns:
            dict with key: print_percentage (int 0-100 or None)
        """
        ...

    @abstractmethod
    async def get_filament_info(self) -> Mapping[str, Any]:
        """Return loaded filament/material information.
        
        Returns:
            dict with keys: tray_type (str or None), raw (dict)
        """
        ...

    @abstractmethod
    async def home(self) -> Mapping[str, Any]:
        """Home all axes.
        
        Returns:
            dict with keys: status ("success" or "error"), action ("home")
        """
        ...

    @abstractmethod
    async def pause(self) -> Mapping[str, Any]:
        """Pause current print."""
        ...

    @abstractmethod
    async def resume(self) -> Mapping[str, Any]:
        """Resume paused print."""
        ...

    @abstractmethod
    async def cancel(self) -> Mapping[str, Any]:
        """Cancel/stop current print."""
        ...

    @abstractmethod
    async def send_gcode(self, gcode: str | list[str], gcode_check: bool = True) -> Mapping[str, Any]:
        """Send raw G-code commands to printer.
        
        Args:
            gcode: Single command string or list of commands
            gcode_check: Whether to validate G-code syntax (optional)
        
        Returns:
            dict with key: ok (bool) or error (str)
        """
        ...

    @property
    @abstractmethod
    def capabilities(self) -> Mapping[str, bool]:
        """Advertise feature support so UI can enable/disable controls.

        Common keys:
        - status, percentage, filament, error_codes
        - home, pause, resume, cancel
        - gcode, jog_xy, move_z
        
        Returns:
            dict mapping capability names to bool (supported or not)
        """
        ...
