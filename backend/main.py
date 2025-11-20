from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
from registry import PrinterRegistry
import asyncio
from dotenv import load_dotenv
import time
import os
import sys
from typing import Any, Dict, List
from uuid import uuid4
from datetime import datetime, timezone

load_dotenv()

app = FastAPI()


# CORS setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


registry = PrinterRegistry()

# -------------------
# Print job store (simple JSON persistence)
# -------------------
JOBS_PATH = Path(__file__).parent / "prints.json"

class JobStore:
    def __init__(self, path: Path):
        self.path = path
        self.jobs: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.path.exists():
            try:
                import json
                self.jobs = json.loads(self.path.read_text())
            except Exception:
                self.jobs = []

    def _save(self):
        try:
            import json
            self.path.write_text(json.dumps(self.jobs, indent=2))
        except Exception:
            pass

    def add(self, job: Dict[str, Any]):
        # newest first
        self.jobs.insert(0, job)
        self._save()

    def list(self) -> List[Dict[str, Any]]:
        return list(self.jobs)

    def update(self, job_id: str, **fields):
        for j in self.jobs:
            if j.get("id") == job_id:
                j.update(fields)
                self._save()
                return j
        return None

job_store = JobStore(JOBS_PATH)

# -------------------
# WebSocket manager for live updates
# -------------------
class ConnectionManager:
    def __init__(self):
        self.active: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active.discard(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()
@app.on_event("startup")
async def startup_event():
    tasks = [p.connect() for p in registry.printers.values()]
    if tasks:
        await asyncio.gather(*tasks)

    # Start a background task that periodically pushes print percentages
    async def status_broadcaster():
        last_pct: dict[str, float | None] = {}
        # Track last known filament tray_type per printer so we only emit when it changes
        last_tray_type: dict[str, str | None] = {}
        # Throttle how often we query filament info per printer
        next_filament_check: dict[str, float] = {}
        FILAMENT_INTERVAL = 10.0  # seconds (slightly faster for more responsive material updates)
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
                        # Gather full status (temps + state)
                        status_payload = {}
                        if hasattr(printer, "get_status"):
                            try:
                                status_payload = await printer.get_status() or {}
                            except Exception as e:
                                status_payload = {"error": str(e)}

                        # Percentage
                        pct_value = None
                        if hasattr(printer, "get_percentage"):
                            try:
                                pct_data = await printer.get_percentage()
                                pct_value = pct_data.get("print_percentage")
                            except Exception:
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
                            except Exception:
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
                        await manager.broadcast({
                            "type": "printer_update",
                            "printer_id": pid,
                            "percentage": rounded,
                            "percentage_changed": pct_changed,
                            "tray_type": tray_to_send,
                            "tray_type_changed": tray_type_changed,
                            "status": status_payload,
                        })
                await asyncio.sleep(1)
            except Exception:
                # Prevent the loop from dying on transient errors
                await asyncio.sleep(1)

    asyncio.create_task(status_broadcaster())

# -------------------
# API routes
# -------------------
#API Status check
@app.get("/api/status")
async def api_status():
    return {"ok": True}

#returns all printers in registry
@app.get("/api/printers")
def list_printers():
    return [{"id": pid, "type": type(p).__name__} for pid, p in registry.printers.items()]

#adds a printer to registry
@app.post("/api/printers")
async def add_printer(payload: dict):
    pid = payload.get("id")
    if not pid:
        raise HTTPException(400, "Missing printer ID")
    if pid in registry.printers:
        raise HTTPException(400, "Printer already exists")
    data = registry.add_printer(pid, payload)
    printer = registry.printers[pid]
    if hasattr(printer, "connect"):
        await printer.connect()
    return data

#delete printer from registry
@app.delete("/api/printers/{printer_id}")
def remove_printer(printer_id: str):
    ok = registry.remove_printer(printer_id)
    if not ok:
        raise HTTPException(404, "Printer not found")
    return {"removed": printer_id}

#status check of a specific printer
@app.get("/api/printers/{printer_id}/status")
async def get_printer_status(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    # Assume printer exposes async get_status as in BambuPrinter
    if hasattr(printer, "get_status"):
        return await printer.get_status()
    raise HTTPException(400, "Printer does not support status retrieval")

# capability listing of a specific printer
@app.get("/api/printers/{printer_id}/capabilities")
async def get_printer_capabilities(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    caps = getattr(printer, "capabilities", None)
    if caps is None:
        # Fallback heuristic from available attributes
        caps = {
            "status": hasattr(printer, "get_status"),
            "percentage": hasattr(printer, "get_percentage"),
            "filament": hasattr(printer, "get_filament_info"),
            "home": hasattr(printer, "home"),
            "pause": hasattr(printer, "pause"),
            "resume": hasattr(printer, "resume"),
            "cancel": hasattr(printer, "cancel"),
            "gcode": hasattr(printer, "send_gcode"),
            "jog_xy": hasattr(printer, "send_gcode"),
            "move_z": hasattr(printer, "send_gcode"),
        }
    return caps

# raw PrintStatus name string (e.g., "PAUSED_CUTTER_ERROR")
@app.get("/api/printers/{printer_id}/status_raw")
async def get_printer_status_raw(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    if hasattr(printer, "get_print_status_raw"):
        return await printer.get_print_status_raw()
    raise HTTPException(400, "Printer does not support raw status retrieval")

# print percentage (REST fallback, still available if WS not used)
@app.get("/api/printers/{printer_id}/percentage")
async def get_printer_percentage(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    if hasattr(printer, "get_percentage"):
        return await printer.get_percentage()
    raise HTTPException(400, "Printer does not support percentage retrieval")

#filament info of a specific printer
@app.get("/api/printers/{printer_id}/filamentinfo")
async def api_filament_info(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    # Assume printer exposes async get_filament_info as in BambuPrinter
    if hasattr(printer, "get_filament_info"):
        return await printer.get_filament_info()
    raise HTTPException(400, "Printer does not support filament info retrieval")

# -------------------
# G-code upload + print, and history listing
# -------------------
@app.post("/api/printers/{printer_id}/upload")
def upload_and_print_gcode(printer_id: str, file: UploadFile = File(...)):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    if not file.filename.lower().endswith((".gcode", ".g", ".nc")):
        raise HTTPException(400, "Only G-code files are supported (.gcode/.g/.nc)")
    try:
        if not getattr(printer, "connected", False):
            printer.client.connect()
        uploaded_path = printer.client.upload_file(file.file, filename=file.filename)
        # Start the print. For G-code prints, pass the uploaded path as the 'plate_number' parameter.
        printer.client.start_print(filename=file.filename, plate_number=uploaded_path)
        job = {
            "id": str(uuid4()),
            "file_name": file.filename,
            "printer_id": printer_id,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "uploaded_path": uploaded_path,
            "status": "printing",
        }
        job_store.add(job)
        return job
    except Exception as e:
        raise HTTPException(500, f"Upload/print failed: {e}")


@app.get("/api/prints")
def list_print_history():
    items = []
    for j in job_store.list():
        jcopy = dict(j)
        pid = j.get("printer_id")
        printer = registry.printers.get(pid)
        if printer:
            try:
                pct = printer.client.get_percentage()
            except Exception:
                pct = None
            try:
                state = printer.client.get_state()
            except Exception:
                state = None
            jcopy["progress"] = pct
            jcopy["printer_state"] = state
        items.append(jcopy)
    return {"items": items}



#home printer
@app.post("/api/printers/{printer_id}/home")
async def home_printer(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    if hasattr(printer, "home"):
        result = await printer.home()
        # After homing, broadcast fresh status
        if hasattr(printer, "get_status"):
            try:
                status_payload = await printer.get_status() or {}
                await manager.broadcast({
                    "type": "printer_update",
                    "printer_id": printer_id,
                    "status": status_payload,
                    "percentage": None,
                    "percentage_changed": False,
                })
            except Exception:
                pass
        return result
    raise HTTPException(400, "Printer does not support homing")

#Pause printer
@app.post("/api/printers/{printer_id}/pause")
async def pause_print(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    if hasattr(printer, "pause"):
        result = await printer.pause()
        # Broadcast updated status reflecting pause
        if hasattr(printer, "get_status"):
            try:
                status_payload = await printer.get_status() or {}
                await manager.broadcast({
                    "type": "printer_update",
                    "printer_id": printer_id,
                    "status": status_payload,
                    "percentage": None,
                    "percentage_changed": False,
                })
            except Exception:
                pass
        return result
    raise HTTPException(400, "Printer does not support pausing")

#Resume printer
@app.post("/api/printers/{printer_id}/resume")
async def resume_print(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    if hasattr(printer, "resume"):
        result = await printer.resume()
        if hasattr(printer, "get_status"):
            try:
                status_payload = await printer.get_status() or {}
                await manager.broadcast({
                    "type": "printer_update",
                    "printer_id": printer_id,
                    "status": status_payload,
                    "percentage": None,
                    "percentage_changed": False,
                })
            except Exception:
                pass
        return result
    raise HTTPException(400, "Printer does not support resuming")

#Cancel printer
@app.post("/api/printers/{printer_id}/cancel")
async def cancel_print(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    if hasattr(printer, "cancel"):
        result = await printer.cancel()
        if hasattr(printer, "get_status"):
            try:
                status_payload = await printer.get_status() or {}
                await manager.broadcast({
                    "type": "printer_update",
                    "printer_id": printer_id,
                    "status": status_payload,
                    "percentage": None,
                    "percentage_changed": False,
                })
            except Exception:
                pass
        return result
    raise HTTPException(400, "Printer does not support canceling prints")


# -------------------
# Static frontend serving (supports Vite default 'dist' or 'build')
# -------------------
def _detect_frontend_root() -> Path | None:
    """Detect the built frontend root both in source tree and in PyInstaller bundle.

    Checks typical Vite folders (dist, build) under the project tree and within
    the PyInstaller extraction directory (sys._MEIPASS) if present.
    """
    candidates: list[Path] = []

    # Source tree paths
    project_root = Path(__file__).parent.parent
    src_frontend = project_root / "frontend"
    candidates += [src_frontend / "dist", src_frontend / "build"]

    # PyInstaller one-file/one-folder extraction paths
    base = getattr(sys, "_MEIPASS", None)
    if base:
        base_path = Path(base)
        candidates += [
            base_path / "frontend" / "dist",
            base_path / "frontend" / "build",
            base_path / "dist",
            base_path / "build",
        ]

    for p in candidates:
        try:
            if p.exists() and (p / "index.html").exists():
                return p
        except Exception:
            continue
    return None

frontend_dir = _detect_frontend_root()

def _ensure_frontend_mounts():
    global frontend_dir
    # Re-detect if not found yet (e.g., in packaged environments)
    if not frontend_dir or not (frontend_dir / "index.html").exists():
        frontend_dir = _detect_frontend_root()
    if frontend_dir and (frontend_dir / "index.html").exists():
        # Mount /static and /assets dynamically if present
        static_dir = frontend_dir / "static"
        assets_dir = frontend_dir / "assets"
        # FastAPI allows mounting after app creation; repeated mounts with same name raise, so guard by path
        try:
            if static_dir.exists():
                app.mount("/static", StaticFiles(directory=static_dir), name="static")
        except Exception:
            pass
        try:
            if assets_dir.exists():
                app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        except Exception:
            pass

# Attempt mounts at import time
_ensure_frontend_mounts()

@app.get("/{path:path}")
async def serve_react_app(path: str):
    # Re-check mounts and location on each request to be robust in packaged mode
    _ensure_frontend_mounts()
    if frontend_dir and (frontend_dir / "index.html").exists():
        return FileResponse(frontend_dir / "index.html")
    return {"detail": "Frontend not built"}

# WebSocket endpoint for streaming updates
@app.websocket("/api/ws")
async def ws_updates(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep connection open; we don't require client messages, but
        # we'll accept pings or any text to keep the socket alive.
        while True:
            try:
                await websocket.receive_text()
            except Exception:
                # If client doesn't send anything, just sleep to keep coroutine alive
                await asyncio.sleep(30)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)