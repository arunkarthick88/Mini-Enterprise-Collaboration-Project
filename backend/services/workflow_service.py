from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from repositories.workflow_repository import WorkflowRepository
from models import WorkflowDefinition, WorkflowRule
from schemas import WorkflowDefinitionCreate, WorkflowDefinitionUpdate, WorkflowRuleCreate

class WorkflowService:
    def __init__(self, db: Session):
        self.repository = WorkflowRepository(db)

    def create_workflow(self, tenant_id: int, data: WorkflowDefinitionCreate) -> WorkflowDefinition:
        new_workflow = WorkflowDefinition(
            tenant_id=tenant_id,
            name=data.name,
            workflow_type=data.workflow_type,
            description=data.description,
            is_active=data.is_active
        )
        return self.repository.create_definition(new_workflow)

    def list_workflows(self, tenant_id: int) -> List[WorkflowDefinition]:
        return self.repository.get_definitions_by_tenant(tenant_id)

    def get_workflow(self, workflow_id: int, tenant_id: int) -> WorkflowDefinition:
        workflow = self.repository.get_definition_by_id(workflow_id, tenant_id)
        if not workflow:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found or access denied")
        return workflow

    def update_workflow(self, workflow_id: int, tenant_id: int, data: WorkflowDefinitionUpdate) -> WorkflowDefinition:
        workflow = self.get_workflow(workflow_id, tenant_id)
        
        if data.name is not None:
            workflow.name = data.name
        if data.description is not None:
            workflow.description = data.description
        if data.is_active is not None:
            workflow.is_active = data.is_active
            
        return self.repository.update_definition(workflow)

    def disable_workflow(self, workflow_id: int, tenant_id: int):
        workflow = self.get_workflow(workflow_id, tenant_id)
        self.repository.disable_definition(workflow)
        return {"message": "Workflow disabled successfully"}

    def add_rule(self, workflow_id: int, tenant_id: int, data: WorkflowRuleCreate) -> WorkflowRule:
        # Verifies the workflow actually belongs to this tenant before adding a rule
        self.get_workflow(workflow_id, tenant_id)
        
        new_rule = WorkflowRule(
            workflow_id=workflow_id,
            trigger_event=data.trigger_event,
            condition_type=data.condition_type,
            condition_value=data.condition_value,
            action_type=data.action_type,
            action_value=data.action_value
        )
        return self.repository.add_rule(new_rule)
        
    def get_workflow_executions(self, workflow_id: int, tenant_id: int):
        # Verify ownership first
        self.get_workflow(workflow_id, tenant_id)
        return self.repository.get_executions_by_workflow(workflow_id)