from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Dict, Any
from repositories.search_repository import SearchRepository
from models import SavedSearch
from schemas import SavedSearchCreate

class SearchService:
    def __init__(self, db: Session):
        self.repository = SearchRepository(db)

    # --- Global Search Logic ---
    def perform_global_search(self, tenant_id: int, query: str) -> Dict[str, Any]:
        """
        Federated search that queries multiple tables and aggregates the results.
        Returns a dictionary grouped by entity type.
        """
        if not query or len(query) < 2:
            return {"projects": [], "tasks": [], "teams": []}

        projects = self.repository.search_projects(tenant_id, query)
        tasks = self.repository.search_tasks(tenant_id, query)
        teams = self.repository.search_teams(tenant_id, query)

        # Formatting the response to be easily readable by the frontend
        return {
            "projects": [{"id": p.id, "name": p.name, "status": p.status} for p in projects],
            "tasks": [{"id": t.id, "title": t.title, "status": t.status} for t in tasks],
            "teams": [{"id": tm.id, "name": tm.name} for tm in teams]
        }

    # --- Saved Search Logic ---
    def save_search(self, tenant_id: int, user_id: int, data: SavedSearchCreate) -> SavedSearch:
        new_search = SavedSearch(
            tenant_id=tenant_id,
            user_id=user_id,
            name=data.name,
            query_json=data.query_json
        )
        return self.repository.create_saved_search(new_search)

    def list_saved_searches(self, tenant_id: int, user_id: int) -> List[SavedSearch]:
        return self.repository.get_saved_searches_by_user(user_id, tenant_id)

    def delete_saved_search(self, search_id: int, tenant_id: int, user_id: int):
        search = self.repository.get_saved_search_by_id(search_id, user_id, tenant_id)
        if not search:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Saved search not found or access denied"
            )
        
        self.repository.delete_saved_search(search)
        return {"message": "Saved search deleted successfully"}