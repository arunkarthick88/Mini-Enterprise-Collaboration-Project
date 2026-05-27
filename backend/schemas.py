from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: str
    name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    organization_id: Optional[int] = None 
    class Config:
        from_attributes = True

# --- COMMENT SCHEMAS ---
class CommentCreate(BaseModel):
    content: str
    is_internal: bool = False

class CommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    content: str
    is_internal: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- TASK SCHEMAS ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    assigned_to_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    status: str
    created_by_id: int
    updated_by_id: Optional[int] = None
    comments: List[CommentResponse] = [] 
    
    # PHASE 9 SLA ADDITIONS
    sla_status: Optional[str] = None
    sla_due_time: Optional[datetime] = None
    is_sla_breached: Optional[bool] = False # <-- FIX: Changed to Optional[bool]
    
    class Config:
        from_attributes = True

# --- APPROVAL HISTORY SCHEMAS ---
class ApprovalHistoryResponse(BaseModel):
    id: int
    action_by_id: int
    action: str
    comment: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

# --- APPROVAL SCHEMAS ---
class ApprovalCreate(BaseModel):
    title: str
    description: str

class ApprovalAction(BaseModel):
    action: str 
    comment: str 

class ApprovalResponse(BaseModel):
    id: int
    title: str
    description: str
    requested_by_id: int
    status: str
    current_level: str
    created_at: datetime
    history: List[ApprovalHistoryResponse] = []
    
    # PHASE 9 SLA & ESCALATION ADDITIONS
    sla_status: Optional[str] = None
    sla_due_time: Optional[datetime] = None
    is_escalated: Optional[bool] = False # <-- FIX: Changed to Optional[bool]
    current_escalation_to: Optional[int] = None
    
    class Config:
        from_attributes = True

# --- PHASE 4: Auth & Pagination Schemas ---
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GoogleLoginRequest(BaseModel):
    token: str

class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity: str | None
    entity_id: int | None
    timestamp: datetime
    
    # PHASE 9 AUDIT ADDITIONS
    module_name: Optional[str] = None
    action_type: Optional[str] = None
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True 

class PaginatedAuditLogResponse(BaseModel):
    total_items: int
    total_pages: int
    current_page: int
    items: List[AuditLogResponse]

# ==========================================
# --- PHASE 9: NEW GOVERNANCE SCHEMAS ---
# ==========================================

# 1. SLA Rules
class SLARuleBase(BaseModel):
    module_name: str
    priority: str
    allowed_hours: int
    escalation_enabled: bool = False
    escalation_after_hours: Optional[int] = None
    is_active: bool = True

class SLARuleCreate(SLARuleBase):
    pass

class SLARuleResponse(SLARuleBase):
    id: int
    created_by: int
    created_at: datetime
    class Config:
        from_attributes = True

# 2. SLA Tracking
class SLATrackingResponse(BaseModel):
    id: int
    module_name: str
    record_id: int
    sla_rule_id: int
    start_time: datetime
    due_time: datetime
    completed_time: Optional[datetime] = None
    status: str
    breach_reason: Optional[str] = None
    class Config:
        from_attributes = True

# 3. Approval Escalations
class ApprovalEscalationCreate(BaseModel):
    approval_id: int
    escalated_to: int
    reason: str

class ApprovalEscalationResponse(BaseModel):
    id: int
    approval_id: int
    escalated_from: int
    escalated_to: int
    reason: str
    escalation_level: int
    status: str
    escalated_at: datetime
    resolved_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# 4. Approval Delegations
class ApprovalDelegationCreate(BaseModel):
    delegatee_id: int
    start_date: datetime
    end_date: datetime
    reason: str

class ApprovalDelegationResponse(BaseModel):
    id: int
    delegator_id: int
    delegatee_id: int
    start_date: datetime
    end_date: datetime
    reason: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# 5. Notification Preferences
class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: bool
    email_enabled: bool
    task_notifications: bool
    approval_notifications: bool
    escalation_notifications: bool
    document_notifications: bool

class NotificationPreferenceResponse(NotificationPreferenceUpdate):
    id: int
    user_id: int
    class Config:
        from_attributes = True