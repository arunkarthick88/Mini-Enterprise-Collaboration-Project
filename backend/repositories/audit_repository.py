from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from typing import List, Dict, Any
from models import AuditLog

class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_log(self, log: AuditLog) -> AuditLog:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_logs(self, skip: int = 0, limit: int = 50, filters: Dict[str, Any] = None) -> List[AuditLog]:
        stmt = select(AuditLog)
        
        if filters:
            if filters.get("user_id"):
                stmt = stmt.where(AuditLog.user_id == filters["user_id"])
            if filters.get("module_name"):
                stmt = stmt.where(AuditLog.module_name == filters["module_name"])
            if filters.get("action_type"):
                stmt = stmt.where(AuditLog.action_type == filters["action_type"])
                
        # Always order by newest first
        stmt = stmt.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def get_total_count(self, filters: Dict[str, Any] = None) -> int:
        stmt = select(func.count(AuditLog.id))
        
        if filters:
            if filters.get("user_id"):
                stmt = stmt.where(AuditLog.user_id == filters["user_id"])
            if filters.get("module_name"):
                stmt = stmt.where(AuditLog.module_name == filters["module_name"])
            if filters.get("action_type"):
                stmt = stmt.where(AuditLog.action_type == filters["action_type"])
                
        return self.db.execute(stmt).scalar()