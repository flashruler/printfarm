from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from typing import Dict, Any, List
from uuid import uuid4
from datetime import datetime, timezone
import os
import base64

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# Job queue storage (in-memory for now)
job_queue: List[Dict[str, Any]] = []

# This will be set when the router is included in main.py
from registry import PrinterRegistry
registry: PrinterRegistry = None

def set_registry(printer_registry: PrinterRegistry):
    global registry
    registry = printer_registry


@router.get("")
async def get_jobs():
    """Get all jobs in the queue"""
    return job_queue


@router.post("")
async def create_job(file: UploadFile = File(...)):
    """Upload a new print job"""
    # Save the uploaded file
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_path = os.path.join(uploads_dir, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Create job entry
    job = {
        "id": str(uuid4()),
        "filename": file.filename,
        "file_path": file_path,
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "printer_id": None
    }
    
    job_queue.append(job)
    return job


@router.delete("/{job_id}")
async def delete_job(job_id: str):
    """Delete a job from the queue"""
    global job_queue
    
    job = next((j for j in job_queue if j["id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete the file if it exists
    if job.get("file_path") and os.path.exists(job["file_path"]):
        os.remove(job["file_path"])
    
    job_queue = [j for j in job_queue if j["id"] != job_id]
    return {"status": "deleted"}


@router.post("/{job_id}/assign/{printer_id}")
async def assign_job(job_id: str, printer_id: str):
    """Assign a job to a specific printer"""
    job = next((j for j in job_queue if j["id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job["printer_id"] = printer_id
    job["status"] = "assigned"
    return job


@router.get("/printer/{printer_id}/current-file")
async def get_current_file(printer_id: str):
    """Get the filename of the currently printing G-code file"""
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    # Check if printer supports this (Bambu only for now)
    if not hasattr(printer, 'get_current_gcode_file'):
        raise HTTPException(status_code=501, detail="This printer type does not support G-code file retrieval")
    
    try:
        result = await printer.get_current_gcode_file()
        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/printer/{printer_id}/thumbnail")
async def get_thumbnail(printer_id: str, filename: str = None):
    """Get thumbnail image from current or specified G-code file.
    
    Args:
        printer_id: ID of the printer
        filename: Optional filename. If not provided, uses current print file.
    
    Returns:
        PNG image response
    """
    import asyncio
    
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    # Check if printer supports this (Bambu only for now)
    if not hasattr(printer, 'get_gcode_thumbnail'):
        raise HTTPException(status_code=501, detail="This printer type does not support thumbnail extraction")
    
    try:
        # Add timeout to prevent hanging the server
        result = await asyncio.wait_for(
            printer.get_gcode_thumbnail(filename),
            timeout=15.0  # 15 second timeout
        )
        if 'error' in result:
            raise HTTPException(status_code=404, detail=result['error'])
        
        # Decode base64 and return as PNG image
        thumbnail_data = base64.b64decode(result['thumbnail'])
        return Response(content=thumbnail_data, media_type="image/png")
        
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Timeout fetching thumbnail")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/printer/{printer_id}/thumbnail/base64")
async def get_thumbnail_base64(printer_id: str, filename: str = None):
    """Get thumbnail as base64 JSON (useful for embedding in React).
    
    Args:
        printer_id: ID of the printer
        filename: Optional filename. If not provided, uses current print file.
    
    Returns:
        JSON with base64 data: {"thumbnail": "base64...", "size": "300x300", "format": "png"}
    """
    import asyncio
    
    printer = registry.get_printer(printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    # Check if printer supports this (Bambu only for now)
    if not hasattr(printer, 'get_gcode_thumbnail'):
        raise HTTPException(status_code=501, detail="This printer type does not support thumbnail extraction")
    
    try:
        print(f"📸 Fetching thumbnail for printer {printer_id}, filename: {filename}")
        # Add timeout to prevent hanging the server
        result = await asyncio.wait_for(
            printer.get_gcode_thumbnail(filename),
            timeout=60.0  # 60 second timeout (FTP can be slow for large files)
        )
        print(f"📸 Result: {list(result.keys())}")
        if 'error' in result:
            print(f"❌ Thumbnail error: {result['error']}")
            raise HTTPException(status_code=404, detail=result['error'])
        print(f"✅ Thumbnail fetched successfully, size: {result.get('size')}")
        return result
        
    except asyncio.TimeoutError:
        print(f"⏱️ Thumbnail fetch timeout for {printer_id}")
        raise HTTPException(status_code=504, detail="Timeout fetching thumbnail")
    except Exception as e:
        print(f"❌ Thumbnail exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))
