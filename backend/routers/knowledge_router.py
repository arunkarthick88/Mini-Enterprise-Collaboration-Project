from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from services.knowledge_service import KnowledgeService
from schemas import (
    KnowledgeCategoryCreate,
    KnowledgeCategoryResponse,
    KnowledgeArticleCreate,
    KnowledgeArticleUpdate,
    KnowledgeArticleResponse
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])

# --- Categories ---
@router.post("/categories", response_model=KnowledgeCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: KnowledgeCategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = KnowledgeService(db)
    return service.create_category(current_user.tenant_id, data)

@router.get("/categories", response_model=List[KnowledgeCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = KnowledgeService(db)
    return service.list_categories(current_user.tenant_id)

# --- Articles ---
@router.post("/articles", response_model=KnowledgeArticleResponse, status_code=status.HTTP_201_CREATED)
def create_article(
    data: KnowledgeArticleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = KnowledgeService(db)
    return service.create_article(current_user.tenant_id, current_user.id, data)

@router.get("/articles", response_model=List[KnowledgeArticleResponse])
def list_articles(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = KnowledgeService(db)
    return service.list_articles(current_user.tenant_id)

@router.get("/articles/{article_id}", response_model=KnowledgeArticleResponse)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = KnowledgeService(db)
    return service.get_article(article_id, current_user.tenant_id)

@router.put("/articles/{article_id}", response_model=KnowledgeArticleResponse)
def update_article(
    article_id: int,
    data: KnowledgeArticleUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = KnowledgeService(db)
    return service.update_article(article_id, current_user.tenant_id, data)

@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = KnowledgeService(db)
    service.delete_article(article_id, current_user.tenant_id)
    return None