from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import string
import random
from datetime import datetime
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/tenants",
    tags=["Tenant Management (Phase 10A)"],
    responses={404: {"description": "Not found"}},
)

def generate_slug(name: str) -> str:
    """Generates a URL-friendly unique slug from a tenant name."""
    base_slug = "".join(e for e in name.lower() if e.isalnum())
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{base_slug}-{random_suffix}"

# ==========================================
# 1. Tenant CRUD Operations
# ==========================================

@router.post("/", response_model=schemas.TenantResponse)
def create_tenant(
    tenant: schemas.TenantCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin) # Only System Admins can create Tenants
):
    """Creates a new Tenant (Organization) in the SaaS platform."""
    
    # Check for duplicate email
    if db.query(models.Tenant).filter(models.Tenant.contact_email == tenant.contact_email).first():
        raise HTTPException(status_code=400, detail="A tenant with this contact email already exists.")
        
    slug = generate_slug(tenant.name)
    
    new_tenant = models.Tenant(
        **tenant.dict(),
        slug=slug
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@router.get("/", response_model=List[schemas.TenantResponse])
def list_tenants(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Lists all tenants on the platform."""
    return db.query(models.Tenant).all()

@router.get("/{tenant_id}", response_model=schemas.TenantResponse)
def get_tenant(
    tenant_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.patch("/{tenant_id}/suspend")
def suspend_tenant(
    tenant_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.status = "SUSPENDED"
    db.commit()
    return {"message": f"Tenant {tenant.name} has been suspended."}


# ==========================================
# 2. Tenant Onboarding (Create First Admin)
# ==========================================

@router.post("/{tenant_id}/onboard", response_model=schemas.TenantOnboardingResponse)
def onboard_tenant_admin(
    tenant_id: int, 
    admin_user: schemas.UserCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    """
    Onboards a tenant by creating their first Admin user and 
    initializing their collaboration settings.
    """
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    # 1. Create the Admin User
    existing_user = db.query(models.User).filter(models.User.email == admin_user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered in the system.")
        
    hashed_pwd = auth.get_password_hash(admin_user.password)
    new_admin = models.User(
        email=admin_user.email,
        name=admin_user.name,
        hashed_password=hashed_pwd,
        role="admin", # Force role to admin
        tenant_id=tenant.id # Link to tenant
    )
    db.add(new_admin)
    db.flush() # Flush to get the new_admin.id without committing yet
    
    # 2. Initialize Default Collaboration Settings
    settings = models.TenantCollaborationSetting(tenant_id=tenant.id)
    db.add(settings)
    
    # 3. Initialize Usage Tracking Tracker
    usage = models.TenantCollaborationUsage(tenant_id=tenant.id)
    db.add(usage)
    
    # 4. Create Onboarding Record
    onboarding = models.TenantOnboarding(
        tenant_id=tenant.id,
        admin_user_id=new_admin.id,
        onboarding_status="COMPLETED",
        settings_created=True,
        completed_at=datetime.utcnow()
    )
    db.add(onboarding)
    
    db.commit()
    db.refresh(onboarding)
    return onboarding


# ==========================================
# 3. Collaboration Settings Management
# ==========================================

@router.get("/{tenant_id}/collaboration/settings", response_model=schemas.TenantSettingsResponse)
def get_tenant_settings(
    tenant_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    settings = db.query(models.TenantCollaborationSetting).filter(
        models.TenantCollaborationSetting.tenant_id == tenant_id
    ).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found for this tenant")
    return settings

@router.get("/{tenant_id}/collaboration/usage", response_model=schemas.TenantUsageResponse)
def get_tenant_usage(
    tenant_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_admin)
):
    usage = db.query(models.TenantCollaborationUsage).filter(
        models.TenantCollaborationUsage.tenant_id == tenant_id
    ).first()
    if not usage:
        raise HTTPException(status_code=404, detail="Usage data not found for this tenant")
    return usage