from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth, database, services  # <-- Imported services

router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.post("/", response_model=schemas.ApprovalResponse)
def create_approval(approval: schemas.ApprovalCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_app = models.Approval(**approval.dict(), requested_by_id=current_user.id)
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    # --- PHASE 3: Audit & Notifications ---
    services.log_audit(db, current_user.id, "APPROVAL_REQUESTED", "Approval", new_app.id)
    services.create_notification(db, current_user.id, f"Your approval request '{new_app.title}' has been successfully submitted.")

    return new_app

@router.get("/", response_model=List[schemas.ApprovalResponse])
def get_approvals(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role == "admin":
        return db.query(models.Approval).all()
    elif current_user.role == "manager":
        return db.query(models.Approval).filter(
            (models.Approval.requested_by_id == current_user.id) | 
            (models.Approval.current_level == "manager")
        ).all()
    else: # Employee
        return db.query(models.Approval).filter(models.Approval.requested_by_id == current_user.id).all()

@router.patch("/{approval_id}/action", response_model=schemas.ApprovalResponse)
def take_approval_action(approval_id: int, action_data: schemas.ApprovalAction, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    approval = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
    if not approval: raise HTTPException(status_code=404, detail="Approval request not found")

    if action_data.action == "reject" and not action_data.comment:
        raise HTTPException(status_code=400, detail="A comment is strictly required when rejecting.")

    # Business Logic for Escalation
    if action_data.action == "approve":
        if approval.current_level == "manager":
            approval.current_level = "admin" # Escalate to Admin
        elif approval.current_level == "admin" and current_user.role == "admin":
            approval.status = "approved"
    else:
        approval.status = action_data.action # reject or hold

    # Record the approval history (Phase 2 feature)
    history = models.ApprovalHistory(
        approval_id=approval.id,
        action_by_id=current_user.id,
        action=action_data.action,
        comment=action_data.comment
    )
    db.add(history)
    db.commit()
    db.refresh(approval)

    # --- PHASE 3: Audit & Notifications ---
    # 1. Master Audit Trail
    services.log_audit(db, current_user.id, f"APPROVAL_{action_data.action.upper()}", "Approval", approval.id)

    # 2. Notify the requester
    if approval.requested_by_id != current_user.id:
        if action_data.action == "approve" and approval.status == "pending":
            msg = f"Your approval '{approval.title}' was approved by your manager and escalated to Admin."
        elif action_data.action == "approve" and approval.status == "approved":
            msg = f"Your approval '{approval.title}' was fully approved!"
        else:
            msg = f"Your approval '{approval.title}' was marked as {action_data.action}."
        
        services.create_notification(db, approval.requested_by_id, msg)

    return approval