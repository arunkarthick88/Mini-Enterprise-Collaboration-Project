from sqlalchemy.orm import Session
from typing import Dict, Any, List
from repositories.analytics_repository import AnalyticsRepository

class AnalyticsService:
    def __init__(self, db: Session):
        self.repository = AnalyticsRepository(db)

    # --- Analytics Dashboards ---
    def get_task_analytics(self, tenant_id: int) -> Dict[str, Any]:
        counts = self.repository.get_task_status_counts(tenant_id)
        total = sum(count for _, count in counts)
        return {
            "total_tasks": total,
            "status_breakdown": {status: count for status, count in counts}
        }

    def get_project_analytics(self, tenant_id: int) -> Dict[str, Any]:
        counts = self.repository.get_project_status_counts(tenant_id)
        total = sum(count for _, count in counts)
        return {
            "total_projects": total,
            "status_breakdown": {status: count for status, count in counts}
        }

    def get_approval_analytics(self, tenant_id: int) -> Dict[str, Any]:
        counts = self.repository.get_approval_status_counts(tenant_id)
        total = sum(count for _, count in counts)
        return {
            "total_approvals": total,
            "status_breakdown": {status: count for status, count in counts}
        }

    # --- Reporting Engine ---
    def generate_task_report(self, tenant_id: int) -> List[Dict[str, Any]]:
        tasks = self.repository.get_tasks_for_report(tenant_id)
        # Flatten the data for easy CSV export on the frontend
        return [{
            "Task ID": t.id,
            "Title": t.title,
            "Priority": t.priority,
            "Status": t.status,
            "Created At": t.created_at.isoformat() if t.created_at else None,
            "SLA Breached": "Yes" if t.is_sla_breached else "No"
        } for t in tasks]

    def generate_project_report(self, tenant_id: int) -> List[Dict[str, Any]]:
        projects = self.repository.get_projects_for_report(tenant_id)
        return [{
            "Project ID": p.id,
            "Name": p.name,
            "Status": p.status,
            "Priority": p.priority,
            "Start Date": p.start_date.isoformat() if p.start_date else "Not Set",
            "End Date": p.end_date.isoformat() if p.end_date else "Not Set"
        } for p in projects]