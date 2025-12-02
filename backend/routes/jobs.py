from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict, Any, List
from uuid import uuid4
from datetime import datetime, timezone
import os

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

# Job queue storage (in-memory for now)
job_queue: List[Dict[str, Any]] = []


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
