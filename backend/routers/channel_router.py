from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/channels",
    tags=["Channels (Phase 10A)"],
    responses={404: {"description": "Not found"}},
)

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

@router.post("/{id}/join")
def join_channel(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == id, models.Channel.tenant_id == current_user.tenant_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
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