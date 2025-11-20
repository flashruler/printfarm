from __future__ import annotations

from typing import Mapping, Any


class OctoPrintPrinter:
    type = "octoprint"

    def __init__(self, url: str, api_key: str):
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.connected = False

    async def connect(self) -> None:
        # OctoPrint is HTTP-based; nothing to persist beyond credentials
        self.connected = True

    # --- Status ---
    async def get_status(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    async def get_print_status_raw(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    async def get_percentage(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    async def get_filament_info(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    # --- Controls ---
    async def home(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    async def pause(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    async def resume(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    async def cancel(self) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    async def send_gcode(self, gcode: str | list[str], gcode_check: bool = True) -> Mapping[str, Any]:
        return {"error": "not implemented"}

    @property
    def capabilities(self):
        return {
            "status": False,
            "percentage": False,
            "filament": False,
            "error_codes": False,
            "home": False,
            "pause": False,
            "resume": False,
            "cancel": False,
            "gcode": False,
            "jog_xy": False,
            "move_z": False,
        }
