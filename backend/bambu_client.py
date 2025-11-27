from bambulabs_api import Printer, PrintStatus
from typing import Any, Optional, Mapping
from printers.base import PrinterAdapter


def _to_plain(obj: Any) -> Any:
    """Recursively convert library objects (e.g., FilamentTray) to plain Python types for JSON."""
    # Already plain
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    if isinstance(obj, dict):
        return {k: _to_plain(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_to_plain(x) for x in obj]

    # Try common serialization methods
    for attr in ("dict", "model_dump", "to_dict", "as_dict"):
        if hasattr(obj, attr) and callable(getattr(obj, attr)):
            try:
                return _to_plain(getattr(obj, attr)())
            except Exception:
                pass

    # Fall back to __dict__ / vars
    try:
        return {k: _to_plain(v) for k, v in vars(obj).items() if not k.startswith("_")}
    except Exception:
        # As a last resort, return string representation
        try:
            return str(obj)
        except Exception:
            return None



# Bambulab printer class and associated methods
class BambuPrinter(PrinterAdapter):
    type = "bambu"
    
    def __init__(self, ip: str, access_code: str, serial: str):
        # Persist credentials and identifiers for saving/serialization
        self.ip = ip
        self.access_code = access_code
        self.serial = serial
        self.client = Printer(ip, access_code, serial)
        self.connected = False

    async def connect(self) -> None:
        """Establish connection to the printer."""
        if not self.connected:
            self.client.connect()
            self.connected = True

    async def get_status(self) -> Mapping[str, Any]:
        try:
            await self.connect()
            status = {}
            status['bed_temperature'] = self.client.get_bed_temperature()
            status['nozzle_temperatures'] = self.client.get_nozzle_temperature()
            
            # Use get_print_status_raw to retrieve state
            raw_status_data = await self.get_print_status_raw()
            if 'error' not in raw_status_data:
                status['print_status'] = raw_status_data.get('print_status')
            else:
                status['print_status'] = None
            
            # Error code (0 means normal per API docs)
            try:
                err = self.client.print_error_code()
            except Exception:
                err = None
            status['print_error_code'] = err
            if isinstance(err, int) and err != 0:
                status['has_error'] = True
            else:
                status['has_error'] = False
            #status['current_state'] = self.client.get_current_state()
            return status
        except Exception as e:
            return {"error": str(e)}

    async def get_print_status_raw(self) -> Mapping[str, Any]:
        """Return the Bambu PrintStatus as a raw enum name string.

        Example: {"print_status": "PAUSED_CUTTER_ERROR"}
        
        Uses get_current_state() which returns PrintStatus enum.
        """
        try:
            await self.connect()
            # Use get_current_state() for PrintStatus enum (not get_state() which returns GcodeState)
            state = self.client.get_current_state()
            
            # Handle PrintStatus enum
            if isinstance(state, PrintStatus):
                return {"print_status": state.name}
            
            # Handle objects with a name attribute
            if hasattr(state, 'name'):
                return {"print_status": str(state.name)}
            
            # Handle plain strings
            if isinstance(state, str):
                return {"print_status": state.upper()}
            
            return {"print_status": None}
        except Exception as e:
            return {"error": str(e), "print_status": None}

    async def get_filament_info(self) -> Mapping[str, Any]:
        try:
            await self.connect()
            data = self.client.vt_tray()
            plain = _to_plain(data)
            tray = None
            if isinstance(plain, dict):
                raw_tray = plain.get("tray_type") or plain.get("trayType")
                if isinstance(raw_tray, str) and raw_tray.strip():
                    tray = raw_tray.strip()
            # if tray is None:
            #     tray = _extract_tray_type(plain)
            # # If extraction failed but data is a list/dict with strings, attempt a broader heuristic here too
            # if tray is None and isinstance(plain, list):
            #     for item in plain:
            #         if isinstance(item, dict):
            #             tray = _extract_tray_type(item)
            #             if tray:
            #                 break
            #         elif isinstance(item, str) and item.strip():
            #             tray = item.strip()
            #             break
            # # Normalize common materials to uppercase for consistent UI
            # if isinstance(tray, str) and tray.strip():
            #     t = tray.strip()
            #     if t.upper() in {"PLA","PETG","ABS","ASA","TPU","PC","PA","PVA"}:
            #         tray = t.upper()
            #     else:
            #         tray = t
            return {"tray_type": tray, "raw": plain}
        except Exception as e:
            return {"error": str(e), "tray_type": None}
        
#gets nozzle type and diameter of a bambulab printer
    async def get_nozzle(self):
        try:
            await self.connect()
            data = {}
            data['nozzle_type'] = self.client.nozzle_type()
            data['nozzle_diameter'] = self.client.nozzle_diameter()
            return data
        except Exception as e:
            return {"error": str(e), "nozzle_temperatures": None}
        
    async def get_percentage(self) -> Mapping[str, Any]:
        """Return print progress percentage."""
        try:
            await self.connect()
            data = {}
            data['print_percentage'] = self.client.get_percentage()
            return data
        except Exception as e:
            return {"error": str(e), "print_percentage": None}
    
    async def home(self) -> Mapping[str, Any]:
        try:
            await self.connect()
            self.client.home_printer()
            return {"status": "success", "action": "home"}
        except Exception as e:
            return {"error": str(e), "action": "home"}

    async def pause(self) -> Mapping[str, Any]:
        """Pause current print."""
        try:
            await self.connect()
            self.client.pause_print()
            return {"status": "success", "action": "pause"}
        except Exception as e:
            return {"error": str(e), "action": "pause"}

    async def resume(self) -> Mapping[str, Any]:
        """Resume paused print."""
        try:
            await self.connect()
            self.client.resume_print()
            return {"status": "success", "action": "resume"}
        except Exception as e:
            return {"error": str(e), "action": "resume"}

    async def cancel(self) -> Mapping[str, Any]:
        """Cancel/stop current print."""
        try:
            await self.connect()
            self.client.stop_print()
            return {"status": "success", "action": "cancel"}
        except Exception as e:
            return {"error": str(e), "action": "cancel"}
    
    async def send_gcode(self, gcode: str | list[str], gcode_check: bool = True) -> Mapping[str, Any]:
        """Send raw G-code commands to printer."""
        try:
            await self.connect()
            result = self.client.gcode(gcode, gcode_check)
            return {"ok": result}
        except Exception as e:
            return {"error": str(e), "ok": False}
    
    @property
    def capabilities(self) -> Mapping[str, bool]:
        """Advertise feature support for Bambu printers."""
        return {
            "status": True,
            "percentage": True,
            "filament": True,
            "error_codes": True,
            "home": True,
            "pause": True,
            "resume": True,
            "cancel": True,
            "gcode": True,
            "jog_xy": False,  # Not directly supported via simple API
            "move_z": True,   # Can be done via gcode
        }
    

def _status_to_string(state: Any) -> Optional[str]:
    try:
        if isinstance(state, PrintStatus):
            return state.name
        if hasattr(state, 'name'):
            return str(state.name)
        if isinstance(state, str):
            return state.upper()
    except Exception:
        pass
    return None


def _normalize_print_status(state: Any) -> dict:
    raw = _status_to_string(state)
    return _normalize_print_status_from_name(raw)


def _normalize_print_status_from_name(raw: Optional[str]) -> dict:
    """Normalize a print status string name to phase and raw status."""
    phase = 'unknown'
    if raw is None:
        return {"print_status_raw": None, "print_phase": phase}

    prep = {
        "HEATBED_PREHEATING","HEATING_HOTEND","AUTO_BED_LEVELING","SWEEPING_XY_MECH_MODE",
        "HOMING_TOOLHEAD","INSPECTING_FIRST_LAYER","SCANNING_BED_SURFACE","IDENTIFYING_BUILD_PLATE_TYPE",
        "CLEANING_NOZZLE_TIP"
    }
    filament_ops = {"CHANGING_FILAMENT","FILAMENT_LOADING","FILAMENT_UNLOADING"}
    error_like = {
        "PAUSED_CUTTER_ERROR","PAUSED_FIRST_LAYER_ERROR","PAUSED_NOZZLE_CLOG",
        "PAUSED_NOZZLE_TEMPERATURE_MALFUNCTION","PAUSED_HEAT_BED_TEMPERATURE_MALFUNCTION",
        "PAUSED_CHAMBER_TEMPERATURE_CONTROL_ERROR","PAUSED_AMS_LOST"
    }

    if raw == "PRINTING":
        phase = "printing"
    elif raw in prep:
        phase = "preparing"
    elif raw.startswith("CALIBRATING"):
        phase = "calibrating"
    elif raw in filament_ops:
        phase = "filament_change"
    elif raw.startswith("PAUSED") or raw in {"M400_PAUSE"}:
        phase = "paused"
    elif raw in {"COOLING_CHAMBER"}:
        phase = "cooling"
    elif raw in error_like:
        phase = "error"
    elif raw == "IDLE":
        phase = "idle"

    return {"print_status_raw": raw, "print_phase": phase}
        
