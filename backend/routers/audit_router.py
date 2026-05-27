from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit & Compliance"],
    responses={404: {"description": "Not found"}},
)

# Only Admins and Auditors should access these routes
def verify_audit_access(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role not in ["admin", "auditor", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
    return current_user

@router.get("/", response_model=List[schemas.AuditLogResponse])
def list_audit_logs(
    limit: int = 50, 
    skip: int = 0, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_audit_access)
):
    """List all audit logs with pagination."""
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

@router.get("/module/{module_name}", response_model=List[schemas.AuditLogResponse])
def filter_by_module(
    module_name: str, 
    limit: int = 50, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_audit_access)
):
    """Filter logs by specific modules (e.g., 'Task', 'Approval', 'SLA')."""
    return db.query(models.AuditLog).filter(
        models.AuditLog.module_name.ilike(f"%{module_name}%")
    ).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()

@router.get("/user/{user_id}", response_model=List[schemas.AuditLogResponse])
def filter_by_user(
    user_id: int, 
    limit: int = 50, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_audit_access)
):
    """Filter logs to see all actions performed by a specific user."""
    return db.query(models.AuditLog).filter(
        models.AuditLog.user_id == user_id
    ).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()

@router.get("/date-range", response_model=List[schemas.AuditLogResponse])
def filter_by_date_range(
    start_date: datetime, 
    end_date: datetime, 
    limit: int = 100,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_audit_access)
):
    """Filter logs within a specific date range."""
    return db.query(models.AuditLog).filter(
        models.AuditLog.timestamp >= start_date,
        models.AuditLog.timestamp <= end_date
    ).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()

@router.get("/{log_id}", response_model=schemas.AuditLogResponse)
def get_audit_log_details(
    log_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_audit_access)
):
    """View extreme details of a specific log (including old_data and new_data JSON)."""
    log = db.query(models.AuditLog).filter(models.AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log