from pydantic import BaseModel
from typing import Optional, List
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
    
    # 👇 PHASE 7 FIX: Allow React to see the user's organization 👇
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
    action: str # approve, reject, hold
    comment: str # Mandatory for rejection

class ApprovalResponse(BaseModel):
    id: int
    title: str
    description: str
    requested_by_id: int
    status: str
    current_level: str
    created_at: datetime
    history: List[ApprovalHistoryResponse] = []
    class Config:
        from_attributes = True

# --- PHASE 4: Password Reset Schemas ---
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# --- PHASE 4: OAuth Schemas ---
class GoogleLoginRequest(BaseModel):
    token: str

# --- PHASE 4: Pagination Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity: str | None
    entity_id: int | None
    timestamp: datetime

    class Config:
        from_attributes = True 

class PaginatedAuditLogResponse(BaseModel):
    total_items: int
    total_pages: int
    current_page: int
    items: List[AuditLogResponse]