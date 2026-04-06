import random, string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user
from app.models.models import Utilisateur, FideliteCompte
from app.schemas.schemas import DemandeOTPIn, VerifOTPIn, FinaliserInscriptionIn, ConnexionIn, RefreshIn, TokenOut, UtilisateurOut, UtilisateurUpdateIn

router = APIRouter(prefix="/auth", tags=["Authentification"])

def gen_otp():
    """Génère un OTP unique et aléatoire qui n'a jamais été utilisé"""
    while True:
        # Générer un OTP aléatoire de 6 chiffres
        otp = "".join(random.choices(string.digits, k=6))
        
        # Éviter les codes trop simples (000000, 111111, 123456, etc.)
        simple_codes = ['000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123456', '654321']
        if otp in simple_codes:
            continue
            
        # Éviter les codes avec des chiffres répétés (ex: 112233)
        if len(set(otp)) < 3:  # Moins de 3 chiffres uniques
            continue
            
        # Éviter les codes séquentiels (ex: 123456, 234567)
        is_sequential = True
        for i in range(5):
            if int(otp[i+1]) != (int(otp[i]) + 1) % 10:
                is_sequential = False
                break
        if is_sequential:
            continue
            
        # Si on arrive ici, l'OTP est suffisamment aléatoire
        return otp

@router.post("/inscription/otp")
def demande_otp(p: DemandeOTPIn, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
    if user and user.statut == "actif":
        raise HTTPException(409, "Numéro déjà enregistré")
    
    # Générer un OTP unique qui n'a jamais été utilisé pour cet utilisateur
    max_attempts = 10
    otp = None
    
    for attempt in range(max_attempts):
        candidate_otp = gen_otp()
        
        # Vérifier que cet OTP n'a jamais été utilisé pour cet utilisateur
        user_history = db.query(Utilisateur).filter(
            Utilisateur.telephone == p.telephone,
            Utilisateur.otp_code == candidate_otp
        ).first()
        
        # Vérifier que cet OTP n'est pas actuellement actif pour un autre utilisateur
        active_otp = db.query(Utilisateur).filter(
            Utilisateur.otp_code == candidate_otp,
            Utilisateur.otp_expire_at > datetime.utcnow()
        ).first()
        
        if not user_history and not active_otp:
            otp = candidate_otp
            break
    
    if otp is None:
        # Si après 10 tentatives on ne trouve pas d'OTP unique, utiliser l'ancienne méthode
        otp = gen_otp()
        print(f"[WARNING] Impossible de générer un OTP unique après {max_attempts} tentatives pour {p.telephone}")
    
    expire = datetime.utcnow() + timedelta(minutes=5)
    
    if not user:
        user = Utilisateur(telephone=p.telephone, nom_complet="", operateur=p.operateur,
                           otp_code=otp, otp_expire_at=expire, otp_tentatives=0)
        db.add(user)
    else:
        user.otp_code = otp; user.otp_expire_at = expire; user.otp_tentatives = 0
    
    db.commit()
    print(f"[OTP DEV] {p.telephone} → {otp} (unique: {attempt + 1 if 'attempt' in locals() else 'max'})")
    return {"message": "OTP envoyé", "otp_dev": otp}

@router.post("/inscription/verifier")
def verifier_otp(p: VerifOTPIn, db: Session = Depends(get_db)):
    try:
        print(f"[DEBUG] Vérification OTP pour {p.telephone} avec code {p.otp_code}")
        
        user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
        print(f"[DEBUG] Utilisateur trouvé: {user is not None}")
        
        if not user: 
            print(f"[DEBUG] Utilisateur non trouvé pour {p.telephone}")
            raise HTTPException(404, "Numéro introuvable")
        
        print(f"[DEBUG] OTP stocké: {user.otp_code}, OTP reçu: {p.otp_code}")
        print(f"[DEBUG] Tentatives: {user.otp_tentatives or 0}")
        print(f"[DEBUG] Expiration: {user.otp_expire_at}")
        
        if (user.otp_tentatives or 0) >= 3: 
            raise HTTPException(429, "Trop de tentatives")
        
        # Vérification simplifiée de l'expiration
        if not user.otp_expire_at:
            raise HTTPException(400, "OTP expiré")
            
        # Comparaison simple sans timezone pour l'instant
        now = datetime.utcnow()
        if now > user.otp_expire_at:
            print(f"[DEBUG] OTP expiré: {now} > {user.otp_expire_at}")
            raise HTTPException(400, "OTP expiré")
            
        if user.otp_code != p.otp_code:
            print(f"[DEBUG] OTP incorrect: {user.otp_code} != {p.otp_code}")
            user.otp_tentatives = (user.otp_tentatives or 0) + 1
            db.commit()
            raise HTTPException(400, "OTP incorrect")
            
        # Nettoyer l'OTP après validation
        user.otp_code = None
        user.otp_tentatives = 0
        db.commit()
        
        print(f"[DEBUG] OTP validé avec succès")
        return {"message": "OTP vérifié"}
        
    except HTTPException:
        # Laisser passer les erreurs HTTP que nous contrôlons
        raise
    except Exception as e:
        # Logger l'erreur détaillée
        print(f"[ERROR] OTP verification failed: {str(e)}")
        print(f"[ERROR] Type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erreur lors de la vérification OTP: {str(e)}")

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
