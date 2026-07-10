from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from repositories.form_repository import FormRepository
from models import CustomForm, CustomFormField
from schemas import CustomFormCreate, CustomFormUpdate, CustomFormFieldCreate

class FormService:
    def __init__(self, db: Session):
        self.repository = FormRepository(db)

    def create_form(self, tenant_id: int, data: CustomFormCreate) -> CustomForm:
        new_form = CustomForm(
            tenant_id=tenant_id,
            name=data.name,
            description=data.description,
            request_type=data.request_type,
            is_active=data.is_active
        )
        return self.repository.create_form(new_form)

    def list_forms(self, tenant_id: int) -> List[CustomForm]:
        return self.repository.get_forms(tenant_id)

    def get_form(self, form_id: int, tenant_id: int) -> CustomForm:
        form = self.repository.get_form_by_id(form_id, tenant_id)
        if not form:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
        return form

    def update_form(self, form_id: int, tenant_id: int, data: CustomFormUpdate) -> CustomForm:
        form = self.get_form(form_id, tenant_id)
        if data.name is not None: form.name = data.name
        if data.description is not None: form.description = data.description
        if data.is_active is not None: form.is_active = data.is_active
        return self.repository.update_form(form)

    def disable_form(self, form_id: int, tenant_id: int):
        form = self.get_form(form_id, tenant_id)
        form.is_active = False
        self.repository.update_form(form)

    def add_form_field(self, form_id: int, tenant_id: int, data: CustomFormFieldCreate) -> CustomFormField:
        self.get_form(form_id, tenant_id) # Verify ownership
        new_field = CustomFormField(
            form_id=form_id,
            field_name=data.field_name,
            field_type=data.field_type,
            validation_rules=data.validation_rules,
            is_required=data.is_required
        )
        return self.repository.add_field(new_field)

    def get_form_fields(self, form_id: int, tenant_id: int) -> List[CustomFormField]:
        self.get_form(form_id, tenant_id) # Verify ownership
        return self.repository.get_fields_by_form(form_id)