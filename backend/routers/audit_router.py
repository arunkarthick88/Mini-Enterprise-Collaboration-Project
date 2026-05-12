from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user
router = APIRouter(prefix="/audit-logs", tags=["Audit"])

@router.get("/")
def get_audit_logs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Business Rule: Only admins can view the master audit log
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
    
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()
    return logs