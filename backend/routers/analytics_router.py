from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from database import get_db
from auth import get_current_user
from services.analytics_service import AnalyticsService

# No prefix here so we can support both /analytics and /reports
router = APIRouter(tags=["Analytics & Reporting"])

# --- Analytics APIs ---
@router.get("/analytics/tasks", response_model=Dict[str, Any])
def get_task_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AnalyticsService(db)
    return service.get_task_analytics(current_user.tenant_id)

@router.get("/analytics/projects", response_model=Dict[str, Any])
def get_project_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AnalyticsService(db)
    return service.get_project_analytics(current_user.tenant_id)

@router.get("/analytics/approvals", response_model=Dict[str, Any])
def get_approval_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = AnalyticsService(db)
    return service.get_approval_analytics(current_user.tenant_id)

# --- Reporting APIs ---
@router.get("/reports/tasks", response_model=List[Dict[str, Any]])
def get_task_report(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Returns a flat JSON array of Tasks perfectly formatted for CSV export on the frontend."""
    service = AnalyticsService(db)
    return service.generate_task_report(current_user.tenant_id)

@router.get("/reports/projects", response_model=List[Dict[str, Any]])
def get_project_report(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Returns a flat JSON array of Projects perfectly formatted for CSV export on the frontend."""
    service = AnalyticsService(db)
    return service.generate_project_report(current_user.tenant_id)