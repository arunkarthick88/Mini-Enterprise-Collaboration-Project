from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user
import math

router = APIRouter(prefix="/audit-logs", tags=["Audit"])

@router.get("/", response_model=schemas.PaginatedAuditLogResponse)
def get_audit_logs(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page")
):
    # Business Rule: Only admins can view the master audit log
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
    
    # 1. Count the total number of logs in the database
    total_items = db.query(models.AuditLog).count()
    
    # 2. Calculate pagination math
    total_pages = math.ceil(total_items / size) if total_items > 0 else 1
    offset = (page - 1) * size

    # 3. Fetch ONLY the specific chunk of logs for this page
    logs = db.query(models.AuditLog)\
        .order_by(models.AuditLog.timestamp.desc())\
        .offset(offset)\
        .limit(size)\
        .all()

    # 4. Return the structured paginated response
    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "current_page": page,
        "items": logs
    }