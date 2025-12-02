from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from registry import PrinterRegistry

router = APIRouter(prefix="/api/printers", tags=["printers"])

# This will be set when the router is included in main.py
registry: PrinterRegistry = None

def set_registry(printer_registry: PrinterRegistry):
    global registry
    registry = printer_registry


@router.get("")
async def get_printers():
    """Get list of all printers with their basic info"""
    printers = []
    for pid, printer in registry.printers.items():
        printers.append({
            "id": pid,
            "name": printer.name,
            "type": printer.printer_type,
            "connected": printer.connected
        })
    return printers


@router.get("/{printer_id}/status")
async def get_printer_status(printer_id: str):
    """Get detailed status of a specific printer"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        status = await printer.get_status()
        return status
    except TimeoutError as e:
        print(f"⏱️ Timeout getting status for {printer_id}: {e}")
        return {
            "error": "timeout",
            "message": "Printer communication timed out",
            "printer_id": printer_id
        }
    except Exception as e:
        print(f"❌ Error getting status for {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{printer_id}/percentage")
async def get_printer_percentage(printer_id: str):
    """Get print progress percentage"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        percentage = await printer.get_percentage()
        return {"percentage": percentage}
    except TimeoutError as e:
        print(f"⏱️ Timeout getting percentage for {printer_id}: {e}")
        return {"percentage": 0, "error": "timeout"}
    except Exception as e:
        print(f"❌ Error getting percentage for {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{printer_id}/filamentinfo")
async def get_printer_filament(printer_id: str):
    """Get filament information"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        filament_info = await printer.get_filament_info()
        return filament_info
    except TimeoutError as e:
        print(f"⏱️ Timeout getting filament info for {printer_id}: {e}")
        return {"error": "timeout"}
    except Exception as e:
        print(f"❌ Error getting filament info for {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{printer_id}/connect")
async def connect_printer(printer_id: str):
    """Connect to a printer"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        await printer.connect()
        return {"status": "connected"}
    except TimeoutError as e:
        print(f"⏱️ Timeout connecting to {printer_id}: {e}")
        raise HTTPException(status_code=504, detail="Connection timeout")
    except Exception as e:
        print(f"❌ Error connecting to {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{printer_id}/disconnect")
async def disconnect_printer(printer_id: str):
    """Disconnect from a printer"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    try:
        await printer.disconnect()
        return {"status": "disconnected"}
    except Exception as e:
        print(f"❌ Error disconnecting from {printer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
