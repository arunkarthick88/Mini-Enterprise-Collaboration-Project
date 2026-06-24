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
    tenant_id: Optional[int] = None # Added in 10A
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
    
    # PHASE 10B & 10C ADDITIONS (To allow creating tasks inside workspaces/channels/projects)
    workspace_id: Optional[int] = None
    channel_id: Optional[int] = None
    project_id: Optional[int] = None
    team_id: Optional[int] = None

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
    is_sla_breached: Optional[bool] = False
    
    # PHASE 10B TENANT SCOPING
    tenant_id: Optional[int] = None
    
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
    is_escalated: Optional[bool] = False
    current_escalation_to: Optional[int] = None
    
    # PHASE 10B TENANT SCOPING
    tenant_id: Optional[int] = None
    workspace_id: Optional[int] = None
    channel_id: Optional[int] = None
    
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


# ==========================================
# --- PHASE 10A: SAAS & TENANT SCHEMAS ---
# ==========================================

# Tenant Schemas
class TenantBase(BaseModel):
    name: str
    contact_email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class TenantResponse(TenantBase):
    id: int
    slug: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

# Tenant Onboarding & Settings
class TenantOnboardingResponse(BaseModel):
    id: int
    tenant_id: int
    admin_user_id: int
    onboarding_status: str
    default_workspace_created: bool
    settings_created: bool
    class Config:
        from_attributes = True

class TenantSettingsUpdate(BaseModel):
    max_workspaces: int
    max_channels_per_workspace: int
    max_workspace_members: int
    max_storage_mb: int
    workspace_enabled: bool
    channel_enabled: bool

class TenantSettingsResponse(TenantSettingsUpdate):
    id: int
    tenant_id: int
    class Config:
        from_attributes = True

class TenantUsageResponse(BaseModel):
    id: int
    tenant_id: int
    workspace_count: int
    channel_count: int
    member_count: int
    storage_used_mb: int
    last_calculated_at: datetime
    class Config:
        from_attributes = True

# Workspace Schemas
class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None
    visibility: str = "PRIVATE"
    avatar_url: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceResponse(WorkspaceBase):
    id: int
    tenant_id: int
    slug: str
    created_by: int
    is_archived: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Workspace Member Schemas
class WorkspaceMemberCreate(BaseModel):
    user_id: int
    role: str = "Member"

class WorkspaceMemberResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    role: str
    joined_at: datetime
    is_active: bool
    class Config:
        from_attributes = True

# Channel Schemas
class ChannelBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "PUBLIC"

class ChannelCreate(ChannelBase):
    pass

class ChannelResponse(ChannelBase):
    id: int
    tenant_id: int
    workspace_id: int
    project_id: Optional[int] = None # Added for 10C
    created_by: int
    is_archived: bool
    created_at: datetime
    class Config:
        from_attributes = True

class ChannelMemberResponse(BaseModel):
    id: int
    channel_id: int
    user_id: int
    joined_at: datetime
    is_muted: bool
    class Config:
        from_attributes = True

# ==========================================
# --- PHASE 10B: MESSAGES & DOCUMENTS ---
# ==========================================

class MessageBase(BaseModel):
    content: str
    message_type: str = "text"

class WorkspaceMessageCreate(MessageBase):
    pass

class WorkspaceMessageResponse(MessageBase):
    id: int
    tenant_id: int
    workspace_id: int
    sender_id: int
    content: str
    message_type: str
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ChannelMessageCreate(MessageBase):
    pass

class ChannelMessageResponse(MessageBase):
    id: int
    tenant_id: int
    workspace_id: int
    channel_id: int
    sender_id: int
    content: str
    message_type: str
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class TaskDocumentResponse(BaseModel):
    id: int
    tenant_id: int
    task_id: int
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: int
    document_type: str
    created_at: datetime
    class Config:
        from_attributes = True

class ApprovalDocumentResponse(BaseModel):
    id: int
    tenant_id: int
    approval_id: int
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: int
    document_type: str
    created_at: datetime
    class Config:
        from_attributes = True


# =========================================================
# --- PHASE 10C: TEAMS, PROJECTS & MEETINGS SCHEMAS ---
# =========================================================

# 1. Team Schemas
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: int

class TeamCreate(TeamBase):
    pass

class TeamResponse(TeamBase):
    id: int
    tenant_id: int
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class TeamMemberCreate(BaseModel):
    user_id: int
    role: str = "Member"

class TeamMemberResponse(BaseModel):
    id: int
    tenant_id: int
    team_id: int
    user_id: int
    role: str
    joined_at: datetime
    is_active: bool
    class Config:
        from_attributes = True

# 2. Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    workspace_id: int
    status: str = "PLANNED"
    priority: str = "MEDIUM"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    owner_id: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: int
    tenant_id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ProjectTeamResponse(BaseModel):
    id: int
    tenant_id: int
    project_id: int
    team_id: int
    assigned_at: datetime
    class Config:
        from_attributes = True

class ProjectDocumentResponse(BaseModel):
    id: int
    tenant_id: int
    project_id: int
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: int
    document_type: str
    created_at: datetime
    class Config:
        from_attributes = True

# 3. Meeting Schemas
class MeetingBase(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime

class MeetingCreate(MeetingBase):
    pass

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None

class MeetingResponse(MeetingBase):
    id: int
    tenant_id: int
    created_by: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class MeetingAttendeeCreate(BaseModel):
    user_id: int

class MeetingAttendeeResponse(BaseModel):
    id: int
    tenant_id: int
    meeting_id: int
    user_id: int
    attendance_status: str
    class Config:
        from_attributes = True

class MeetingNoteCreate(BaseModel):
    notes: str

class MeetingNoteResponse(BaseModel):
    id: int
    tenant_id: int
    meeting_id: int
    notes: str
    created_by: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class AIMeetingSummaryResponse(BaseModel):
    id: int
    tenant_id: int
    meeting_id: int
    summary: Optional[str] = None
    action_items: Optional[str] = None
    risks: Optional[str] = None
    decisions: Optional[str] = None
    generated_at: datetime
    class Config:
        from_attributes = True