from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from models import CustomForm, CustomFormField

class FormRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_form(self, form: CustomForm) -> CustomForm:
        self.db.add(form)
        self.db.commit()
        self.db.refresh(form)
        return form

    def get_forms(self, tenant_id: int) -> List[CustomForm]:
        stmt = select(CustomForm).where(CustomForm.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())

    def get_form_by_id(self, form_id: int, tenant_id: int) -> Optional[CustomForm]:
        stmt = select(CustomForm).where(CustomForm.id == form_id, CustomForm.tenant_id == tenant_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def update_form(self, form: CustomForm) -> CustomForm:
        self.db.commit()
        self.db.refresh(form)
        return form

    def add_field(self, field: CustomFormField) -> CustomFormField:
        self.db.add(field)
        self.db.commit()
        self.db.refresh(field)
        return field

    def get_fields_by_form(self, form_id: int) -> List[CustomFormField]:
        stmt = select(CustomFormField).where(CustomFormField.form_id == form_id)
        return list(self.db.execute(stmt).scalars().all())