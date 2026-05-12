from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
import models, database, auth, services

router = APIRouter(prefix="/documents", tags=["Documents"])

# Ensure the upload directory exists
UPLOAD_DIR = "task_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- SECURITY: Allowed file extensions ---
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".txt", ".csv", ".xlsx"}

@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    task_id: Optional[int] = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # --- NEW SECURITY CHECK ---
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed for security reasons.")

    # 1. Handle Versioning
    # Check if a file with this name already exists for this task
    existing_docs = db.query(models.Document).filter(
        models.Document.file_name == file.filename,
        models.Document.task_id == task_id
    ).order_by(models.Document.version.desc()).all()
    
    version = 1
    if existing_docs:
        version = existing_docs[0].version + 1 # Increment version

    # 2. Save the file to disk safely
    # We append the version to the physical filename so it doesn't overwrite old files
    safe_filename = f"v{version}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 3. Save to Database
    new_doc = models.Document(
        file_name=file.filename,
        file_path=file_path,
        version=version,
        uploaded_by=current_user.id,
        task_id=task_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 4. Create Audit Log & Notification
    services.log_audit(db, current_user.id, "DOCUMENT_UPLOADED", "Document", new_doc.id)
    
    if task_id:
        task = db.query(models.Task).filter(models.Task.id == task_id).first()
        if task and task.assigned_to_id and task.assigned_to_id != current_user.id:
            services.create_notification(db, task.assigned_to_id, f"New document uploaded to your task: {file.filename}")

    return {"message": "File uploaded successfully", "document_id": new_doc.id, "version": version}

@router.get("/task/{task_id}")
def get_task_documents(task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Returns all documents attached to a specific task
    docs = db.query(models.Document).filter(models.Document.task_id == task_id).order_by(models.Document.created_at.desc()).all()
    return docs

@router.get("/{doc_id}/download")
def download_document(doc_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Look up the document in the DB
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check if file actually exists on disk
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File missing from server")
        
    # Return the file as a downloadable response
    return FileResponse(path=doc.file_path, filename=doc.file_name)