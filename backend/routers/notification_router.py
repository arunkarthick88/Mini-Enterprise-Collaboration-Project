from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications & Preferences"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 1. Standard Inbox Endpoints
# ==========================================

@router.get("/", response_model=List[schemas.NotificationResponse] if hasattr(schemas, 'NotificationResponse') else list)
def get_my_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Gets all notifications for the current user."""
    return db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(models.Notification.created_at.desc()).all()

@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Marks a specific notification as read."""
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}


# ==========================================
# 2. Phase 9: Notification Preferences
# ==========================================

@router.get("/preferences/me", response_model=schemas.NotificationPreferenceResponse)
def get_my_preferences(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Fetches the user's current notification preferences. Creates defaults if none exist."""
    prefs = db.query(models.NotificationPreference).filter(models.NotificationPreference.user_id == current_user.id).first()
    
    # Auto-create default preferences if the user doesn't have them yet
    if not prefs:
        prefs = models.NotificationPreference(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
        
    return prefs

@router.put("/preferences/me", response_model=schemas.NotificationPreferenceResponse)
def update_my_preferences(
    prefs_update: schemas.NotificationPreferenceUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Updates the user's notification preferences."""
    prefs = db.query(models.NotificationPreference).filter(models.NotificationPreference.user_id == current_user.id).first()
    
    if not prefs:
        # Create if they somehow don't exist
        prefs = models.NotificationPreference(user_id=current_user.id)
        db.add(prefs)

    # Apply updates
    for key, value in prefs_update.dict().items():
        setattr(prefs, key, value)
        
    db.commit()
    db.refresh(prefs)
    return prefs