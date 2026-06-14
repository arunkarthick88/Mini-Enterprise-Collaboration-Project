from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/channels",
    tags=["Channels (Phase 10A & 10B)"],
    responses={404: {"description": "Not found"}},
)

# ==========================================
# 1. Channel Management
# ==========================================

@router.post("/", response_model=schemas.ChannelResponse)
def create_channel(channel: schemas.ChannelCreate, workspace_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify workspace exists and belongs to tenant
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id, models.Workspace.tenant_id == current_user.tenant_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    new_channel = models.Channel(
        **channel.dict(),
        workspace_id=workspace_id,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id
    )
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)

    # Auto-add creator to channel
    member = models.ChannelMember(channel_id=new_channel.id, user_id=current_user.id)
    db.add(member)
    db.commit()

    return new_channel

@router.get("/{id}", response_model=schemas.ChannelResponse)
def get_channel(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel

@router.put("/{id}", response_model=schemas.ChannelResponse)
def update_channel(id: int, ch_update: schemas.ChannelCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    for key, value in ch_update.dict().items():
        setattr(channel, key, value)
    db.commit()
    db.refresh(channel)
    return channel

@router.patch("/{id}/archive")
def archive_channel(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel.is_archived = True
    db.commit()
    return {"message": "Channel archived"}

@router.patch("/{id}/restore")
def restore_channel(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel.is_archived = False
    db.commit()
    return {"message": "Channel restored"}

# ==========================================
# 2. Channel Membership
# ==========================================

@router.post("/{id}/join")
def join_channel(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    # Optional: Verify user is a member of the parent workspace before joining the channel
    ws_member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == channel.workspace_id, models.WorkspaceMember.user_id == current_user.id).first()
    if not ws_member:
        raise HTTPException(status_code=403, detail="You must join the workspace before joining this channel")
        
    existing = db.query(models.ChannelMember).filter(models.ChannelMember.channel_id == id, models.ChannelMember.user_id == current_user.id).first()
    if existing:
        return {"message": "Already a member"}

    member = models.ChannelMember(channel_id=id, user_id=current_user.id)
    db.add(member)
    db.commit()
    return {"message": "Successfully joined channel"}

@router.post("/{id}/leave")
def leave_channel(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    member = db.query(models.ChannelMember).filter(models.ChannelMember.channel_id == id, models.ChannelMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of this channel")
    
    db.delete(member)
    db.commit()
    return {"message": "Successfully left channel"}


# ==========================================
# 3. PHASE 10B: Channel Messages
# ==========================================

@router.post("/{id}/messages", response_model=schemas.ChannelMessageResponse)
def send_channel_message(id: int, message: schemas.ChannelMessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify channel exists and get workspace details
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Verify user is a member of the channel
    member = db.query(models.ChannelMember).filter(models.ChannelMember.channel_id == id, models.ChannelMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You must be a member of this channel to send messages.")

    new_msg = models.ChannelMessage(
        tenant_id=current_user.tenant_id,
        workspace_id=channel.workspace_id,
        channel_id=id,
        sender_id=current_user.id,
        content=message.content,
        message_type=message.message_type
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.get("/{id}/messages", response_model=List[schemas.ChannelMessageResponse])
def list_channel_messages(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify user is a member of the channel
    member = db.query(models.ChannelMember).filter(models.ChannelMember.channel_id == id, models.ChannelMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You must be a member of this channel to view messages.")
        
    return db.query(models.ChannelMessage).filter(models.ChannelMessage.channel_id == id).order_by(models.ChannelMessage.created_at.asc()).all()


# ==========================================
# 4. PHASE 10B: Channel Tasks
# ==========================================

@router.post("/{id}/tasks", response_model=schemas.TaskResponse)
def create_channel_task(id: int, task: schemas.TaskCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify channel exists and get workspace details
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Verify the creator is a channel member
    member = db.query(models.ChannelMember).filter(models.ChannelMember.channel_id == id, models.ChannelMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You must be a member of this channel to create tasks.")

    # Ensure assignee is ALSO in the channel if provided
    if task.assigned_to_id:
        assignee = db.query(models.ChannelMember).filter(models.ChannelMember.channel_id == id, models.ChannelMember.user_id == task.assigned_to_id).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assigned user must be a member of this channel.")

    new_task = models.Task(
        **task.dict(),
        created_by_id=current_user.id,
        tenant_id=current_user.tenant_id,
        workspace_id=channel.workspace_id,
        channel_id=id 
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.get("/{id}/tasks", response_model=List[schemas.TaskResponse])
def list_channel_tasks(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify user is a member of the channel
    member = db.query(models.ChannelMember).filter(models.ChannelMember.channel_id == id, models.ChannelMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="You must be a member of this channel to view tasks.")

    return db.query(models.Task).filter(models.Task.channel_id == id).order_by(models.Task.created_at.desc()).all()