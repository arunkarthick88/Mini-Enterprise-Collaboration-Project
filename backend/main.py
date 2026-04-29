from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth_router, task_router, approval_router

# Create database tables
Base.metadata.create_all(bind=engine) 

app = FastAPI(title="Enterprise Collab API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # You can change "*" to ["http://localhost:5173"] for strict security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router.router)
app.include_router(task_router.router)
app.include_router(approval_router.router) # <-- Added the new approval router

# Root Endpoint
@app.get("/")
def root():
    return {"message": "Enterprise Collab API is running"}