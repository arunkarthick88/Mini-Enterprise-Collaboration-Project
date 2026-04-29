from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth, database

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# --- TASK CRUD ---
@router.post("/", response_model=schemas.TaskResponse)
def create_task(task: schemas.TaskCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    new_task = models.Task(**task.dict(), created_by_id=current_user.id)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role == "admin":
        return db.query(models.Task).all()
    elif current_user.role == "manager":
        return db.query(models.Task).filter((models.Task.created_by_id == current_user.id) | (models.Task.assigned_to_id == current_user.id)).all()
    else: # Employee
        return db.query(models.Task).filter(models.Task.assigned_to_id == current_user.id).all()

@router.patch("/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, updates: schemas.TaskUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")

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
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == "manager" and task.created_by_id != current_user.id and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

# --- COMMENTS API ---
@router.post("/{task_id}/comments", response_model=schemas.CommentResponse)
def add_comment(task_id: int, comment: schemas.CommentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task: raise HTTPException(status_code=404, detail="Task not found")
    
    # Restrict internal notes to Managers/Admins
    if comment.is_internal and current_user.role == "employee":
        raise HTTPException(status_code=403, detail="Employees cannot create internal notes")

    new_comment = models.Comment(**comment.dict(), task_id=task_id, user_id=current_user.id)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@router.get("/{task_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Comment).filter(models.Comment.task_id == task_id)
    # Hide internal notes from standard employees
    if current_user.role == "employee":
        query = query.filter(models.Comment.is_internal == False)
    return query.all()