from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth, database

router = APIRouter(prefix="/tasks", tags=["Tasks"])

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

    # Access Control Logic
    if current_user.role == "employee":
        if task.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not assigned to you")
        if updates.assigned_to_id or updates.priority: # Employees can only update status
            raise HTTPException(status_code=403, detail="Employees can only update status")
            
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task: 
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Manager restriction: Managers can only delete tasks they created or are assigned to
    if current_user.role == "manager" and task.created_by_id != current_user.id and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}