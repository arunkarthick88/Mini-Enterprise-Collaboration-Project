from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from repositories.notification_repository import NotificationRepository
from models import NotificationRule
from schemas import NotificationRuleCreate, NotificationRuleUpdate

class NotificationService:
    def __init__(self, db: Session):
        self.repository = NotificationRepository(db)

    def create_rule(self, tenant_id: int, data: NotificationRuleCreate) -> NotificationRule:
        new_rule = NotificationRule(
            tenant_id=tenant_id,
            event_type=data.event_type,
            notification_type=data.notification_type,
            is_active=data.is_active
        )
        return self.repository.create_rule(new_rule)

    def list_rules(self, tenant_id: int) -> List[NotificationRule]:
        return self.repository.get_rules_by_tenant(tenant_id)

    def get_rule(self, rule_id: int, tenant_id: int) -> NotificationRule:
        rule = self.repository.get_rule_by_id(rule_id, tenant_id)
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Notification rule not found or access denied"
            )
        return rule

    def update_rule(self, rule_id: int, tenant_id: int, data: NotificationRuleUpdate) -> NotificationRule:
        rule = self.get_rule(rule_id, tenant_id)
        
        if data.notification_type is not None:
            rule.notification_type = data.notification_type
        if data.is_active is not None:
            rule.is_active = data.is_active
            
        return self.repository.update_rule(rule)

    def disable_rule(self, rule_id: int, tenant_id: int):
        rule = self.get_rule(rule_id, tenant_id)
        # We can either soft-delete (set is_active=False) or hard delete. 
        # For notification rules, hard deleting is usually fine, but let's soft disable for safety.
        rule.is_active = False
        self.repository.update_rule(rule)
        return {"message": "Notification rule disabled successfully"}