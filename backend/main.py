from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from registry import PrinterRegistry
import asyncio
from dotenv import load_dotenv
import os
import sys
import threading

# Import route modules
from routes import printers, printer_control, jobs, websocket

# Import plugin system
from core.event_bus import event_bus
from plugins import plugin_registry

load_dotenv()

# Install system-wide exception hooks to catch exceptions from threads
def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, TimeoutError):
        # Silently ignore TimeoutError from bambulabs_api threads
        return
    sys.__excepthook__(exc_type, exc_value, exc_traceback)

def handle_threading_exception(args):
    if args.exc_type is TimeoutError:
        # Silently ignore TimeoutError from bambulabs_api threads
        return
    sys.__excepthook__(args.exc_type, args.exc_value, args.exc_traceback)

sys.excepthook = handle_exception
threading.excepthook = handle_threading_exception

# Monkey-patch print to suppress bambulabs_api timeout messages
_original_print = print
def filtered_print(*args, **kwargs):
    message = ' '.join(str(arg) for arg in args)
    # Suppress the specific timeout exception messages from bambulabs_api
    if "Exception. Type: <class 'TimeoutError'>" in message or \
       "The read operation timed out" in message:
        return  # Silently ignore
    _original_print(*args, **kwargs)

# Monkey-patch stderr to suppress bambulabs_api timeout messages
import io

class FilteredStderr(io.TextIOBase):
    def __init__(self, original_stderr):
        self.original_stderr = original_stderr
        self.buffer = ""
    
    def write(self, text):
        # Buffer the text to check complete lines
        self.buffer += text
        
        # Process complete lines
        while '\n' in self.buffer:
            line, self.buffer = self.buffer.split('\n', 1)
            # Suppress timeout messages from bambulabs_api
            if "Exception. Type: <class 'TimeoutError'>" not in line and \
               "The read operation timed out" not in line:
                self.original_stderr.write(line + '\n')
        
        return len(text)
    
    def flush(self):
        # Write any remaining buffer
        if self.buffer:
            if "Exception. Type: <class 'TimeoutError'>" not in self.buffer and \
               "The read operation timed out" not in self.buffer:
                self.original_stderr.write(self.buffer)
            self.buffer = ""
        self.original_stderr.flush()

# Only apply filtering in production, not during debugging
if os.getenv("SUPPRESS_TIMEOUT_PRINTS", "true").lower() == "true":
    print = filtered_print
    sys.stderr = FilteredStderr(sys.stderr)

app = FastAPI()

# Global exception handler for TimeoutError
@app.exception_handler(TimeoutError)
async def timeout_exception_handler(request: Request, exc: TimeoutError):
    print(f"⏱️ UNCAUGHT TimeoutError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=504,
        content={"error": "Request timeout", "detail": str(exc)}
    )

# Add middleware to catch ALL exceptions including from background tasks
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except TimeoutError as e:
        print(f"⏱️ MIDDLEWARE caught TimeoutError on {request.url.path}: {e}")
        return JSONResponse(
            status_code=504,
            content={"error": "Request timeout", "detail": str(e)}
        )
    except Exception as e:
        print(f"❌ MIDDLEWARE caught Exception on {request.url.path}: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "detail": str(e)}
        )


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

# Initialize printer registry
registry = PrinterRegistry()

# Set registry for all route modules
printers.set_registry(registry)
printer_control.set_registry(registry)
jobs.set_registry(registry)
websocket.set_registry(registry)
websocket.set_event_bus(event_bus)

# Include routers
app.include_router(printers.router)
app.include_router(printer_control.router)
app.include_router(jobs.router)
app.include_router(websocket.router)

# Background task reference
broadcaster_task = None
shutdown_event = asyncio.Event()


@app.on_event("shutdown")
async def shutdown_event_handler():
    """Signal broadcaster to stop and wait for cleanup"""
    print("Shutdown signal received, stopping background tasks...")
    shutdown_event.set()
    if broadcaster_task:
        try:
            await asyncio.wait_for(broadcaster_task, timeout=2.0)
        except asyncio.TimeoutError:
            print("⏱️ Background task didn't stop in time, forcing shutdown")
            broadcaster_task.cancel()


@app.on_event("startup")
async def startup_event():
    global broadcaster_task
    
    # Load plugins
    print("🔌 Loading plugins...")
    await plugin_registry.load_plugins(app, registry, event_bus)
    print(f"✅ Loaded {len(plugin_registry.plugins)} plugin(s)")
    
    # Connect to all printers, but don't let connection failures block startup
    for pid, printer in registry.printers.items():
        try:
            await printer.connect()
            print(f"Connected to printer {pid}")
        except TimeoutError as e:
            print(f"Timeout connecting to printer {pid} at startup: {e}")
        except Exception as e:
            print(f"Error connecting to printer {pid} at startup: {e}")

    # Start the WebSocket broadcaster
    broadcaster_task = asyncio.create_task(websocket.broadcast_status(shutdown_event))
    print("🚀 Background status broadcaster started")


# Frontend serving
def _detect_frontend_root():
    """Detect the built frontend root"""
    candidates = []
    
    # Source tree paths
    project_root = Path(__file__).parent.parent
    src_frontend = project_root / "frontend"
    candidates += [src_frontend / "dist", src_frontend / "build"]
    
    # PyInstaller paths
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
    if not frontend_dir or not (frontend_dir / "index.html").exists():
        frontend_dir = _detect_frontend_root()
    if frontend_dir and (frontend_dir / "index.html").exists():
        static_dir = frontend_dir / "static"
        assets_dir = frontend_dir / "assets"
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


# Attempt mounts at startup
_ensure_frontend_mounts()


@app.get("/{path:path}")
async def serve_react_app(path: str):
    """Serve the React frontend"""
    _ensure_frontend_mounts()
    if frontend_dir and (frontend_dir / "index.html").exists():
        return FileResponse(frontend_dir / "index.html")
    return {"detail": "Frontend not built"}
