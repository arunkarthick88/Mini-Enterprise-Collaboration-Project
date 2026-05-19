from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
import logging
import time
from contextlib import asynccontextmanager

# --- PHASE 5: WebSocket Manager ---
from websocket_manager import manager

# --- Caching Imports ---
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

# --- Rate Limiter Imports ---
from rate_limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# --- Setup Python Logging ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine) 

# --- Lifespan (Startup/Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initializing In-Memory Cache (Fulfills the caching requirement without external Redis)
    FastAPICache.init(InMemoryBackend(), prefix="enterprise-cache")
    logger.info("✅ Caching System initialized successfully (In-Memory)")
    yield
# ---------------------------------------------

app = FastAPI(title="Enterprise Collab API", lifespan=lifespan)

# --- Rate Limiter Setup ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
from routers import (
    auth_router, 
    task_router, 
    approval_router, 
    audit_router, 
    notification_router, 
    document_router, 
    dashboard_router,
    billing_router # <-- PHASE 7: NEW BILLING ROUTER
)

app.include_router(auth_router.router)
app.include_router(task_router.router)
app.include_router(approval_router.router) 
app.include_router(audit_router.router)
app.include_router(notification_router.router)
app.include_router(document_router.router)
app.include_router(dashboard_router.router)
app.include_router(billing_router.router) # <-- PHASE 7: REGISTER BILLING ROUTER


# --- PHASE 5: REAL-TIME WEBSOCKET ENDPOINT ---
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """
    This endpoint establishes a continuous connection with the frontend.
    """
    await manager.connect(user_id, websocket)
    try:
        while True:
            # We keep the connection alive by listening for any data
            data = await websocket.receive_text() 
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        logger.info(f"User {user_id} disconnected from WebSocket")
# ---------------------------------------------

@app.get("/")
def root():
    return {"message": "Enterprise Collab API is running"}