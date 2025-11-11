from bambulabs_api import Printer
from typing import Any, Optional


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
class BambuPrinter:
    def __init__(self,ip:str,access_code:str, serial:str):
        # Persist credentials and identifiers for saving/serialization
        self.ip = ip
        self.access_code = access_code
        self.serial = serial
        self.client = Printer(ip, access_code, serial)
        self.connected = False

    #connect to printer
    async def connect(self):
        if not self.connected:
            self.client.connect()
            self.connected = True

#gets status of bambulab printer, will eventually be phased out in favor of websocket implementation
    async def get_status(self):
        try:
            await self.connect()
            status = {}
            status['bed_temperature'] = self.client.get_bed_temperature()
            status['nozzle_temperatures'] = self.client.get_nozzle_temperature()
            status['print_status'] = self.client.get_state()
            #status['current_state'] = self.client.get_current_state()
            return status
        except Exception as e:
            return {"error": str(e)}

#gets filament info of a bambulab printer
    async def get_filament_info(self):
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
        
#get percentage of print
    async def get_percentage(self):
        try:
            await self.connect()
            data = {}
            data['print_percentage'] = self.client.get_percentage()
            return data
        except Exception as e:
            return {"error": str(e), "print_percentage": None}