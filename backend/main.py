from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
from bambu_client import BambuPrinter
from registry import PrinterRegistry
import asyncio
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

# -------------------
# CORS setup
# -------------------
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

BAMBU_IP = os.getenv("BAMBU_A1_IP")
BAMBU_CODE = os.getenv("BAMBU_A1_ACCESS_CODE")
BAMBU_SERIAL = os.getenv("BAMBU_A1_SERIAL")

bambu_printer = BambuPrinter(BAMBU_IP, BAMBU_CODE, BAMBU_SERIAL)
registry = PrinterRegistry()

@app.on_event("startup")
async def startup_event():
    tasks = [p.connect() for p in registry.printers.values()]
    if tasks:
        await asyncio.gather(*tasks)

# -------------------
# API routes
# -------------------
@app.get("/api/status")
async def api_status():
    return {"ok": True}
@app.get("/api/printers")
def list_printers():
    return [{"id": pid, "type": type(p).__name__} for pid, p in registry.printers.items()]
@app.get("/api/printer/status")
async def api_printer_status():
    return await bambu_printer.get_status()
@app.post("/api/printers")
async def add_printer(payload: dict):
    """Add a printer dynamically."""
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

@app.delete("/api/printers/{printer_id}")
def remove_printer(printer_id: str):
    ok = registry.remove_printer(printer_id)
    if not ok:
        raise HTTPException(404, "Printer not found")
    return {"removed": printer_id}


@app.get("/api/printers/{printer_id}/status")
async def get_printer_status(printer_id: str):
    printer = registry.printers.get(printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    # Assume printer exposes async get_status as in BambuPrinter
    if hasattr(printer, "get_status"):
        return await printer.get_status()
    raise HTTPException(400, "Printer does not support status retrieval")
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
# Static frontend serving
# -------------------
frontend_dir = Path(__file__).parent.parent / "frontend" / "build"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=frontend_dir / "static"), name="static")

@app.get("/{path:path}")
async def serve_react_app(path: str):
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"detail": "Frontend not built"}