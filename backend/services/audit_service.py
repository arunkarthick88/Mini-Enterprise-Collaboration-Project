from sqlalchemy.orm import Session
from typing import Optional, Dict
import math
from repositories.audit_repository import AuditRepository
from models import AuditLog

class AuditService:
    def __init__(self, db: Session):
        self.repository = AuditRepository(db)

    def log_action(
        self, 
        user_id: int, 
        action: str, 
        entity: str, 
        entity_id: int, 
        module_name: Optional[str] = None,
        action_type: Optional[str] = None,
        old_data: Optional[Dict] = None,
        new_data: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Helper method used internally by other services to log actions."""
        new_log = AuditLog(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            module_name=module_name,
            action_type=action_type,
            old_data=old_data,
            new_data=new_data,
            ip_address=ip_address,
            user_agent=user_agent
        )
        return self.repository.create_log(new_log)

    def get_paginated_logs(
        self, 
        page: int = 1, 
        size: int = 50, 
        user_id: Optional[int] = None,
        module_name: Optional[str] = None,
        action_type: Optional[str] = None
    ):
        """Fetches logs with pagination metadata for the frontend data tables."""
        skip = (page - 1) * size
        filters = {
            "user_id": user_id,
            "module_name": module_name,
            "action_type": action_type
        }
        
        items = self.repository.get_logs(skip=skip, limit=size, filters=filters)
        total_items = self.repository.get_total_count(filters=filters)
        total_pages = math.ceil(total_items / size) if size > 0 else 0
        
        return {
            "total_items": total_items,
            "total_pages": total_pages,
            "current_page": page,
            "items": items
        }