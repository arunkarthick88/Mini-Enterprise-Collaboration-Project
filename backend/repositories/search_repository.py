from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from typing import List, Optional
from models import SavedSearch, Project, Task, Team

class SearchRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Global Search Functions ---
    def search_projects(self, tenant_id: int, query: str) -> List[Project]:
        stmt = select(Project).where(
            Project.tenant_id == tenant_id,
            or_(
                Project.name.ilike(f"%{query}%"),
                Project.description.ilike(f"%{query}%")
            )
        ).limit(10)
        return list(self.db.execute(stmt).scalars().all())

    def search_tasks(self, tenant_id: int, query: str) -> List[Task]:
        stmt = select(Task).where(
            Task.tenant_id == tenant_id,
            or_(
                Task.title.ilike(f"%{query}%"),
                Task.description.ilike(f"%{query}%")
            )
        ).limit(10)
        return list(self.db.execute(stmt).scalars().all())

    def search_teams(self, tenant_id: int, query: str) -> List[Team]:
        stmt = select(Team).where(
            Team.tenant_id == tenant_id,
            or_(
                Team.name.ilike(f"%{query}%"),
                Team.description.ilike(f"%{query}%")
            )
        ).limit(10)
        return list(self.db.execute(stmt).scalars().all())

    # --- Saved Searches Functions ---
    def create_saved_search(self, saved_search: SavedSearch) -> SavedSearch:
        self.db.add(saved_search)
        self.db.commit()
        self.db.refresh(saved_search)
        return saved_search

    def get_saved_searches_by_user(self, user_id: int, tenant_id: int) -> List[SavedSearch]:
        stmt = select(SavedSearch).where(
            SavedSearch.user_id == user_id,
            SavedSearch.tenant_id == tenant_id
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_saved_search_by_id(self, search_id: int, user_id: int, tenant_id: int) -> Optional[SavedSearch]:
        stmt = select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == user_id,
            SavedSearch.tenant_id == tenant_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def delete_saved_search(self, saved_search: SavedSearch):
        self.db.delete(saved_search)
        self.db.commit()