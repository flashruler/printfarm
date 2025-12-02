from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
from registry import PrinterRegistry

router = APIRouter(tags=["websocket"])

# This will be set when the router is included in main.py
registry: PrinterRegistry = None

def set_registry(printer_registry: PrinterRegistry):
    global registry
    registry = printer_registry


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to websocket: {e}")


manager = ConnectionManager()


@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, client will receive broadcasts
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def broadcast_status(shutdown_event=None):
    """Background task that broadcasts printer status to all connected clients"""
    import time
    
    last_pct: dict[str, float | None] = {}
    # Track last known filament tray_type per printer so we only emit when it changes
    last_tray_type: dict[str, str | None] = {}
    # Throttle how often we query filament info per printer
    next_filament_check: dict[str, float] = {}
    FILAMENT_INTERVAL = 10.0  # seconds
    
    def extract_tray_type(payload: dict) -> str | None:
        """Best-effort extraction of a filament/material string from nested payload."""
        if not isinstance(payload, dict):
            return None
        # Direct obvious keys
        for k in ("tray_type", "material", "type", "trayType"):
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        # Scan nested values recursively (shallow first to avoid cost)
        for v in payload.values():
            if isinstance(v, dict):
                inner = extract_tray_type(v)
                if inner:
                    return inner
            elif isinstance(v, (list, tuple)):
                for item in v:
                    if isinstance(item, dict):
                        inner = extract_tray_type(item)
                        if inner:
                            return inner
                    elif isinstance(item, str) and item.strip():
                        return item.strip()
        return None
    
    while True:
        # Check if shutdown was requested
        if shutdown_event and shutdown_event.is_set():
            print("✅ WebSocket broadcaster stopped cleanly")
            break
        
        try:
            if registry.printers:
                # Initial prefetch: populate tray types immediately on first loop iteration
                if not next_filament_check:  # act as an 'initial' marker (empty dict means first pass)
                    for pid, printer in list(registry.printers.items()):
                        if hasattr(printer, "get_filament_info"):
                            try:
                                filament = await printer.get_filament_info() or {}
                                pre_tray = filament.get("tray_type")
                                if pre_tray is None and isinstance(filament.get("raw"), dict):
                                    pre_tray = extract_tray_type(filament.get("raw"))
                                if pre_tray:
                                    last_tray_type[pid] = pre_tray
                                next_filament_check[pid] = time.monotonic() + FILAMENT_INTERVAL
                            except Exception:
                                next_filament_check[pid] = time.monotonic() + FILAMENT_INTERVAL
                
                for pid, printer in list(registry.printers.items()):
                    try:
                        # Gather full status (temps + state)
                        status_payload = {}
                        if hasattr(printer, "get_status"):
                            try:
                                status_payload = await printer.get_status() or {}
                            except TimeoutError as e:
                                print(f"⏱️ Timeout getting status for {pid}: {e}")
                                status_payload = {"error": "Timeout", "has_error": True}
                            except Exception as e:
                                print(f"Error getting status for {pid}: {e}")
                                status_payload = {"error": str(e), "has_error": True}

                        # Percentage
                        pct_value = None
                        if hasattr(printer, "get_percentage"):
                            try:
                                pct_data = await printer.get_percentage()
                                pct_value = pct_data.get("print_percentage")
                            except (TimeoutError, Exception):
                                pct_value = None

                        rounded = None
                        if isinstance(pct_value, (int, float)):
                            rounded = int(round(float(pct_value)))
                        prev = last_pct.get(pid)
                        pct_changed = rounded != prev
                        if pct_changed:
                            last_pct[pid] = rounded

                        # Filament / material (tray_type) detection and change flag
                        tray_type = None
                        tray_type_changed = False
                        now = time.monotonic()
                        due = next_filament_check.get(pid, 0.0)
                        need_first_value = last_tray_type.get(pid) is None
                        if (now >= due or need_first_value) and hasattr(printer, "get_filament_info"):
                            try:
                                filament = await printer.get_filament_info() or {}
                                # Attempt direct keys first
                                tray_type = filament.get("tray_type")
                            except (TimeoutError, Exception):
                                tray_type = None
                            finally:
                                next_filament_check[pid] = now + FILAMENT_INTERVAL
                        prev_tray = last_tray_type.get(pid)
                        if tray_type and tray_type != prev_tray:
                            tray_type_changed = True
                            last_tray_type[pid] = tray_type
                        # Prefer to send last known non-null tray type to avoid null overwriting UI
                        tray_to_send = tray_type if tray_type is not None else prev_tray

                        # Broadcast unified update (status + percentage + tray_type)
                        try:
                            await manager.broadcast({
                                "type": "printer_update",
                                "printer_id": pid,
                                "percentage": rounded,
                                "percentage_changed": pct_changed,
                                "tray_type": tray_to_send,
                                "tray_type_changed": tray_type_changed,
                                "status": status_payload,
                            })
                        except Exception as e:
                            print(f"Error broadcasting update for {pid}: {e}")
                    except TimeoutError as e:
                        print(f"⏱️ TIMEOUT for printer {pid} operations: {e}")
                    except Exception as e:
                        print(f"❌ Error processing printer {pid}: {e}")
            
            await asyncio.sleep(1)  # Broadcast every second
        
        except TimeoutError as e:
            print(f"⏱️ UNCAUGHT TimeoutError in status broadcaster: {e}")
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Error in broadcast loop: {e}")
            await asyncio.sleep(1)
