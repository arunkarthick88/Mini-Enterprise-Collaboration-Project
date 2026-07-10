from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from models import WorkflowDefinition, WorkflowRule, WorkflowExecution

class WorkflowRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Workflow Definitions ---
    def create_definition(self, definition: WorkflowDefinition) -> WorkflowDefinition:
        self.db.add(definition)
        self.db.commit()
        self.db.refresh(definition)
        return definition

    def get_definitions_by_tenant(self, tenant_id: int) -> List[WorkflowDefinition]:
        stmt = select(WorkflowDefinition).where(WorkflowDefinition.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())

    def get_definition_by_id(self, workflow_id: int, tenant_id: int) -> Optional[WorkflowDefinition]:
        stmt = select(WorkflowDefinition).where(
            WorkflowDefinition.id == workflow_id,
            WorkflowDefinition.tenant_id == tenant_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def update_definition(self, definition: WorkflowDefinition) -> WorkflowDefinition:
        self.db.commit()
        self.db.refresh(definition)
        return definition

    def disable_definition(self, definition: WorkflowDefinition):
        definition.is_active = False
        self.db.commit()

    # --- Workflow Rules ---
    def add_rule(self, rule: WorkflowRule) -> WorkflowRule:
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule
        
    def get_rules_by_workflow(self, workflow_id: int) -> List[WorkflowRule]:
        stmt = select(WorkflowRule).where(WorkflowRule.workflow_id == workflow_id)
        return list(self.db.execute(stmt).scalars().all())

    # --- Workflow Executions ---
    def get_executions_by_workflow(self, workflow_id: int) -> List[WorkflowExecution]:
        stmt = select(WorkflowExecution).where(WorkflowExecution.workflow_id == workflow_id)
        return list(self.db.execute(stmt).scalars().all())