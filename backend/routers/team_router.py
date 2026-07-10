from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import TeamResponse, TeamCreate
from services.team_service import TeamService

# Import the existing user dependency to avoid the ImportError
from auth import get_current_user

router = APIRouter(prefix="/teams", tags=["Teams"])

@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    team_service = TeamService(db)
    # Extract tenant_id directly from the authenticated user object
    return team_service.get_team_details(team_id, current_user.tenant_id)


@router.get("/workspace/{workspace_id}", response_model=List[TeamResponse])
def get_workspace_teams(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    team_service = TeamService(db)
    # Extract tenant_id directly from the authenticated user object
    return team_service.list_workspace_teams(workspace_id, current_user.tenant_id)


@router.post("/workspace/{workspace_id}", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    workspace_id: int,
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    team_service = TeamService(db)
    # Extract tenant_id directly from the authenticated user object
    return team_service.create_new_team(workspace_id, current_user.tenant_id, team_data)