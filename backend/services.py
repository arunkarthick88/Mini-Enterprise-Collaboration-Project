from sqlalchemy.orm import Session
import models

def log_audit(db: Session, user_id: int, action: str, entity: str, entity_id: int):
    """Reusable service to record system actions for the Admin Audit Trail."""
    new_log = models.AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id
    )
    db.add(new_log)
    db.commit()

def create_notification(db: Session, user_id: int, message: str):
    """Reusable service to trigger real-time alerts for users."""
    new_notif = models.Notification(
        user_id=user_id,
        message=message
    )
    db.add(new_notif)
    db.commit()