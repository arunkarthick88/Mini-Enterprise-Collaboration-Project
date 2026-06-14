from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import datetime
import models, schemas, auth, database, services  

# --- PHASE 5: WebSocket Manager ---
from websocket_manager import manager

router = APIRouter(prefix="/approvals", tags=["Approvals"])

# --- Setup File Upload Directory ---
UPLOAD_DIR = "uploads/approval_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ==========================================
# 1. APPROVAL CRUD & WORKFLOW
# ==========================================

@router.post("/", response_model=schemas.ApprovalResponse)
async def create_approval(approval: schemas.ApprovalCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_app = models.Approval(
        **approval.dict(), 
        requested_by_id=current_user.id,
        tenant_id=current_user.tenant_id # <-- PHASE 10A SaaS Addition
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    # --- PHASE 3: Audit & Notifications ---
    services.log_audit(db, current_user.id, "APPROVAL_REQUESTED", "Approval", new_app.id)
    services.create_notification(db, current_user.id, f"Your approval request '{new_app.title}' has been successfully submitted.")

    # --- PHASE 5: Live Notification to self ---
    await manager.send_personal_message({
        "type": "NOTIFICATION",
        "message": f"Approval request '{new_app.title}' submitted.",
    }, user_id=current_user.id)

    return new_app

@router.get("/", response_model=List[schemas.ApprovalResponse])
def get_approvals(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    """
    PHASE 7 FIX: Multi-Tenant Filter.
    Users only see approvals within their organization.
    """
    # Start the query filtered by organization_id
    query = db.query(models.Approval).join(models.User, models.Approval.requested_by_id == models.User.id)\
              .filter(models.User.organization_id == current_user.organization_id)

    if current_user.role == "admin":
        return query.all()
    elif current_user.role == "manager":
        return query.filter(
            (models.Approval.requested_by_id == current_user.id) | 
            (models.Approval.current_level == "manager")
        ).all()
    else: # Employee
        return query.filter(models.Approval.requested_by_id == current_user.id).all()

@router.patch("/{approval_id}/action", response_model=schemas.ApprovalResponse)
async def take_approval_action(approval_id: int, action_data: schemas.ApprovalAction, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    
    # PHASE 7 FIX: Verify approval exists AND belongs to the user's organization
    approval = db.query(models.Approval).join(models.User, models.Approval.requested_by_id == models.User.id)\
                 .filter(models.Approval.id == approval_id, models.User.organization_id == current_user.organization_id).first()
                 
    if not approval: raise HTTPException(status_code=404, detail="Approval request not found or access denied")

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

    # Record the approval history
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
    services.log_audit(db, current_user.id, f"APPROVAL_{action_data.action.upper()}", "Approval", approval.id)

    # Notify the requester
    if approval.requested_by_id != current_user.id:
        if action_data.action == "approve" and approval.status == "pending":
            msg = f"Your approval '{approval.title}' was approved by your manager and escalated to Admin."
        elif action_data.action == "approve" and approval.status == "approved":
            msg = f"Your approval '{approval.title}' was fully approved!"
        else:
            msg = f"Your approval '{approval.title}' was marked as {action_data.action}."
        
        services.create_notification(db, approval.requested_by_id, msg)
        
        # --- PHASE 5: Live Notification ---
        await manager.send_personal_message({
            "type": "NOTIFICATION",
            "message": msg,
        }, user_id=approval.requested_by_id)

    return approval


# ==========================================
# 2. PHASE 10B: APPROVAL DOCUMENTS API
# ==========================================

@router.post("/{approval_id}/documents", response_model=schemas.ApprovalDocumentResponse)
async def upload_approval_document(
    approval_id: int, 
    file: UploadFile = File(...), 
    document_type: str = Form("REFERENCE"), 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    approval = db.query(models.Approval).filter(models.Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    # Save file locally
    file_location = f"{UPLOAD_DIR}/{approval_id}_{datetime.datetime.utcnow().timestamp()}_{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    file_size = os.path.getsize(file_location)

    new_doc = models.ApprovalDocument(
        tenant_id=current_user.tenant_id,
        approval_id=approval_id,
        file_name=file.filename,
        file_path=file_location,
        file_size=file_size,
        mime_type=file.content_type,
        uploaded_by=current_user.id,
        document_type=document_type
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    services.log_audit(db, current_user.id, "APPROVAL_DOCUMENT_UPLOADED", "ApprovalDocument", new_doc.id)
    return new_doc

@router.get("/{approval_id}/documents", response_model=List[schemas.ApprovalDocumentResponse])
def get_approval_documents(approval_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.ApprovalDocument).filter(models.ApprovalDocument.approval_id == approval_id).all()

@router.get("/documents/{document_id}/download")
def download_approval_document(document_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    document = db.query(models.ApprovalDocument).filter(models.ApprovalDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File missing from server")
        
    return FileResponse(path=document.file_path, filename=document.file_name, media_type=document.mime_type)

@router.delete("/documents/{document_id}")
def delete_approval_document(document_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    document = db.query(models.ApprovalDocument).filter(models.ApprovalDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check permissions (only uploader or admin can delete)
    if document.uploaded_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")
        
    # Remove file from disk
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
        
    db.delete(document)
    db.commit()
    services.log_audit(db, current_user.id, "APPROVAL_DOCUMENT_DELETED", "ApprovalDocument", document_id)
    return {"message": "Document successfully deleted"}