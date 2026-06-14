from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime

# ==========================================
# PHASE 1 & 2 MODELS (Core & Approvals)
# ==========================================

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="employee", index=True) 

    # --- PHASE 7: SaaS & Multi-Tenancy ---
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    organization = relationship("Organization", back_populates="users")
    # -------------------------------------

    # --- PHASE 10A: SAAS Tenant ---
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    # -------------------------------------

    tasks_created = relationship("Task", foreign_keys="[Task.created_by_id]", back_populates="creator")
    tasks_assigned = relationship("Task", foreign_keys="[Task.assigned_to_id]", back_populates="assignee")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    priority = Column(String, default="medium", index=True) 
    status = Column(String, default="todo", index=True)     
    created_by_id = Column(Integer, ForeignKey("users.id"))
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) 
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # --- PHASE 9: SLA Tracking ---
    sla_status = Column(String(50), nullable=True)
    sla_due_time = Column(DateTime, nullable=True)
    is_sla_breached = Column(Boolean, default=False)
    
    # --- PHASE 10B: Workspace & Channel Scoping ---
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=True, index=True)
    # ----------------------------------------------

    creator = relationship("User", foreign_keys=[created_by_id], back_populates="tasks_created")
    assignee = relationship("User", foreign_keys=[assigned_to_id], back_populates="tasks_assigned")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True) 
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    is_internal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    task = relationship("Task", back_populates="comments")
    user = relationship("User")

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    requested_by_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending", index=True) 
    current_level = Column(String, default="manager") 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # --- PHASE 9: SLA & Escalations ---
    sla_status = Column(String(50), nullable=True)
    sla_due_time = Column(DateTime, nullable=True)
    is_escalated = Column(Boolean, default=False)
    current_escalation_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # --- PHASE 10B: Workspace & Channel Scoping ---
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=True, index=True)
    # ----------------------------------------------

    requester = relationship("User", foreign_keys=[requested_by_id])
    history = relationship("ApprovalHistory", back_populates="approval", cascade="all, delete-orphan")

class ApprovalHistory(Base):
    __tablename__ = "approval_history"
    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), index=True) 
    action_by_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String) 
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    approval = relationship("Approval", back_populates="history")
    actor = relationship("User", foreign_keys=[action_by_id])


# ==========================================
# PHASE 3 MODELS (Enterprise Features)
# ==========================================

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, index=True)
    file_path = Column(String)
    version = Column(Integer, default=1)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    uploader = relationship("User", foreign_keys=[uploaded_by])
    task = relationship("Task")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, index=True) 
    entity = Column(String) 
    entity_id = Column(Integer)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True) 
    
    # --- PHASE 9: Enhanced Audit Data ---
    module_name = Column(String(50), nullable=True)
    action_type = Column(String(50), nullable=True)
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)

    user = relationship("User", foreign_keys=[user_id])

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True) 
    message = Column(String)
    is_read = Column(Boolean, default=False, index=True) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # --- PHASE 9: Categorization ---
    notification_type = Column(String(50), default="general")
    priority = Column(String(20), default="medium")

    user = relationship("User", foreign_keys=[user_id])


# ==========================================
# PHASE 7 MODELS (SaaS & Multi-Tenancy)
# ==========================================

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    # Billing & Subscription
    stripe_customer_id = Column(String, unique=True, index=True, nullable=True)
    subscription_plan = Column(String, default="basic") # basic, silver, gold
    subscription_status = Column(String, default="active") # active, past_due, canceled
    
    # Credit-based usage
    ai_credits = Column(Integer, default=100) 
    
    # Relationships
    users = relationship("User", back_populates="organization")


# ==========================================
# PHASE 9 MODELS (SLA & Governance)
# ==========================================

class SLARule(Base):
    __tablename__ = "sla_rules"
    id = Column(Integer, primary_key=True, index=True)
    module_name = Column(String(50), index=True) # "Task" or "Approval"
    priority = Column(String(50)) # "low", "medium", "high"
    allowed_hours = Column(Integer)
    escalation_enabled = Column(Boolean, default=False)
    escalation_after_hours = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SLATracking(Base):
    __tablename__ = "sla_tracking"
    id = Column(Integer, primary_key=True, index=True)
    module_name = Column(String(50), index=True)
    record_id = Column(Integer, index=True)
    sla_rule_id = Column(Integer, ForeignKey("sla_rules.id"))
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    due_time = Column(DateTime)
    completed_time = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE") # ACTIVE, BREACHED, COMPLETED
    breach_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ApprovalEscalation(Base):
    __tablename__ = "approval_escalations"
    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"))
    escalated_from = Column(Integer, ForeignKey("users.id"))
    escalated_to = Column(Integer, ForeignKey("users.id"))
    reason = Column(Text)
    escalation_level = Column(Integer, default=1)
    status = Column(String(50), default="PENDING") # PENDING, RESOLVED, CANCELLED
    escalated_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class ApprovalDelegation(Base):
    __tablename__ = "approval_delegations"
    id = Column(Integer, primary_key=True, index=True)
    delegator_id = Column(Integer, ForeignKey("users.id"))
    delegatee_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    reason = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    in_app_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    task_notifications = Column(Boolean, default=True)
    approval_notifications = Column(Boolean, default=True)
    escalation_notifications = Column(Boolean, default=True)
    document_notifications = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# ==========================================
# --- PHASE 10A: SAAS & MULTI-TENANCY ---
# ==========================================

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    slug = Column(String, unique=True, index=True)
    contact_email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    status = Column(String, default="ACTIVE") # ACTIVE, SUSPENDED, TRIAL, CANCELLED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class TenantOnboarding(Base):
    __tablename__ = "tenant_onboarding"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    admin_user_id = Column(Integer, ForeignKey("users.id"))
    onboarding_status = Column(String, default="PENDING") # PENDING, COMPLETED, FAILED
    default_workspace_created = Column(Boolean, default=False)
    settings_created = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TenantCollaborationSetting(Base):
    __tablename__ = "tenant_collaboration_settings"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True)
    max_workspaces = Column(Integer, default=5)
    max_channels_per_workspace = Column(Integer, default=20)
    max_workspace_members = Column(Integer, default=50)
    max_storage_mb = Column(Integer, default=5000) # 5GB Default
    workspace_enabled = Column(Boolean, default=True)
    channel_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class TenantCollaborationUsage(Base):
    __tablename__ = "tenant_collaboration_usage"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True)
    workspace_count = Column(Integer, default=0)
    channel_count = Column(Integer, default=0)
    member_count = Column(Integer, default=0)
    storage_used_mb = Column(Integer, default=0)
    last_calculated_at = Column(DateTime, default=datetime.datetime.utcnow)

class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    name = Column(String, index=True)
    slug = Column(String, index=True)
    description = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    visibility = Column(String, default="PRIVATE") # PUBLIC or PRIVATE
    created_by = Column(Integer, ForeignKey("users.id"))
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, default="Member") # Workspace Admin, Moderator, Member, Viewer
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)

class Channel(Base):
    __tablename__ = "channels"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    type = Column(String, default="PUBLIC") # PUBLIC, PRIVATE, ANNOUNCEMENT, PROJECT
    created_by = Column(Integer, ForeignKey("users.id"))
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ChannelMember(Base):
    __tablename__ = "channel_members"
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_muted = Column(Boolean, default=False)
    last_read_message_id = Column(Integer, nullable=True) # Pre-configured for Phase 10B Chat

# ==========================================
# --- PHASE 10B: MESSAGES & DOCUMENTS ---
# ==========================================

class WorkspaceMessage(Base):
    __tablename__ = "workspace_messages"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    message_type = Column(String(50), default="text")
    edited_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ChannelMessage(Base):
    __tablename__ = "channel_messages"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    message_type = Column(String(50), default="text")
    edited_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class TaskDocument(Base):
    __tablename__ = "task_documents"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    file_name = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    mime_type = Column(String)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    document_type = Column(String(50), default="REFERENCE") # REQUIREMENT, SPECIFICATION, REFERENCE, DELIVERABLE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ApprovalDocument(Base):
    __tablename__ = "approval_documents"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), index=True)
    file_name = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    mime_type = Column(String)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    document_type = Column(String(50), default="REFERENCE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)