from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
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
    
    # 👇 FIX: Added created_at column for AI Insights 👇
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

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

    user = relationship("User", foreign_keys=[user_id])

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True) 
    message = Column(String)
    is_read = Column(Boolean, default=False, index=True) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

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