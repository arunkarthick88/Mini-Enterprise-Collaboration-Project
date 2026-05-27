from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    tags=["Workflow Governance"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 1. Approval Escalations
# ==========================================

@router.post("/approval-escalations", response_model=schemas.ApprovalEscalationResponse)
def create_escalation(
    escalation: schemas.ApprovalEscalationCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Escalates a delayed approval to a new user."""
    approval = db.query(models.Approval).filter(models.Approval.id == escalation.approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    # Create the escalation record
    new_escalation = models.ApprovalEscalation(
        approval_id=approval.id,
        escalated_from=current_user.id,
        escalated_to=escalation.escalated_to,
        reason=escalation.reason,
        status="PENDING"
    )
    db.add(new_escalation)
    
    # Update the actual Approval record
    approval.is_escalated = True
    approval.current_escalation_to = escalation.escalated_to
    
    db.commit()
    db.refresh(new_escalation)
    return new_escalation

@router.get("/approval-escalations", response_model=List[schemas.ApprovalEscalationResponse])
def get_all_escalations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ApprovalEscalation).all()

@router.get("/approval-escalations/pending", response_model=List[schemas.ApprovalEscalationResponse])
def get_pending_escalations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ApprovalEscalation).filter(models.ApprovalEscalation.status == "PENDING").all()

@router.get("/approval-escalations/approval/{approval_id}", response_model=List[schemas.ApprovalEscalationResponse])
def get_escalation_history(approval_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ApprovalEscalation).filter(models.ApprovalEscalation.approval_id == approval_id).all()

@router.put("/approval-escalations/{escalation_id}/resolve")
def resolve_escalation(escalation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Marks an escalation as resolved."""
    escalation = db.query(models.ApprovalEscalation).filter(models.ApprovalEscalation.id == escalation_id).first()
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
        
    escalation.status = "RESOLVED"
    escalation.resolved_at = datetime.utcnow()
    
    # Remove the escalation flag from the main approval
    approval = db.query(models.Approval).filter(models.Approval.id == escalation.approval_id).first()
    if approval:
        approval.is_escalated = False
        approval.current_escalation_to = None
        
    db.commit()
    return {"message": "Escalation resolved successfully"}

@router.put("/approval-escalations/{escalation_id}/cancel")
def cancel_escalation(escalation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Cancels an active escalation."""
    escalation = db.query(models.ApprovalEscalation).filter(models.ApprovalEscalation.id == escalation_id).first()
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
        
    escalation.status = "CANCELLED"
    db.commit()
    return {"message": "Escalation cancelled"}


# ==========================================
# 2. Approval Delegations
# ==========================================

@router.post("/approval-delegations", response_model=schemas.ApprovalDelegationResponse)
def create_delegation(
    delegation: schemas.ApprovalDelegationCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """Allows a manager to delegate their approval rights to someone else for a timeframe."""
    if delegation.start_date >= delegation.end_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    new_delegation = models.ApprovalDelegation(
        delegator_id=current_user.id,
        delegatee_id=delegation.delegatee_id,
        start_date=delegation.start_date,
        end_date=delegation.end_date,
        reason=delegation.reason,
        is_active=True
    )
    db.add(new_delegation)
    db.commit()
    db.refresh(new_delegation)
    return new_delegation

@router.get("/approval-delegations/me", response_model=List[schemas.ApprovalDelegationResponse])
def get_my_delegations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ApprovalDelegation).filter(models.ApprovalDelegation.delegator_id == current_user.id).all()

@router.get("/approval-delegations/active", response_model=List[schemas.ApprovalDelegationResponse])
def get_active_delegations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    now = datetime.utcnow()
    return db.query(models.ApprovalDelegation).filter(
        models.ApprovalDelegation.is_active == True,
        models.ApprovalDelegation.start_date <= now,
        models.ApprovalDelegation.end_date >= now
    ).all()

@router.put("/approval-delegations/{delegation_id}/cancel")
def cancel_delegation(delegation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    delegation = db.query(models.ApprovalDelegation).filter(models.ApprovalDelegation.id == delegation_id).first()
    if not delegation:
        raise HTTPException(status_code=404, detail="Delegation not found")
        
    # Only the creator or an admin can cancel
    if delegation.delegator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this delegation")

    delegation.is_active = False
    db.commit()
    return {"message": "Delegation cancelled successfully"}