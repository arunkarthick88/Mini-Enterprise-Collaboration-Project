from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from models import KnowledgeCategory, KnowledgeArticle

class KnowledgeRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Categories ---
    def create_category(self, category: KnowledgeCategory) -> KnowledgeCategory:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def get_categories(self, tenant_id: int) -> List[KnowledgeCategory]:
        stmt = select(KnowledgeCategory).where(KnowledgeCategory.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())

    # --- Articles ---
    def create_article(self, article: KnowledgeArticle) -> KnowledgeArticle:
        self.db.add(article)
        self.db.commit()
        self.db.refresh(article)
        return article

    def get_articles(self, tenant_id: int) -> List[KnowledgeArticle]:
        stmt = select(KnowledgeArticle).where(KnowledgeArticle.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())

    def get_article_by_id(self, article_id: int, tenant_id: int) -> Optional[KnowledgeArticle]:
        stmt = select(KnowledgeArticle).where(
            KnowledgeArticle.id == article_id,
            KnowledgeArticle.tenant_id == tenant_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def update_article(self, article: KnowledgeArticle) -> KnowledgeArticle:
        self.db.commit()
        self.db.refresh(article)
        return article

    def delete_article(self, article: KnowledgeArticle):
        self.db.delete(article)
        self.db.commit()