from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
import datetime
import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/tenants/{tenant_id}/workspaces/{workspace_id}/projects",
    tags=["Projects"]
)

# ==========================================
# 1. CREATE A PROJECT
# ==========================================
@router.post("/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    tenant_id: int, workspace_id: int, project_in: schemas.ProjectCreate,
    current_user_id: int = 1, db: Session = Depends(get_db)
):
    workspace_stmt = select(models.Workspace).where(models.Workspace.id == workspace_id, models.Workspace.tenant_id == tenant_id)
    if not db.execute(workspace_stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    new_project = models.Project(
        tenant_id=tenant_id, workspace_id=workspace_id,
        name=project_in.name, description=project_in.description,
        owner_id=current_user_id, status=project_in.status, priority=project_in.priority,
        start_date=project_in.start_date, end_date=project_in.end_date
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

# ==========================================
# 2. LIST ALL PROJECTS
# ==========================================
@router.get("/", response_model=List[schemas.ProjectResponse])
def list_projects(tenant_id: int, workspace_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    stmt = select(models.Project).where(models.Project.tenant_id == tenant_id, models.Project.workspace_id == workspace_id).offset(skip).limit(limit)
    return db.execute(stmt).scalars().all()

# ==========================================
# 3. GET SPECIFIC PROJECT BY ID
# ==========================================
@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(tenant_id: int, workspace_id: int, project_id: int, db: Session = Depends(get_db)):
    stmt = select(models.Project).where(models.Project.id == project_id, models.Project.tenant_id == tenant_id)
    project = db.execute(stmt).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

# ==========================================
# 4. UPDATE PROJECT
# ==========================================
@router.patch("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(tenant_id: int, workspace_id: int, project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    stmt = select(models.Project).where(models.Project.id == project_id, models.Project.tenant_id == tenant_id)
    project = db.execute(stmt).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return project

# ==========================================
# 5. ASSIGN TEAM TO PROJECT
# ==========================================
@router.post("/{project_id}/teams", response_model=schemas.ProjectTeamResponse, status_code=status.HTTP_201_CREATED)
def assign_team_to_project(tenant_id: int, workspace_id: int, project_id: int, team_id: int, db: Session = Depends(get_db)):
    proj_stmt = select(models.Project).where(models.Project.id == project_id, models.Project.tenant_id == tenant_id)
    if not db.execute(proj_stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    mapping_stmt = select(models.ProjectTeam).where(models.ProjectTeam.project_id == project_id, models.ProjectTeam.team_id == team_id)
    if db.execute(mapping_stmt).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team already assigned")

    new_mapping = models.ProjectTeam(tenant_id=tenant_id, project_id=project_id, team_id=team_id)
    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)
    return new_mapping

# ==========================================
# 6. REMOVE TEAM FROM PROJECT
# ==========================================
@router.delete("/{project_id}/teams/{team_id}", status_code=status.HTTP_200_OK)
def remove_team_from_project(tenant_id: int, workspace_id: int, project_id: int, team_id: int, db: Session = Depends(get_db)):
    stmt = select(models.ProjectTeam).where(models.ProjectTeam.project_id == project_id, models.ProjectTeam.team_id == team_id)
    mapping = db.execute(stmt).scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team assignment not found")
    
    db.delete(mapping)
    db.commit()
    return {"detail": "Team removed from project successfully"}

# ==========================================
# 7. PROJECT CALENDAR API
# ==========================================
@router.get("/{project_id}/calendar")
def get_project_calendar(tenant_id: int, workspace_id: int, project_id: int, db: Session = Depends(get_db)):
    """Fetches combined project timeline data (Meetings + Task Due Dates)."""
    
    events = []
    
    # 1. Fetch Meetings
    meet_stmt = select(models.Meeting).where(models.Meeting.project_id == project_id, models.Meeting.tenant_id == tenant_id)
    meetings = db.execute(meet_stmt).scalars().all()
    for m in meetings:
        events.append({
            "type": "meeting",
            "id": m.id,
            "title": m.title,
            "start": m.start_time,
            "end": m.end_time,
            "status": m.status
        })

    # 2. Fetch Tasks with Deadlines (using SLA due time as deadline)
    task_stmt = select(models.Task).where(
        models.Task.project_id == project_id, 
        models.Task.tenant_id == tenant_id,
        models.Task.sla_due_time != None
    )
    tasks = db.execute(task_stmt).scalars().all()
    for t in tasks:
        events.append({
            "type": "task_deadline",
            "id": t.id,
            "title": f"Due: {t.title}",
            "start": t.sla_due_time,
            "end": t.sla_due_time,
            "status": t.status
        })

    return {"project_id": project_id, "calendar_events": events}

# ==========================================
# 8. PROJECT WORKLOAD DASHBOARD
# ==========================================
@router.get("/{project_id}/workload")
def get_project_workload(tenant_id: int, workspace_id: int, project_id: int, db: Session = Depends(get_db)):
    """Calculates workload distribution across all teams in the project."""
    
    stmt = select(models.Task).where(models.Task.project_id == project_id, models.Task.tenant_id == tenant_id)
    tasks = db.execute(stmt).scalars().all()

    total_tasks = len(tasks)
    team_workload = {}

    for t in tasks:
        if t.team_id:
            if t.team_id not in team_workload:
                team_workload[t.team_id] = {"total": 0, "completed": 0, "pending": 0}
            
            team_workload[t.team_id]["total"] += 1
            if t.status == "done":
                team_workload[t.team_id]["completed"] += 1
            else:
                team_workload[t.team_id]["pending"] += 1

    return {
        "project_id": project_id,
        "total_project_tasks": total_tasks,
        "team_workload_distribution": team_workload
    }