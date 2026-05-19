from fastapi import APIRouter, Depends, HTTPException, Header, Request # <-- NEW: Added Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from jose import JWTError, jwt
import models, schemas, auth, database

# --- NEW: Security Imports ---
from rate_limiter import limiter

# --- NEW: Google OAuth Imports ---
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import secrets

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = "949460482338-v24cpc3penalgr80jtnsi01ma2vkrgpj.apps.googleusercontent.com"

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user: raise HTTPException(status_code=400, detail="Email registered")
    
    hashed_pw = auth.get_password_hash(user.password)
    new_user = models.User(name=user.name, email=user.email, hashed_password=hashed_pw, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- NEW: Rate Limited Login Route ---
@router.post("/login")
@limiter.limit("5/minute") # <-- RATE LIMITER APPLIED HERE
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    # Issue both Access and Refresh tokens
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = auth.create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer", 
        "role": user.role,
        "user": {"id": user.id, "name": user.name, "role": user.role, "email": user.email}
    }

@router.post("/refresh")
def refresh_access_token(refresh_token: str = Header(..., alias="Authorization")):
    try:
        # Strip the "Bearer " prefix if it was sent automatically by the client
        token = refresh_token.replace("Bearer ", "") if refresh_token.startswith("Bearer ") else refresh_token
        
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        # Security check: Ensure they didn't just send a regular access token
        if email is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token format")
            
        # Re-verify the user exists
        db = next(database.get_db())
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        # Issue a fresh, short-lived access token
        new_access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
        
        return {"access_token": new_access_token, "token_type": "bearer"}
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

# --- PHASE 4: Password Reset Routes ---
@router.post("/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user:
        # Security best practice: Don't reveal if an email exists or not to prevent enumeration attacks
        return {"message": "If that email exists, a password reset link has been sent."}
    
    reset_token = auth.create_password_reset_token(user.email)
    
    # In a real app, you would use a library like fastapi-mail to send an actual email here.
    # For this project, we will simulate it by printing to the server terminal:
    print(f"\n--- SIMULATED EMAIL ---")
    print(f"To: {user.email}")
    print(f"Subject: TaskFlow Password Reset")
    print(f"Link: http://localhost:5173/reset-password?token={reset_token}")
    print(f"-----------------------\n")
    
    return {"message": "If that email exists, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(database.get_db)):
    email = auth.verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Hash the new password and save it
    user.hashed_password = auth.get_password_hash(request.new_password)
    db.commit()
    
    return {"message": "Password has been reset successfully."}
# --------------------------------------

# --- PHASE 4: Google OAuth Route ---
@router.post("/google-login")
def google_login(request: schemas.GoogleLoginRequest, db: Session = Depends(database.get_db)):
    try:
        # 1. Verify the token with Google's servers
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        email = idinfo['email']
        name = idinfo.get('name', 'Google User')

        # 2. Check if the user already exists in our database
        user = db.query(models.User).filter(models.User.email == email).first()

        if not user:
            # 3. If they don't exist, create an account for them automatically!
            # Since they log in with Google, we generate a random, impossible-to-guess password
            random_password = secrets.token_urlsafe(32)
            hashed_pw = auth.get_password_hash(random_password)
            
            user = models.User(
                name=name, 
                email=email, 
                hashed_password=hashed_pw, 
                role="employee" # Default role for new Google signups
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # 4. Issue our standard TaskFlow Access and Refresh tokens
        access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
        refresh_token = auth.create_refresh_token(data={"sub": user.email})

        return {
            "access_token": access_token, 
            "refresh_token": refresh_token,
            "token_type": "bearer", 
            "role": user.role,
            "user": {"id": user.id, "name": user.name, "role": user.role, "email": user.email}
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google authentication token")
# -----------------------------------

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.role_required(["admin", "manager"]))):
    # Only Admins and Managers are allowed to fetch the user list
    return db.query(models.User).all()

@router.get("/organization/{org_id}")
def get_organization(org_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Returns the organization details so the frontend can display subscription status."""
    
    # Security: Ensure user can only view their own org
    if current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this organization.")
        
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    return org