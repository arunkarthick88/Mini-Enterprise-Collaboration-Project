from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
import logging
import time

# --- Setup Python Logging ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Create database tables instantly
models.Base.metadata.create_all(bind=engine) 

app = FastAPI(title="Enterprise Collab API")

# --- Logging Middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Path: {request.url.path} | Method: {request.method} | Status: {response.status_code} | Time: {process_time:.4f}s")
    return response

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
from routers import auth_router, task_router, approval_router, audit_router, notification_router, document_router, dashboard_router
app.include_router(auth_router.router)
app.include_router(task_router.router)
app.include_router(approval_router.router) 
app.include_router(audit_router.router)
app.include_router(notification_router.router)
app.include_router(document_router.router)
app.include_router(dashboard_router.router)

@app.get("/")
def root():
    return {"message": "Enterprise Collab API is running"}