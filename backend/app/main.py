import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.routes import cat_router, adr_router, cmd_router, fid_router, notif_router, admin_router, liv_router
from app.api.routes_extra import (
    zones_router, suggest_router,
    admin_suggest_router, admin_prix_router, admin_zones_router
)

app = FastAPI(title="Marché en Ligne API", version="2.0.0", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in [
    auth_router, cat_router, adr_router, cmd_router,
    fid_router, notif_router, admin_router, liv_router,
    zones_router, suggest_router,
    admin_suggest_router, admin_prix_router, admin_zones_router,
]:
    app.include_router(r, prefix="/api")

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.get("/")
def root(): return {"app": "Marché en Ligne", "version": "2.0.0", "docs": "/docs"}

@app.get("/health")
def health(): return {"status": "ok"}
