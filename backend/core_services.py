from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models

# --- PHASE 3: AUDIT & NOTIFICATIONS ---

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


# --- PHASE 6: INTELLIGENT FEATURES (AI & ANALYTICS) ---

def get_ai_task_insights(db: Session):
    """
    Identifies high-priority pending tasks and detects delay risks.
    Logic: Tasks that are 'high' priority and created more than 3 days ago are flagged.
    """
    three_days_ago = datetime.utcnow() - timedelta(days=3)
    
    # Query tasks that are NOT done and meet the risk criteria
    risk_tasks = db.query(models.Task).filter(
        models.Task.status != "done",
        models.Task.priority == "high",
        models.Task.created_at <= three_days_ago
    ).all()
    
    insights = []
    for task in risk_tasks:
        insights.append(f"🚨 DELAY RISK: '{task.title}' is High Priority but has been stagnant for 3+ days.")
    
    # Catch-all insight if everything is on track
    if not insights:
        insights.append("✅ System Check: No critical high-priority delays detected currently.")
        
    return insights

def get_smart_assignment_suggestions(db: Session):
    """
    Calculates user workload based on the count of active (todo/in_progress) tasks.
    Returns a sorted list of users from 'Least Busy' to 'Most Busy'.
    """
    employees = db.query(models.User).filter(models.User.role == "employee").all()
    suggestions = []
    
    for emp in employees:
        # Count active tasks assigned to this user
        active_task_count = db.query(models.Task).filter(
            models.Task.assigned_to_id == emp.id,
            models.Task.status.in_(["todo", "in_progress"])
        ).count()
        
        # Determine availability status
        status = "Available" if active_task_count <= 2 else "Heavy Load"
        
        suggestions.append({
            "user_id": emp.id,
            "name": emp.name,
            "active_tasks": active_task_count,
            "status": status
        })
        
    # Sort by fewest tasks first (most available)
    return sorted(suggestions, key=lambda x: x['active_tasks'])