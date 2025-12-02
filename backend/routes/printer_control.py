from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from registry import PrinterRegistry

router = APIRouter(prefix="/api/printers", tags=["printer-control"])

# This will be set when the router is included in main.py
registry: PrinterRegistry = None

def set_registry(printer_registry: PrinterRegistry):
    global registry
    registry = printer_registry


class GCodeRequest(BaseModel):
    gcode: str


@router.post("/{printer_id}/gcode")
async def send_gcode(printer_id: str, request: GCodeRequest):
    """Send G-code command to printer"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        result = await printer.send_gcode(request.gcode)
        return result
    except TimeoutError as e:
        print(f"⏱️ Timeout sending gcode to {printer_id}: {e}")
        raise HTTPException(status_code=504, detail="Command timeout")
    except ValueError as e:
        # Safety check failed (not homed or printing)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Error sending gcode to {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{printer_id}/home")
async def home_printer(printer_id: str):
    """Home the printer"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        result = await printer.home()
        return result
    except TimeoutError as e:
        print(f"⏱️ Timeout homing {printer_id}: {e}")
        raise HTTPException(status_code=504, detail="Homing timeout")
    except Exception as e:
        print(f"❌ Error homing {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{printer_id}/pause")
async def pause_print(printer_id: str):
    """Pause current print"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        result = await printer.pause()
        return result
    except TimeoutError as e:
        print(f"⏱️ Timeout pausing {printer_id}: {e}")
        raise HTTPException(status_code=504, detail="Pause timeout")
    except Exception as e:
        print(f"❌ Error pausing {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{printer_id}/resume")
async def resume_print(printer_id: str):
    """Resume paused print"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        result = await printer.resume()
        return result
    except TimeoutError as e:
        print(f"⏱️ Timeout resuming {printer_id}: {e}")
        raise HTTPException(status_code=504, detail="Resume timeout")
    except Exception as e:
        print(f"❌ Error resuming {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{printer_id}/stop")
async def stop_print(printer_id: str):
    """Stop current print"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        result = await printer.stop()
        return result
    except TimeoutError as e:
        print(f"⏱️ Timeout stopping {printer_id}: {e}")
        raise HTTPException(status_code=504, detail="Stop timeout")
    except Exception as e:
        print(f"❌ Error stopping {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
