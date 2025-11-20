from __future__ import annotations

import aiohttp
from typing import Mapping, Any, Optional
from base64 import b64encode


class PrusaLinkAdapter:
    """Adapter for Prusa printers running PrusaLink firmware.
    
    Implements the PrinterAdapter protocol using PrusaLink's REST API.
    API docs: https://github.com/prusa3d/Prusa-Link-Web/blob/master/spec/openapi.yaml
    """
    
    type = "prusalink"

    def __init__(self, url: str, username: str = "maker", password: str = "", **kwargs):
        """Initialize PrusaLink adapter.
        
        Args:
            url: PrusaLink API base URL (e.g., "http://192.168.1.100")
            username: Username for digest auth (default: "maker")
            password: Password/API key for digest auth
            **kwargs: Additional config for persistence
        """
        self.url = url.rstrip("/")
        self.username = username
        self.password = password
        self.connected = False
        self._config = kwargs
        self._session: Optional[aiohttp.ClientSession] = None
        self._current_job_id: Optional[int] = None

    async def connect(self) -> None:
        """Establish connection and validate credentials."""
        if not self.connected:
            # Test connection with /api/version
            try:
                data = await self._api_request("GET", "/api/version")
                if data and "api" in data:
                    self.connected = True
            except Exception as e:
                raise ConnectionError(f"Failed to connect to PrusaLink: {e}")

    # --- Status Endpoints ---
    async def get_status(self) -> Mapping[str, Any]:
        """Return printer status with temperatures and state.
        
        Uses /api/v1/status endpoint.
        """
        try:
            await self.connect()
            data = await self._api_request("GET", "/api/v1/status")
            
            printer = data.get("printer", {})
            job = data.get("job", {})
            
            # Extract temperatures
            bed_temp = printer.get("temp_bed")
            target_bed = printer.get("target_bed")
            nozzle_temp = printer.get("temp_nozzle")
            target_nozzle = printer.get("target_nozzle")
            
            # Raw state from PrusaLink
            raw_state = printer.get("state", "UNKNOWN")
            
            # Normalize to standard phases
            phase = self._normalize_status(raw_state)
            
            # Check for errors
            has_error = raw_state == "ERROR" or raw_state == "ATTENTION"
            
            return {
                "bed_temperature": bed_temp,
                "target_bed_temperature": target_bed,
                "nozzle_temperatures": nozzle_temp,
                "target_nozzle_temperature": target_nozzle,
                "print_status": raw_state,
                "print_phase": phase,
                "print_error_code": None,  # PrusaLink doesn't provide numeric codes
                "has_error": has_error,
                "axis_x": printer.get("axis_x"),
                "axis_y": printer.get("axis_y"),
                "axis_z": printer.get("axis_z"),
                "flow": printer.get("flow"),
                "speed": printer.get("speed"),
                "fan_hotend": printer.get("fan_hotend"),
                "fan_print": printer.get("fan_print"),
            }
        except Exception as e:
            return {"error": str(e)}

    async def get_print_status_raw(self) -> Mapping[str, Any]:
        """Return raw status string from PrusaLink.
        
        Returns:
            {"print_status": str}  # IDLE, BUSY, PRINTING, PAUSED, FINISHED, STOPPED, ERROR, ATTENTION, READY
        """
        try:
            await self.connect()
            data = await self._api_request("GET", "/api/v1/status")
            printer = data.get("printer", {})
            return {"print_status": printer.get("state", "UNKNOWN")}
        except Exception as e:
            return {"error": str(e), "print_status": None}

    async def get_percentage(self) -> Mapping[str, Any]:
        """Return print progress percentage from current job.
        
        Uses /api/v1/job endpoint.
        """
        try:
            await self.connect()
            # PrusaLink returns 204 No Content if no active job
            data = await self._api_request("GET", "/api/v1/job", allow_204=True)
            if data is None:
                return {"print_percentage": None}
            
            progress = data.get("progress")
            if progress is not None:
                return {"print_percentage": int(round(float(progress)))}
            return {"print_percentage": None}
        except Exception as e:
            return {"error": str(e), "print_percentage": None}

    async def get_filament_info(self) -> Mapping[str, Any]:
        """Return loaded filament/material information.
        
        PrusaLink exposes filament type in job metadata if available.
        """
        try:
            await self.connect()
            data = await self._api_request("GET", "/api/v1/job", allow_204=True)
            if data is None:
                return {"tray_type": None, "raw": {}}
            
            # Check for filament type in metadata
            file_info = data.get("file", {})
            meta = file_info.get("meta", {})
            filament = meta.get("filament_type") or meta.get("material_name")
            
            return {"tray_type": filament, "raw": meta}
        except Exception as e:
            return {"error": str(e), "tray_type": None}

    # --- Control Endpoints ---
    async def home(self) -> Mapping[str, Any]:
        """Home all axes via G-code G28."""
        return await self.send_gcode("G28")

    async def pause(self) -> Mapping[str, Any]:
        """Pause current print job.
        
        Uses PUT /api/v1/job/{id}/pause
        """
        try:
            await self.connect()
            job_id = await self._get_current_job_id()
            if job_id is None:
                return {"error": "No active job to pause"}
            
            await self._api_request("PUT", f"/api/v1/job/{job_id}/pause", expect_204=True)
            return {"status": "success", "action": "pause"}
        except Exception as e:
            return {"error": str(e), "action": "pause"}

    async def resume(self) -> Mapping[str, Any]:
        """Resume paused print job.
        
        Uses PUT /api/v1/job/{id}/resume
        """
        try:
            await self.connect()
            job_id = await self._get_current_job_id()
            if job_id is None:
                return {"error": "No active job to resume"}
            
            await self._api_request("PUT", f"/api/v1/job/{job_id}/resume", expect_204=True)
            return {"status": "success", "action": "resume"}
        except Exception as e:
            return {"error": str(e), "action": "resume"}

    async def cancel(self) -> Mapping[str, Any]:
        """Cancel/stop current print job.
        
        Uses DELETE /api/v1/job/{id}
        """
        try:
            await self.connect()
            job_id = await self._get_current_job_id()
            if job_id is None:
                return {"error": "No active job to cancel"}
            
            await self._api_request("DELETE", f"/api/v1/job/{job_id}", expect_204=True)
            return {"status": "success", "action": "cancel"}
        except Exception as e:
            return {"error": str(e), "action": "cancel"}

    async def send_gcode(self, gcode: str | list[str], gcode_check: bool = True) -> Mapping[str, Any]:
        """Send raw G-code commands to printer.
        
        Note: PrusaLink doesn't have a direct G-code endpoint in the public API.
        This would require serial communication or alternative methods.
        For now, return not implemented.
        """
        # PrusaLink API doesn't expose a raw G-code endpoint like OctoPrint
        # You would need to use serial commands or upload a temporary .gcode file
        return {"error": "Direct G-code commands not supported by PrusaLink API"}

    @property
    def capabilities(self) -> Mapping[str, bool]:
        """Advertise which features this printer supports."""
        return {
            "status": True,
            "percentage": True,
            "filament": True,       # Available in job metadata
            "error_codes": False,   # PrusaLink uses text states, not numeric codes
            "home": False,          # No direct G-code endpoint
            "pause": True,
            "resume": True,
            "cancel": True,
            "gcode": False,         # No public G-code endpoint
            "jog_xy": False,        # Requires G-code support
            "move_z": False,        # Requires G-code support
        }

    # --- Helper Methods ---
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with digest auth."""
        if self._session is None or self._session.closed:
            # PrusaLink uses HTTP Digest Authentication
            auth = aiohttp.BasicAuth(self.username, self.password)
            self._session = aiohttp.ClientSession(auth=auth)
        return self._session

    async def _api_request(
        self,
        method: str,
        path: str,
        allow_204: bool = False,
        expect_204: bool = False,
        **kwargs
    ) -> Any:
        """Make authenticated HTTP request to PrusaLink API.
        
        Args:
            method: HTTP method (GET, PUT, POST, DELETE)
            path: API path (e.g., "/api/v1/status")
            allow_204: Return None on 204 No Content instead of raising
            expect_204: Expect 204 and return empty dict
            **kwargs: Additional aiohttp request parameters
        """
        session = await self._get_session()
        url = f"{self.url}{path}"
        
        async with session.request(method, url, **kwargs) as resp:
            if resp.status == 204:
                if expect_204 or allow_204:
                    return {} if expect_204 else None
                resp.raise_for_status()
            
            if resp.status == 401:
                raise PermissionError("Authentication failed. Check username/password.")
            
            resp.raise_for_status()
            
            # Try to parse JSON
            try:
                return await resp.json()
            except Exception:
                # Some endpoints return text
                return await resp.text()

    async def _get_current_job_id(self) -> Optional[int]:
        """Get the current job ID if a job is active."""
        try:
            data = await self._api_request("GET", "/api/v1/job", allow_204=True)
            if data is None:
                return None
            return data.get("id")
        except Exception:
            return None

    def _normalize_status(self, raw_status: str | None) -> str:
        """Normalize PrusaLink state to standard phases.
        
        PrusaLink states: IDLE, BUSY, PRINTING, PAUSED, FINISHED, STOPPED, ERROR, ATTENTION, READY
        """
        if not raw_status:
            return "unknown"
        
        state = raw_status.upper()
        
        if state == "PRINTING":
            return "printing"
        elif state in ("PAUSED",):
            return "paused"
        elif state in ("BUSY", "READY"):
            return "preparing"
        elif state in ("IDLE", "FINISHED", "STOPPED"):
            return "idle"
        elif state in ("ERROR", "ATTENTION"):
            return "error"
        
        return "unknown"

    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
