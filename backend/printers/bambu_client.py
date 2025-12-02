from bambulabs_api import Printer, PrintStatus
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
    type = "bambu"
    printer_type = "bambu"  # Add this for compatibility

    def __init__(self,ip:str,access_code:str, serial:str):
        # Persist credentials and identifiers for saving/serialization
        self.ip = ip
        self.access_code = access_code
        self.serial = serial
        self.name = f"Bambu {serial[-4:]}"  # Generate a name from serial
        self.client = Printer(ip, access_code, serial)
        self.connected = False
        self._homed_since_connect = False  # Track if printer has been homed since connection

    #connect to printer
    async def connect(self):
        if not self.connected:
            try:
                self.client.connect()
                self.connected = True
            except TimeoutError:
                print(f"⏱️ Timeout connecting to printer {self.serial}")
                self.connected = False
                raise

#gets status of bambulab printer, will eventually be phased out in favor of websocket implementation
    async def get_status(self):
        try:
            await self.connect()
            status = {}
            
            # Wrap each API call individually to isolate timeouts
            try:
                status['bed_temperature'] = self.client.get_bed_temperature()
            except (TimeoutError, Exception) as e:
                if isinstance(e, TimeoutError):
                    print(f"⏱️ Timeout getting bed temperature for {self.serial}")
                status['bed_temperature'] = None
            
            try:
                status['nozzle_temperatures'] = self.client.get_nozzle_temperature()
            except (TimeoutError, Exception) as e:
                if isinstance(e, TimeoutError):
                    print(f"⏱️ Timeout getting nozzle temperature for {self.serial}")
                status['nozzle_temperatures'] = None
            
            # Use get_print_status_raw to retrieve state
            raw_status_data = await self.get_print_status_raw()
            if 'error' not in raw_status_data:
                status['print_status'] = raw_status_data.get('print_status')
            else:
                status['print_status'] = None
            # Normalize phase for UI
            norm = _normalize_print_status_from_name(status.get('print_status'))
            status.update(norm)
            
            # Error code (0 means normal per API docs)
            try:
                err = self.client.print_error_code()
            except (TimeoutError, Exception) as e:
                if isinstance(e, TimeoutError):
                    print(f"⏱️ Timeout getting error code for {self.serial}")
                err = None
            status['print_error_code'] = err
            if isinstance(err, int) and err != 0:
                status['has_error'] = True
            else:
                status['has_error'] = False
            #status['current_state'] = self.client.get_current_state()
            return status
        except TimeoutError:
            print(f"⏱️ Timeout in get_status for {self.serial}")
            self.connected = False
            return {"error": "Timeout while fetching printer status"}
        except Exception as e:
            return {"error": str(e)}

    async def get_print_status_raw(self) -> dict:
        """Return the Bambu PrintStatus as a raw enum name string.

        Example: {"print_status": "PAUSED_CUTTER_ERROR"}
        
        Uses get_current_state() which returns PrintStatus enum, not get_state() which returns GcodeState.
        """
        try:
            await self.connect()
            # Use get_current_state() for PrintStatus enum (not get_state() which returns GcodeState)
            try:
                state = self.client.get_current_state()
            except TimeoutError:
                print(f"⏱️ Timeout calling get_current_state for {self.serial}")
                self.connected = False
                return {"error": "Timeout", "print_status": None}
            
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
        except TimeoutError:
            print(f"⏱️ Timeout getting print status for {self.serial}")
            self.connected = False
            return {"error": "Timeout", "print_status": None}
        except Exception as e:
            return {"error": str(e), "print_status": None}

#gets filament info of a bambulab printer
    async def get_filament_info(self):
        try:
            await self.connect()
            try:
                data = self.client.vt_tray()
            except TimeoutError:
                print(f"⏱️ Timeout calling vt_tray for {self.serial}")
                self.connected = False
                return {"error": "Timeout", "tray_type": None}
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
            try:
                data['nozzle_type'] = self.client.nozzle_type()
            except TimeoutError:
                print(f"⏱️ Timeout getting nozzle_type for {self.serial}")
                data['nozzle_type'] = None
            
            try:
                data['nozzle_diameter'] = self.client.nozzle_diameter()
            except TimeoutError:
                print(f"⏱️ Timeout getting nozzle_diameter for {self.serial}")
                data['nozzle_diameter'] = None
            return data
        except TimeoutError:
            print(f"⏱️ Timeout getting nozzle info for {self.serial}")
            self.connected = False
            return {"error": "Timeout", "nozzle_type": None, "nozzle_diameter": None}
        except Exception as e:
            return {"error": str(e), "nozzle_type": None, "nozzle_diameter": None}
        
#get percentage of print
    async def get_percentage(self):
        try:
            await self.connect()
            data = {}
            try:
                data['print_percentage'] = self.client.get_percentage()
            except TimeoutError:
                print(f"⏱️ Timeout calling get_percentage for {self.serial}")
                self.connected = False
                return {"error": "Timeout", "print_percentage": None}
            return data
        except TimeoutError:
            print(f"⏱️ Timeout getting percentage for {self.serial}")
            self.connected = False
            return {"error": "Timeout", "print_percentage": None}
        except Exception as e:
            return {"error": str(e), "print_percentage": None}
    # Home Printer
    async def home(self):
        try:
            await self.connect()
            try:
                result = self.client.home_printer()
            except TimeoutError:
                print(f"⏱️ Timeout calling home_printer for {self.serial}")
                self.connected = False
                return {"error": "Timeout while homing printer", "action": "home"}
            # Mark as homed if the command succeeded
            if result:
                self._homed_since_connect = True
            print(f"🏠 HOME: _homed_since_connect = {self._homed_since_connect}")
            return {"status": "success", "action": "home", "homed": self._homed_since_connect}
        except TimeoutError:
            print(f"⏱️ Timeout during home for {self.serial}")
            self.connected = False
            return {"error": "Timeout while homing printer", "action": "home"}
        except Exception as e:
            return {"error": str(e), "action": "home"}

    # Pause current print
    async def pause(self):
        try:
            await self.connect()
            try:
                self.client.pause_print()
            except TimeoutError:
                print(f"⏱️ Timeout calling pause_print for {self.serial}")
                self.connected = False
                return {"error": "Timeout while pausing print", "action": "pause"}
            return {"status": "success", "action": "pause"}
        except TimeoutError:
            print(f"⏱️ Timeout during pause for {self.serial}")
            self.connected = False
            return {"error": "Timeout while pausing print", "action": "pause"}
        except Exception as e:
            return {"error": str(e), "action": "pause"}

    # Resume paused print
    async def resume(self):
        try:
            await self.connect()
            try:
                self.client.resume_print()
            except TimeoutError:
                print(f"⏱️ Timeout calling resume_print for {self.serial}")
                self.connected = False
                return {"error": "Timeout while resuming print", "action": "resume"}
            return {"status": "success", "action": "resume"}
        except TimeoutError:
            print(f"⏱️ Timeout during resume for {self.serial}")
            self.connected = False
            return {"error": "Timeout while resuming print", "action": "resume"}
        except Exception as e:
            return {"error": str(e), "action": "resume"}

    # Cancel (stop) current print
    async def cancel(self):
        try:
            await self.connect()
            try:
                self.client.stop_print()
            except TimeoutError:
                print(f"⏱️ Timeout calling stop_print for {self.serial}")
                self.connected = False
                return {"error": "Timeout while canceling print", "action": "cancel"}
            return {"status": "success", "action": "cancel"}
        except TimeoutError:
            print(f"⏱️ Timeout during cancel for {self.serial}")
            self.connected = False
            return {"error": "Timeout while canceling print", "action": "cancel"}
        except Exception as e:
            return {"error": str(e), "action": "cancel"}
    
    # Raw G-code passthrough
    async def send_gcode(self, gcode: str | list[str], gcode_check: bool = True):
        try:
            await self.connect()
            
            print(f"🔍 SAFETY CHECK: _homed_since_connect = {self._homed_since_connect}")
            
            # Check if gcode contains movement commands
            gcode_str = gcode if isinstance(gcode, str) else '\n'.join(gcode)
            movement_commands = ['G0', 'G1', 'G2', 'G3']
            
            # Check if any line starts with a movement command
            has_movement = False
            for line in gcode_str.upper().split('\n'):
                line = line.strip()
                if any(line.startswith(cmd) for cmd in movement_commands):
                    has_movement = True
                    break
            
            if has_movement:
                print(f"⚠️ MOVEMENT DETECTED in G-code: {gcode_str[:100]}")
                
                # CRITICAL SAFETY #1: Block ALL manual movement unless printer is IDLE
                try:
                    raw_status = await self.get_print_status_raw()
                    status_name = raw_status.get('print_status')
                    print(f"📊 Printer status: {status_name}")
                    
                    # ONLY allow manual movement when printer is IDLE
                    # Block ALL other states including: PRINTING, preparing, calibrating, heating, etc.
                    if status_name != 'IDLE':
                        print(f"🚫 BLOCKED: Printer is not IDLE (status: {status_name})")
                        return {
                            "error": f"Cannot send manual movement commands while printer is {status_name}. Manual movement is only allowed when printer is IDLE.",
                            "blocked_reason": "not_idle",
                            "current_status": status_name
                        }
                except Exception as e:
                    print(f"⚠️ Status check failed: {e}")
                    # If we can't check status, be conservative and block
                    return {
                        "error": "Cannot verify printer status. Movement blocked for safety.",
                        "blocked_reason": "status_check_failed"
                    }
                
                # CRITICAL SAFETY #2: Require homing before manual movement
                if not self._homed_since_connect:
                    print("🛡️ BLOCKED: Not homed - returning error")
                    return {
                        "error": "Printer must be homed before movement commands. Please home the printer first.",
                        "requires_homing": True
                    }
            
            try:
                ok = self.client.gcode(gcode, gcode_check=gcode_check)
                print(f"✅ G-code sent successfully: {ok}")
                return {"ok": bool(ok)}
            except TimeoutError:
                print(f"⏱️ Timeout calling gcode() for {self.serial}")
                self.connected = False
                return {"error": "Timeout while sending G-code command", "ok": False}
        except TimeoutError:
            print(f"⏱️ Timeout sending G-code for {self.serial}")
            self.connected = False
            return {"error": "Timeout while sending G-code command", "ok": False}
        except Exception as e:
            print(f"❌ G-code error: {e}")
            return {"error": str(e), "ok": False}

    @property
    def capabilities(self):
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
            "jog_xy": True,  # via G-code G0/G1
            "move_z": True,   # via move_z_axis API or G-code
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
        
