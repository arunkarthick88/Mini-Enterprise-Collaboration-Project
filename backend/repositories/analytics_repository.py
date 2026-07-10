from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Tuple
from models import Task, Project, Approval

class AnalyticsRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Analytics (Aggregated Data) ---
    def get_task_status_counts(self, tenant_id: int) -> List[Tuple[str, int]]:
        stmt = select(Task.status, func.count(Task.id)).where(Task.tenant_id == tenant_id).group_by(Task.status)
        return self.db.execute(stmt).all()

    def get_project_status_counts(self, tenant_id: int) -> List[Tuple[str, int]]:
        stmt = select(Project.status, func.count(Project.id)).where(Project.tenant_id == tenant_id).group_by(Project.status)
        return self.db.execute(stmt).all()

    def get_approval_status_counts(self, tenant_id: int) -> List[Tuple[str, int]]:
        stmt = select(Approval.status, func.count(Approval.id)).where(Approval.tenant_id == tenant_id).group_by(Approval.status)
        return self.db.execute(stmt).all()

    # --- Reporting (Raw Tabular Data) ---
    def get_tasks_for_report(self, tenant_id: int) -> List[Task]:
        stmt = select(Task).where(Task.tenant_id == tenant_id).order_by(Task.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def get_projects_for_report(self, tenant_id: int) -> List[Project]:
        stmt = select(Project).where(Project.tenant_id == tenant_id).order_by(Project.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())