from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
import datetime
import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/tenants/{tenant_id}/workspaces/{workspace_id}/teams",
    tags=["Teams"]
)

# ==========================================
# 1. CREATE A TEAM
# ==========================================
@router.post("/", response_model=schemas.TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    tenant_id: int,
    workspace_id: int,
    team_in: schemas.TeamCreate,
    current_user_id: int = 1,  # Replace with your actual auth dependency
    db: Session = Depends(get_db)
):
    workspace_stmt = select(models.Workspace).where(
        models.Workspace.id == workspace_id, 
        models.Workspace.tenant_id == tenant_id
    )
    if not db.execute(workspace_stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    new_team = models.Team(
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        name=team_in.name,
        description=team_in.description,
        created_by=current_user_id,
        is_active=True
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    team_lead = models.TeamMember(
        tenant_id=tenant_id,
        team_id=new_team.id,
        user_id=current_user_id,
        role="Lead",
        is_active=True
    )
    db.add(team_lead)
    db.commit()

    return new_team

# ==========================================
# 2. LIST ALL TEAMS
# ==========================================
@router.get("/", response_model=List[schemas.TeamResponse])
def list_teams(
    tenant_id: int,
    workspace_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    stmt = select(models.Team).where(
        models.Team.tenant_id == tenant_id,
        models.Team.workspace_id == workspace_id,
        models.Team.is_active == True
    ).offset(skip).limit(limit)
    return db.execute(stmt).scalars().all()

# ==========================================
# 3. GET SPECIFIC TEAM BY ID
# ==========================================
@router.get("/{team_id}", response_model=schemas.TeamResponse)
def get_team(tenant_id: int, workspace_id: int, team_id: int, db: Session = Depends(get_db)):
    stmt = select(models.Team).where(
        models.Team.id == team_id,
        models.Team.tenant_id == tenant_id,
        models.Team.workspace_id == workspace_id
    )
    team = db.execute(stmt).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team

# ==========================================
# 4. ADD A MEMBER TO A TEAM
# ==========================================
@router.post("/{team_id}/members", response_model=schemas.TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def add_team_member(
    tenant_id: int, workspace_id: int, team_id: int,
    member_in: schemas.TeamMemberCreate, db: Session = Depends(get_db)
):
    team_stmt = select(models.Team).where(models.Team.id == team_id, models.Team.tenant_id == tenant_id)
    if not db.execute(team_stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    member_exists_stmt = select(models.TeamMember).where(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == member_in.user_id,
        models.TeamMember.is_active == True
    )
    if db.execute(member_exists_stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already an active member")

    new_member = models.TeamMember(
        tenant_id=tenant_id, team_id=team_id,
        user_id=member_in.user_id, role=member_in.role, is_active=True
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

# ==========================================
# 5. LIST MEMBERS OF A TEAM
# ==========================================
@router.get("/{team_id}/members", response_model=List[schemas.TeamMemberResponse])
def list_team_members(tenant_id: int, workspace_id: int, team_id: int, db: Session = Depends(get_db)):
    stmt = select(models.TeamMember).where(models.TeamMember.team_id == team_id, models.TeamMember.is_active == True)
    return db.execute(stmt).scalars().all()

# ==========================================
# 6. REMOVE MEMBER FROM A TEAM
# ==========================================
@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_team_member(tenant_id: int, workspace_id: int, team_id: int, user_id: int, db: Session = Depends(get_db)):
    stmt = select(models.TeamMember).where(
        models.TeamMember.team_id == team_id, models.TeamMember.user_id == user_id, models.TeamMember.is_active == True
    )
    member = db.execute(stmt).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active team member not found")

    member.is_active = False
    db.commit()
    return {"detail": "Member removed from team successfully"}

# ==========================================
# 7. TEAM WORKLOAD DASHBOARD API
# ==========================================
@router.get("/{team_id}/workload")
def get_team_workload(tenant_id: int, workspace_id: int, team_id: int, db: Session = Depends(get_db)):
    """Calculates live workload metrics for a specific team."""
    
    # Query all tasks assigned to this team
    stmt = select(models.Task).where(models.Task.team_id == team_id, models.Task.tenant_id == tenant_id)
    tasks = db.execute(stmt).scalars().all()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "done")
    pending_tasks = total_tasks - completed_tasks
    
    now = datetime.datetime.utcnow()
    overdue_tasks = sum(1 for t in tasks if t.status != "done" and t.sla_due_time and t.sla_due_time < now)

    # Calculate Workload per user
    user_workload = {}
    for t in tasks:
        if t.assigned_to_id:
            if t.assigned_to_id not in user_workload:
                user_workload[t.assigned_to_id] = {"total": 0, "completed": 0, "pending": 0}
            
            user_workload[t.assigned_to_id]["total"] += 1
            if t.status == "done":
                user_workload[t.assigned_to_id]["completed"] += 1
            else:
                user_workload[t.assigned_to_id]["pending"] += 1

    return {
        "team_id": team_id,
        "metrics": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "overdue_tasks": overdue_tasks
        },
        "user_workload": user_workload
    }