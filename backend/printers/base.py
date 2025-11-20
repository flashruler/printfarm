from __future__ import annotations

from typing import Protocol, runtime_checkable, Any, Mapping, Optional


@runtime_checkable
class PrinterAdapter(Protocol):
    """Capability-driven adapter interface for different printer backends.

    Implementations should normalize outputs to plain JSON-serializable
    primitives so the REST/WS layer can be backend-agnostic.
    """

    # Identity (optional but useful for registry persistence)
    type: str  # e.g. "bambu", "octoprint", "prusa"

    # Connection lifecycle
    connected: bool
    async def connect(self) -> None: ...

    # Status endpoints (all optional; raise or return {"error": ...} if unsupported)
    async def get_status(self) -> Mapping[str, Any]: ...
    async def get_print_status_raw(self) -> Mapping[str, Any]: ...
    async def get_percentage(self) -> Mapping[str, Any]: ...
    async def get_filament_info(self) -> Mapping[str, Any]: ...

    # Controls (optional per capabilities)
    async def home(self) -> Mapping[str, Any]: ...
    async def pause(self) -> Mapping[str, Any]: ...
    async def resume(self) -> Mapping[str, Any]: ...
    async def cancel(self) -> Mapping[str, Any]: ...

    # Optional generic control hooks
    async def send_gcode(self, gcode: str | list[str], gcode_check: bool = True) -> Mapping[str, Any]: ...

    @property
    def capabilities(self) -> Mapping[str, bool]:
        """Advertise feature support so UI can enable/disable controls.

        Common keys:
        - status, percentage, filament, error_codes
        - home, pause, resume, cancel
        - gcode, jog_xy, move_z
        """
        ...
