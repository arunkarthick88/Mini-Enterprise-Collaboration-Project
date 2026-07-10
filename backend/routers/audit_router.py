from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from auth import get_current_user
from services.audit_service import AuditService
from schemas import PaginatedAuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/", response_model=PaginatedAuditLogResponse)
def get_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Items per page"),
    user_id: Optional[int] = Query(None, description="Filter by User ID"),
    module_name: Optional[str] = Query(None, description="Filter by Module Name (e.g., Task, Project)"),
    action_type: Optional[str] = Query(None, description="Filter by Action Type (e.g., CREATE, UPDATE)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    audit_service = AuditService(db)
    # Note: In a production app, you might add a check here to ensure current_user has Admin privileges.
    return audit_service.get_paginated_logs(
        page=page,
        size=size,
        user_id=user_id,
        module_name=module_name,
        action_type=action_type
    )