from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from repositories.team_repository import TeamRepository
from schemas import TeamCreate
class TeamService:
    def __init__(self, db: Session):
        self.repository = TeamRepository(db)

    def get_team_details(self, team_id: int, tenant_id: int) -> Team:
        """Business logic to fetch a team; raises a 404 if unauthorized or missing."""
        team = self.repository.get_by_id(team_id, tenant_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found or access denied."
            )
        return team

    def list_workspace_teams(self, workspace_id: int, tenant_id: int) -> List[Team]:
        """Retrieve workspace teams."""
        return self.repository.get_all_by_workspace(workspace_id, tenant_id)

    def create_new_team(self, workspace_id: int, tenant_id: int, team_data: TeamCreate) -> Team:
        """Validate context and orchestrate the creation of a new team."""
        # Optional: Place business validation checks here (e.g., checking team name limits)
        
        new_team = Team(
            name=team_data.name,
            workspace_id=workspace_id,
            tenant_id=tenant_id
        )
        return self.repository.create(new_team)