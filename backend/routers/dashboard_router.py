from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, auth, services

# --- NEW: Redis Cache Import ---
from fastapi_cache.decorator import cache

router = APIRouter(prefix="/dashboard", tags=["Dashboard Intelligence"])

@router.get("/ai-summary")
@cache(expire=60) # Caches the summary for 60 seconds
def get_ai_summary(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    
    # 1. Gather the User's Data Context
    if current_user.role == "admin":
        tasks = db.query(models.Task).all()
    elif current_user.role == "manager":
        tasks = db.query(models.Task).filter(
            (models.Task.created_by_id == current_user.id) | 
            (models.Task.assigned_to_id == current_user.id)
        ).all()
    else:
        tasks = db.query(models.Task).filter(models.Task.assigned_to_id == current_user.id).all()

    # Analyze task statuses
    pending_tasks = [t for t in tasks if t.status != "done"]
    high_priority_pending = [t for t in pending_tasks if t.priority == "high"]
    completed_tasks = [t for t in tasks if t.status == "done"]

    # 2. Generate the Dynamic AI Insight
    if len(high_priority_pending) > 0:
        insight = f"⚠️ Focus Required: You have {len(high_priority_pending)} high-priority tasks pending. We recommend tackling these immediately."
    elif len(pending_tasks) > 0:
        insight = f"✅ On Track: You have {len(pending_tasks)} active tasks, but none are high priority. Keep up the steady pace."
    elif len(completed_tasks) > 0:
        insight = "🎉 Excellent Work! All your assigned tasks are complete. Take a breather or assist a teammate."
    else:
        insight = "👋 Welcome! Your workspace is currently empty. No active tasks are assigned to you."

    # 3. Gather Dashboard Extras (Unread Notifications & Recent Activity)
    unread_notifs = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()

    if current_user.role == "admin":
        recent_logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(5).all()
    else:
        recent_logs = db.query(models.AuditLog).filter(models.AuditLog.user_id == current_user.id).order_by(models.AuditLog.timestamp.desc()).limit(5).all()

    # 4. Return the Unified Enterprise Intelligence Payload
    return {
        "ai_insight": insight,
        "metrics": {
            "total_tasks": len(tasks),
            "pending_tasks": len(pending_tasks),
            "high_priority": len(high_priority_pending),
            "completed": len(completed_tasks)
        },
        "unread_notifications": unread_notifs,
        "recent_activity": [
            {"action": log.action, "entity": log.entity, "time": log.timestamp} for log in recent_logs
        ]
    }

# --- PHASE 6: INTELLIGENT ANALYTICS ENDPOINT ---

@router.get("/ai-insights")
@cache(expire=300) # Caches insights for 5 minutes (less frequent change)
async def get_enterprise_insights(db: Session = Depends(get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    """
    Exposes advanced Phase 6 features: Delay Risk Detection and Smart Assignment.
    Only accessible by privileged roles.
    """
    critical_alerts = services.get_ai_task_insights(db)
    smart_assignment = services.get_smart_assignment_suggestions(db)
    
    return {
        "critical_alerts": critical_alerts,
        "smart_assignment": smart_assignment
    }