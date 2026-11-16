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

# ── FORCE DU MOT DE PASSE ──────────────────────────────────────
import re

def criteres_mdp(mdp: str) -> dict:
    """Évalue chaque critère de force du mot de passe."""
    mdp = mdp or ""
    return {
        "longueur_8":  len(mdp) >= 8,
        "majuscule":   bool(re.search(r"[A-Z]", mdp)),
        "minuscule":   bool(re.search(r"[a-z]", mdp)),
        "chiffre":     bool(re.search(r"[0-9]", mdp)),
        "special":     bool(re.search(r"[^A-Za-z0-9]", mdp)),
        "longueur_12": len(mdp) >= 12,  # excellent
    }

def force_mdp(mdp: str) -> str:
    """faible | moyen | fort | excellent — 'fort' = minimum accepté."""
    c = criteres_mdp(mdp)
    requis = all(c[k] for k in ("longueur_8", "majuscule", "minuscule", "chiffre", "special"))
    if requis and c["longueur_12"]: return "excellent"
    if requis: return "fort"
    if sum(c.values()) >= 3: return "moyen"
    return "faible"

MDP_LABELS = {"longueur_8": "8 caractères minimum", "majuscule": "une majuscule",
              "minuscule": "une minuscule", "chiffre": "un chiffre",
              "special": "un caractère spécial (!@#...)", "longueur_12": "12 caractères ou plus"}

def valider_mot_de_passe_fort(mdp: str):
    """Refuse un mot de passe qui n'atteint pas le niveau 'fort'."""
    c = criteres_mdp(mdp)
    manquants = [MDP_LABELS[k] for k in ("longueur_8", "majuscule", "minuscule", "chiffre", "special") if not c[k]]
    if manquants:
        raise HTTPException(422, "Mot de passe trop faible — il manque : " + ", ".join(manquants))

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
    # Heartbeat présence : rafraîchit derniere_connexion (max 1 fois/min/user)
    # pour que les compteurs « en ligne » du monitoring reflètent l'activité réelle
    try:
        now = datetime.utcnow()
        if user.derniere_connexion is None or (now - user.derniere_connexion).total_seconds() > 60:
            user.derniere_connexion = now
            db.commit()
    except Exception:
        db.rollback()
    return user

async def get_current_admin(user=Depends(get_current_user)):
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return user

async def get_current_staff(user=Depends(get_current_user)):
    """Admin + agents commerciaux : tableau de bord partagé.
    Les endpoints de gestion des agents/admins restent réservés à get_current_admin."""
    if user.role not in ("admin", "super_admin", "agent"):
        raise HTTPException(status_code=403, detail="Accès staff requis")
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
