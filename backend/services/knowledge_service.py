from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from repositories.knowledge_repository import KnowledgeRepository
from models import KnowledgeCategory, KnowledgeArticle
from schemas import (
    KnowledgeCategoryCreate, 
    KnowledgeArticleCreate, 
    KnowledgeArticleUpdate
)

class KnowledgeService:
    def __init__(self, db: Session):
        self.repository = KnowledgeRepository(db)

    def create_category(self, tenant_id: int, data: KnowledgeCategoryCreate) -> KnowledgeCategory:
        new_category = KnowledgeCategory(tenant_id=tenant_id, name=data.name, description=data.description)
        return self.repository.create_category(new_category)

    def list_categories(self, tenant_id: int) -> List[KnowledgeCategory]:
        return self.repository.get_categories(tenant_id)

    def create_article(self, tenant_id: int, user_id: int, data: KnowledgeArticleCreate) -> KnowledgeArticle:
        new_article = KnowledgeArticle(
            tenant_id=tenant_id,
            category_id=data.category_id,
            title=data.title,
            content=data.content,
            tags=data.tags,
            created_by=user_id,
            version=1
        )
        return self.repository.create_article(new_article)

    def list_articles(self, tenant_id: int) -> List[KnowledgeArticle]:
        return self.repository.get_articles(tenant_id)

    def get_article(self, article_id: int, tenant_id: int) -> KnowledgeArticle:
        article = self.repository.get_article_by_id(article_id, tenant_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        return article

    def update_article(self, article_id: int, tenant_id: int, data: KnowledgeArticleUpdate) -> KnowledgeArticle:
        article = self.get_article(article_id, tenant_id)
        
        if data.title is not None: article.title = data.title
        if data.content is not None: article.content = data.content
        if data.tags is not None: article.tags = data.tags
        if data.category_id is not None: article.category_id = data.category_id
        
        article.version += 1
        return self.repository.update_article(article)

    def delete_article(self, article_id: int, tenant_id: int):
        article = self.get_article(article_id, tenant_id)
        self.repository.delete_article(article)