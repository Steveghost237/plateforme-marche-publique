import random, string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user
from app.models.models import Utilisateur, FideliteCompte
from app.schemas.schemas import DemandeOTPIn, VerifOTPIn, FinaliserInscriptionIn, ConnexionIn, RefreshIn, TokenOut, UtilisateurOut, UtilisateurUpdateIn

router = APIRouter(prefix="/auth", tags=["Authentification"])

def gen_otp(): return "".join(random.choices(string.digits, k=6))

@router.post("/inscription/otp")
def demande_otp(p: DemandeOTPIn, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
    if user and user.statut == "actif":
        raise HTTPException(409, "Numéro déjà enregistré")
    otp = gen_otp()
    expire = datetime.utcnow() + timedelta(minutes=5)
    if not user:
        user = Utilisateur(telephone=p.telephone, nom_complet="", operateur=p.operateur,
                           otp_code=otp, otp_expire_at=expire, otp_tentatives=0)
        db.add(user)
    else:
        user.otp_code = otp; user.otp_expire_at = expire; user.otp_tentatives = 0
    db.commit()
    print(f"[OTP DEV] {p.telephone} → {otp}")
    return {"message": "OTP envoyé", "otp_dev": otp}

@router.post("/inscription/verifier")
def verifier_otp(p: VerifOTPIn, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
    if not user: raise HTTPException(404, "Numéro introuvable")
    if (user.otp_tentatives or 0) >= 3: raise HTTPException(429, "Trop de tentatives")
    if not user.otp_expire_at or datetime.utcnow() > user.otp_expire_at: raise HTTPException(400, "OTP expiré")
    if user.otp_code != p.otp_code:
        user.otp_tentatives = (user.otp_tentatives or 0) + 1; db.commit()
        raise HTTPException(400, "OTP incorrect")
    user.otp_code = None; user.otp_tentatives = 0; db.commit()
    return {"message": "OTP vérifié"}

@router.post("/inscription/finaliser", response_model=TokenOut)
def finaliser(p: FinaliserInscriptionIn, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
    if not user: raise HTTPException(404, "Numéro introuvable")
    if user.statut == "actif": raise HTTPException(409, "Déjà actif")
    user.nom_complet = p.nom_complet
    user.mot_de_passe_hash = hash_password(p.mot_de_passe)
    user.email = p.email; user.statut = "actif"
    if not db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first():
        db.add(FideliteCompte(utilisateur_id=user.id))
    db.commit(); db.refresh(user)
    return TokenOut(access_token=create_access_token({"sub": str(user.id)}),
                    refresh_token=create_refresh_token({"sub": str(user.id)}),
                    user=UtilisateurOut.model_validate(user))

@router.post("/connexion", response_model=TokenOut)
def connexion(p: ConnexionIn, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone, Utilisateur.deleted_at.is_(None)).first()
    if not user or not verify_password(p.mot_de_passe, user.mot_de_passe_hash or ""):
        raise HTTPException(401, "Identifiants incorrects")
    if user.statut != "actif": raise HTTPException(403, f"Compte {user.statut}")
    user.derniere_connexion = datetime.utcnow(); db.commit()
    return TokenOut(access_token=create_access_token({"sub": str(user.id)}),
                    refresh_token=create_refresh_token({"sub": str(user.id)}),
                    user=UtilisateurOut.model_validate(user))

@router.post("/refresh", response_model=TokenOut)
def refresh(p: RefreshIn, db: Session = Depends(get_db)):
    data = decode_token(p.refresh_token)
    if data.get("type") != "refresh": raise HTTPException(400, "Mauvais type de token")
    user = db.query(Utilisateur).filter(Utilisateur.id == data["sub"]).first()
    if not user: raise HTTPException(404, "Introuvable")
    return TokenOut(access_token=create_access_token({"sub": str(user.id)}),
                    refresh_token=create_refresh_token({"sub": str(user.id)}),
                    user=UtilisateurOut.model_validate(user))

@router.get("/me", response_model=UtilisateurOut)
def me(user=Depends(get_current_user)): return user

@router.put("/me", response_model=UtilisateurOut)
def update_me(p: UtilisateurUpdateIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    for k, v in p.model_dump(exclude_none=True).items(): setattr(user, k, v)
    db.commit(); db.refresh(user); return user
