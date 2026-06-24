from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import datetime
import models, schemas, auth, database, services

# --- PHASE 5: WebSocket Manager ---
from websocket_manager import manager

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# --- Setup File Upload Directory (Bypass Windows Conflict) ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR_STR = os.path.join(BASE_DIR, "storage", "task_documents")

try:
    os.makedirs(UPLOAD_DIR_STR, exist_ok=True)
except Exception as e:
    print(f"Warning: Could not create storage directory: {e}")


# ==========================================
# 1. TASK CRUD (Phases 1-9)
# ==========================================

@router.post("/", response_model=schemas.TaskResponse)
async def create_task(
    task: schemas.TaskCreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.role_required(["admin", "manager"]))
):
    # Ensure task is tied to the user's organization
    new_task = models.Task(
        **task.dict(), 
        created_by_id=current_user.id,
        tenant_id=current_user.tenant_id # <-- PHASE 10A addition
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # --- PHASE 3: Audit & Notifications ---
    services.log_audit(db, current_user.id, "TASK_CREATED", "Task", new_task.id)
    if new_task.assigned_to_id and new_task.assigned_to_id != current_user.id:
        services.create_notification(db, new_task.assigned_to_id, f"You have been assigned a new task: {new_task.title}")
        
        # --- PHASE 5: Live Notification ---
        await manager.send_personal_message({
            "type": "NOTIFICATION",
            "message": f"New Task Assigned: {new_task.title}",
            "task_id": new_task.id
        }, user_id=new_task.assigned_to_id)

    # --- PHASE 5: Live Kanban Update ---
    await manager.broadcast({"type": "KANBAN_UPDATE"})

    return new_task

@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    PHASE 7 FIX: Multi-Tenant Filter.
    Users only see tasks within their organization.
    """
    # Start the query filtered by organization_id
    # We join with User to ensure we only get tasks where the creator is in the same org
    query = db.query(models.Task).join(models.User, models.Task.created_by_id == models.User.id)\
              .filter(models.User.organization_id == current_user.organization_id)

    if current_user.role == "admin":
        return query.all()
    elif current_user.role == "manager":
        return query.filter((models.Task.created_by_id == current_user.id) | (models.Task.assigned_to_id == current_user.id)).all()
    else: # Employee
        return query.filter(models.Task.assigned_to_id == current_user.id).all()

@router.patch("/{task_id}", response_model=schemas.TaskResponse)
async def update_task(
    task_id: int, 
    updates: schemas.TaskUpdate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify the task exists AND belongs to the user's organization
    task = db.query(models.Task).join(models.User, models.Task.created_by_id == models.User.id)\
             .filter(models.Task.id == task_id, models.User.organization_id == current_user.organization_id).first()
    
    if not task: 
        raise HTTPException(status_code=404, detail="Task not found or access denied")

    # Track old state to know what changed
    old_status = task.status
    old_assignee = task.assigned_to_id

    # Kanban Strict Transition Rules
    valid_transitions = {
        "todo": ["in_progress"],
        "in_progress": ["review", "todo"],
        "review": ["done", "in_progress"],
        "done": ["review"]
    }

    if updates.status and updates.status != task.status:
        if updates.status not in valid_transitions.get(task.status, []):
            raise HTTPException(status_code=400, detail=f"Invalid transition from {task.status} to {updates.status}")

    # Access Control
    if current_user.role == "employee":
        if task.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not assigned to you")
        if updates.assigned_to_id or updates.priority:
            raise HTTPException(status_code=403, detail="Employees can only update status")
            
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)

    # --- PHASE 3: Audit & Notifications ---
    services.log_audit(db, current_user.id, "TASK_UPDATED", "Task", task.id)
    
    if updates.status and old_status != task.status and task.created_by_id != current_user.id:
        msg = f"Task '{task.title}' moved to {task.status}"
        services.create_notification(db, task.created_by_id, msg)
        await manager.send_personal_message({"type": "NOTIFICATION", "message": msg}, user_id=task.created_by_id)
        
    if updates.assigned_to_id and old_assignee != task.assigned_to_id and task.assigned_to_id != current_user.id:
        msg = f"You were reassigned to task: {task.title}"
        services.create_notification(db, task.assigned_to_id, msg)
        await manager.send_personal_message({"type": "NOTIFICATION", "message": msg}, user_id=task.assigned_to_id)

    # --- PHASE 5: Live Kanban Update ---
    await manager.broadcast({"type": "KANBAN_UPDATE"})

    return task

@router.delete("/{task_id}")
async def delete_task(
    task_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.role_required(["admin", "manager"]))
):
    task = db.query(models.Task).join(models.User, models.Task.created_by_id == models.User.id)\
             .filter(models.Task.id == task_id, models.User.organization_id == current_user.organization_id).first()
    
    if not task: 
        raise HTTPException(status_code=404, detail="Task not found or access denied")
        
    if current_user.role == "manager" and task.created_by_id != current_user.id and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    db.delete(task)
    db.commit()

    services.log_audit(db, current_user.id, "TASK_DELETED", "Task", task_id)
    await manager.broadcast({"type": "KANBAN_UPDATE"})

    return {"message": "Task deleted successfully"}


# ==========================================
# 2. COMMENTS API
# ==========================================

@router.post("/{task_id}/comments", response_model=schemas.CommentResponse)
async def add_comment(task_id: int, comment: schemas.CommentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    task = db.query(models.Task).join(models.User, models.Task.created_by_id == models.User.id)\
             .filter(models.Task.id == task_id, models.User.organization_id == current_user.organization_id).first()
             
    if not task: 
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    
    if comment.is_internal and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Employees cannot create internal notes")

    new_comment = models.Comment(**comment.dict(), task_id=task_id, user_id=current_user.id)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    services.log_audit(db, current_user.id, "COMMENT_ADDED", "Task", task.id)
    
    if task.assigned_to_id and task.assigned_to_id != current_user.id:
        msg = f"New comment on your task: {task.title}"
        services.create_notification(db, task.assigned_to_id, msg)
        await manager.send_personal_message({"type": "NOTIFICATION", "message": msg}, user_id=task.assigned_to_id)
    elif task.created_by_id != current_user.id:
        msg = f"New comment on a task you created: {task.title}"
        services.create_notification(db, task.created_by_id, msg)
        await manager.send_personal_message({"type": "NOTIFICATION", "message": msg}, user_id=task.created_by_id)

    return new_comment

@router.get("/{task_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Ensure comments are only retrieved for tasks within the organization
    query = db.query(models.Comment).join(models.Task).join(models.User, models.Task.created_by_id == models.User.id)\
              .filter(models.Comment.task_id == task_id, models.User.organization_id == current_user.organization_id)
              
    if current_user.role == "employee":
        query = query.filter(models.Comment.is_internal == False)
        
    return query.all()


# ==========================================
# 3. PHASE 10B: TASK DOCUMENTS API
# ==========================================

@router.post("/{task_id}/documents", response_model=schemas.TaskDocumentResponse)
async def upload_task_document(
    task_id: int, 
    file: UploadFile = File(...), 
    document_type: str = Form("REFERENCE"), 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Save file locally
    file_location = os.path.join(UPLOAD_DIR_STR, f"{task_id}_{datetime.datetime.utcnow().timestamp()}_{file.filename}")
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    file_size = os.path.getsize(file_location)

    new_doc = models.TaskDocument(
        tenant_id=current_user.tenant_id,
        task_id=task_id,
        file_name=file.filename,
        file_path=file_location,
        file_size=file_size,
        mime_type=file.content_type,
        uploaded_by=current_user.id,
        document_type=document_type
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    services.log_audit(db, current_user.id, "TASK_DOCUMENT_UPLOADED", "TaskDocument", new_doc.id)
    return new_doc

@router.get("/{task_id}/documents", response_model=List[schemas.TaskDocumentResponse])
def get_task_documents(task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # In a full enterprise app, verify user has access to this specific task first
    return db.query(models.TaskDocument).filter(models.TaskDocument.task_id == task_id).all()

@router.get("/documents/{document_id}/download")
def download_task_document(document_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    document = db.query(models.TaskDocument).filter(models.TaskDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File missing from server")
        
    return FileResponse(path=document.file_path, filename=document.file_name, media_type=document.mime_type)

@router.delete("/documents/{document_id}")
def delete_task_document(document_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    document = db.query(models.TaskDocument).filter(models.TaskDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Remove file from disk
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
        
    db.delete(document)
    db.commit()
    services.log_audit(db, current_user.id, "TASK_DOCUMENT_DELETED", "TaskDocument", document_id)
    return {"message": "Document successfully deleted"}