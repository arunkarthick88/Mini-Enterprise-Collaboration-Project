from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db
from auth import get_current_user
from services.search_service import SearchService
from schemas import SavedSearchCreate, SavedSearchResponse

# Note: We aren't using a prefix here because the endpoints start with different base paths (/search and /saved-searches)
router = APIRouter(tags=["Global Search & Saved Searches"])

# --- Global Search API ---
@router.get("/search/global", response_model=Dict[str, Any])
def global_search(
    query: str = Query(..., min_length=2, description="Search query string"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    search_service = SearchService(db)
    return search_service.perform_global_search(current_user.tenant_id, query)

# --- Saved Searches APIs ---
@router.post("/saved-searches", response_model=SavedSearchResponse, status_code=status.HTTP_201_CREATED)
def create_saved_search(
    data: SavedSearchCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    search_service = SearchService(db)
    return search_service.save_search(current_user.tenant_id, current_user.id, data)

@router.get("/saved-searches", response_model=List[SavedSearchResponse])
def list_saved_searches(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    search_service = SearchService(db)
    return search_service.list_saved_searches(current_user.tenant_id, current_user.id)

@router.delete("/saved-searches/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_search(
    search_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    search_service = SearchService(db)
    search_service.delete_saved_search(search_id, current_user.tenant_id, current_user.id)
    return None