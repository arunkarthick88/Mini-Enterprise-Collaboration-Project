from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from services.workflow_service import WorkflowService
from schemas import (
    WorkflowDefinitionCreate, 
    WorkflowDefinitionUpdate, 
    WorkflowDefinitionResponse,
    WorkflowRuleCreate,
    WorkflowRuleResponse,
    WorkflowExecutionResponse
)

router = APIRouter(prefix="/workflows", tags=["Workflow Automation"])

@router.post("/", response_model=WorkflowDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(
    data: WorkflowDefinitionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workflow_service = WorkflowService(db)
    return workflow_service.create_workflow(current_user.tenant_id, data)

@router.get("/", response_model=List[WorkflowDefinitionResponse])
def list_workflows(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workflow_service = WorkflowService(db)
    return workflow_service.list_workflows(current_user.tenant_id)

@router.get("/{workflow_id}", response_model=WorkflowDefinitionResponse)
def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workflow_service = WorkflowService(db)
    return workflow_service.get_workflow(workflow_id, current_user.tenant_id)

@router.put("/{workflow_id}", response_model=WorkflowDefinitionResponse)
def update_workflow(
    workflow_id: int,
    data: WorkflowDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workflow_service = WorkflowService(db)
    return workflow_service.update_workflow(workflow_id, current_user.tenant_id, data)

@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def disable_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workflow_service = WorkflowService(db)
    workflow_service.disable_workflow(workflow_id, current_user.tenant_id)
    return None

@router.post("/{workflow_id}/rules", response_model=WorkflowRuleResponse, status_code=status.HTTP_201_CREATED)
def add_workflow_rule(
    workflow_id: int,
    data: WorkflowRuleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workflow_service = WorkflowService(db)
    return workflow_service.add_rule(workflow_id, current_user.tenant_id, data)

@router.get("/{workflow_id}/executions", response_model=List[WorkflowExecutionResponse])
def get_workflow_executions(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    workflow_service = WorkflowService(db)
    return workflow_service.get_workflow_executions(workflow_id, current_user.tenant_id)