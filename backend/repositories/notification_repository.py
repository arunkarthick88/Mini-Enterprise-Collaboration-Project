from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from models import NotificationRule

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_rule(self, rule: NotificationRule) -> NotificationRule:
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def get_rules_by_tenant(self, tenant_id: int) -> List[NotificationRule]:
        stmt = select(NotificationRule).where(NotificationRule.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())

    def get_rule_by_id(self, rule_id: int, tenant_id: int) -> Optional[NotificationRule]:
        stmt = select(NotificationRule).where(
            NotificationRule.id == rule_id,
            NotificationRule.tenant_id == tenant_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def update_rule(self, rule: NotificationRule) -> NotificationRule:
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def delete_rule(self, rule: NotificationRule):
        self.db.delete(rule)
        self.db.commit()