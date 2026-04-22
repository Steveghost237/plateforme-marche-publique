from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/connexion", auto_error=False)

def hash_password(p: str) -> str: return pwd_context.hash(p)
def verify_password(plain: str, hashed: str) -> bool: return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_minutes: int = None) -> str:
    mins = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    d = {**data, "exp": datetime.utcnow() + timedelta(minutes=mins)}
    if "type" not in d: d["type"] = "access"
    return jwt.encode(d, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(data: dict) -> str:
    d = {**data, "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), "type": "refresh"}
    return jwt.encode(d, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    from app.models.models import Utilisateur
    payload = decode_token(token)
    user = db.query(Utilisateur).filter(Utilisateur.id == payload.get("sub"), Utilisateur.deleted_at.is_(None)).first()
    if not user or user.statut != "actif":
        raise HTTPException(status_code=401, detail="Utilisateur invalide")
    return user

async def get_current_admin(user=Depends(get_current_user)):
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return user

async def get_optional_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        from app.models.models import Utilisateur
        payload = decode_token(token)
        return db.query(Utilisateur).filter(Utilisateur.id == payload.get("sub")).first()
    except:
        return None
