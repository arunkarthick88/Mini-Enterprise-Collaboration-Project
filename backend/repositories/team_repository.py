from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from models import Team
class TeamRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, team_id: int, tenant_id: int) -> Optional[Team]:
        """Fetch a specific team ensuring strict tenant isolation."""
        stmt = select(Team).where(Team.id == team_id, Team.tenant_id == tenant_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_all_by_workspace(self, workspace_id: int, tenant_id: int) -> List[Team]:
        """Fetch all teams belonging to a specific workspace and tenant."""
        stmt = select(Team).where(Team.workspace_id == workspace_id, Team.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())

    def create(self, team: Team) -> Team:
        """Persist a new team record to the database."""
        self.db.add(team)
        self.db.commit()
        self.db.refresh(team)
        return team