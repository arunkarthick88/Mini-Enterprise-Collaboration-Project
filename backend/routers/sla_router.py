from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/sla",
    tags=["SLA & Governance"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 1. SLA Rules Management
# ==========================================

@router.post("/rules", response_model=schemas.SLARuleResponse)
def create_sla_rule(
    rule: schemas.SLARuleCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin) # Only Admins can create SLA rules
):
    """Creates a new SLA Rule for a specific module and priority."""
    
    # Check if a rule for this module & priority already exists and is active
    existing = db.query(models.SLARule).filter(
        models.SLARule.module_name == rule.module_name,
        models.SLARule.priority == rule.priority,
        models.SLARule.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"An active SLA rule already exists for {rule.module_name} with {rule.priority} priority.")

    new_rule = models.SLARule(
        **rule.dict(),
        created_by=current_user.id
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@router.get("/rules", response_model=List[schemas.SLARuleResponse])
def list_sla_rules(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Lists all SLA rules."""
    # Anyone can view rules, but only admins create/edit them
    return db.query(models.SLARule).all()

@router.put("/rules/{rule_id}", response_model=schemas.SLARuleResponse)
def update_sla_rule(
    rule_id: int, 
    rule_update: schemas.SLARuleCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Updates an existing SLA rule."""
    rule = db.query(models.SLARule).filter(models.SLARule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="SLA Rule not found")
        
    for key, value in rule_update.dict().items():
        setattr(rule, key, value)
        
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/rules/{rule_id}")
def disable_sla_rule(
    rule_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Disables an SLA rule instead of hard-deleting it to preserve history."""
    rule = db.query(models.SLARule).filter(models.SLARule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="SLA Rule not found")
        
    rule.is_active = False
    db.commit()
    return {"message": "SLA Rule disabled successfully"}


# ==========================================
# 2. SLA Tracking Endpoints
# ==========================================

@router.get("/tracking/active", response_model=List[schemas.SLATrackingResponse])
def get_active_slas(
    module_name: str = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get all SLA records that are currently active (not breached, not completed)."""
    query = db.query(models.SLATracking).filter(models.SLATracking.status == "ACTIVE")
    if module_name:
        query = query.filter(models.SLATracking.module_name == module_name)
    return query.all()

@router.get("/tracking/breached", response_model=List[schemas.SLATrackingResponse])
def get_breached_slas(
    module_name: str = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get all SLA records that have breached their deadline."""
    query = db.query(models.SLATracking).filter(models.SLATracking.status == "BREACHED")
    if module_name:
        query = query.filter(models.SLATracking.module_name == module_name)
    return query.all()

@router.post("/tracking/evaluate")
def evaluate_all_slas(db: Session = Depends(get_db)):
    """
    CRON JOB ENDPOINT: 
    This should be called periodically by a background task/cron job to check 
    if any 'ACTIVE' SLAs have crossed their due_time and need to be marked 'BREACHED'.
    """
    now = datetime.utcnow()
    
    # Find active tracking records where the due time has passed
    breached_records = db.query(models.SLATracking).filter(
        models.SLATracking.status == "ACTIVE",
        models.SLATracking.due_time < now
    ).all()
    
    count = 0
    for record in breached_records:
        record.status = "BREACHED"
        record.breach_reason = "Time limit exceeded"
        
        # We also need to update the actual parent entity (Task or Approval)
        if record.module_name == "Task":
            task = db.query(models.Task).filter(models.Task.id == record.record_id).first()
            if task:
                task.sla_status = "BREACHED"
                task.is_sla_breached = True
        
        elif record.module_name == "Approval":
            approval = db.query(models.Approval).filter(models.Approval.id == record.record_id).first()
            if approval:
                approval.sla_status = "BREACHED"
        
        count += 1
        
    db.commit()
    return {"message": f"Evaluated SLAs. Marked {count} records as breached."}