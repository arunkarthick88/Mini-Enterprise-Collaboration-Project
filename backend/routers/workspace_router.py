from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import string
import random
from datetime import datetime
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces (Phase 10A)"],
    responses={404: {"description": "Not found"}},
)

def generate_slug(name: str) -> str:
    base_slug = "".join(e for e in name.lower() if e.isalnum())
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{base_slug}-{random_suffix}"

# ==========================================
# 1. Workspace Management
# ==========================================

@router.post("/", response_model=schemas.WorkspaceResponse)
def create_workspace(workspace: schemas.WorkspaceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User is not assigned to a tenant.")

    # Check Tenant Usage Limits
    usage = db.query(models.TenantCollaborationUsage).filter_by(tenant_id=current_user.tenant_id).first()
    settings = db.query(models.TenantCollaborationSetting).filter_by(tenant_id=current_user.tenant_id).first()
    if usage and settings and usage.workspace_count >= settings.max_workspaces:
        raise HTTPException(status_code=403, detail="Maximum workspace limit reached for this tenant.")

    new_workspace = models.Workspace(
        **workspace.dict(),
        slug=generate_slug(workspace.name),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id
    )
    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)

    # Auto-add the creator as a Workspace Admin
    admin_member = models.WorkspaceMember(workspace_id=new_workspace.id, user_id=current_user.id, role="Workspace Admin")
    db.add(admin_member)

    # Update Usage Count
    if usage:
        usage.workspace_count += 1

    db.commit()
    return new_workspace

@router.get("/", response_model=List[schemas.WorkspaceResponse])
def list_workspaces(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # STRICT ISOLATION: Only fetch workspaces belonging to the user's tenant
    return db.query(models.Workspace).filter(models.Workspace.tenant_id == current_user.tenant_id).all()

@router.get("/{id}", response_model=schemas.WorkspaceResponse)
def get_workspace(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.id == id, models.Workspace.tenant_id == current_user.tenant_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@router.put("/{id}", response_model=schemas.WorkspaceResponse)
def update_workspace(id: int, ws_update: schemas.WorkspaceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.id == id, models.Workspace.tenant_id == current_user.tenant_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    for key, value in ws_update.dict().items():
        setattr(workspace, key, value)
    db.commit()
    db.refresh(workspace)
    return workspace

@router.patch("/{id}/archive")
def archive_workspace(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.id == id, models.Workspace.tenant_id == current_user.tenant_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    workspace.is_archived = True
    db.commit()
    return {"message": "Workspace archived"}

@router.patch("/{id}/restore")
def restore_workspace(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.id == id, models.Workspace.tenant_id == current_user.tenant_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    workspace.is_archived = False
    db.commit()
    return {"message": "Workspace restored"}

# ==========================================
# 2. Workspace Membership
# ==========================================

@router.post("/{id}/members", response_model=schemas.WorkspaceMemberResponse)
def add_member(id: int, member: schemas.WorkspaceMemberCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify workspace exists in tenant
    workspace = db.query(models.Workspace).filter(models.Workspace.id == id, models.Workspace.tenant_id == current_user.tenant_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Verify target user is in the SAME tenant
    target_user = db.query(models.User).filter(models.User.id == member.user_id, models.User.tenant_id == current_user.tenant_id).first()
    if not target_user:
        raise HTTPException(status_code=400, detail="User not found or does not belong to your organization.")
        
    # Prevent duplicates
    existing = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == id, models.WorkspaceMember.user_id == member.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    new_member = models.WorkspaceMember(workspace_id=id, user_id=member.user_id, role=member.role)
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.get("/{id}/members", response_model=List[schemas.WorkspaceMemberResponse])
def list_members(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == id).all()

@router.patch("/{id}/members/{user_id}/role")
def update_member_role(id: int, user_id: int, role: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == id, models.WorkspaceMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = role
    db.commit()
    return {"message": f"Role updated to {role}"}

@router.delete("/{id}/members/{user_id}")
def remove_member(id: int, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == id, models.WorkspaceMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member removed from workspace"}

# ==========================================
# 3. List Channels in Workspace
# ==========================================
@router.get("/{id}/channels", response_model=List[schemas.ChannelResponse])
def list_workspace_channels(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify workspace belongs to tenant
    workspace = db.query(models.Workspace).filter(models.Workspace.id == id, models.Workspace.tenant_id == current_user.tenant_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return db.query(models.Channel).filter(models.Channel.workspace_id == id).all()