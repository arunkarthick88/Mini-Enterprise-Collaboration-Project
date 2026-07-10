from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from services.form_service import FormService
from schemas import (
    CustomFormCreate,
    CustomFormUpdate,
    CustomFormResponse,
    CustomFormFieldCreate,
    CustomFormFieldResponse
)

router = APIRouter(prefix="/forms", tags=["Custom Forms"])

# --- Forms ---
@router.post("/", response_model=CustomFormResponse, status_code=status.HTTP_201_CREATED)
def create_form(
    data: CustomFormCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = FormService(db)
    return service.create_form(current_user.tenant_id, data)

@router.get("/", response_model=List[CustomFormResponse])
def list_forms(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = FormService(db)
    return service.list_forms(current_user.tenant_id)

@router.get("/{form_id}", response_model=CustomFormResponse)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = FormService(db)
    return service.get_form(form_id, current_user.tenant_id)

@router.put("/{form_id}", response_model=CustomFormResponse)
def update_form(
    form_id: int,
    data: CustomFormUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = FormService(db)
    return service.update_form(form_id, current_user.tenant_id, data)

@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def disable_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = FormService(db)
    service.disable_form(form_id, current_user.tenant_id)
    return None

# --- Form Fields ---
@router.post("/{form_id}/fields", response_model=CustomFormFieldResponse, status_code=status.HTTP_201_CREATED)
def add_form_field(
    form_id: int,
    data: CustomFormFieldCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = FormService(db)
    return service.add_form_field(form_id, current_user.tenant_id, data)

@router.get("/{form_id}/fields", response_model=List[CustomFormFieldResponse])
def get_form_fields(
    form_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = FormService(db)
    return service.get_form_fields(form_id, current_user.tenant_id)