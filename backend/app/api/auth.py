import os, random, string, asyncio
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from app.core.database import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user, valider_mot_de_passe_fort
from app.models.models import Utilisateur, FideliteCompte
from app.schemas.schemas import DemandeOTPIn, VerifOTPIn, FinaliserInscriptionIn, ConnexionIn, RefreshIn, TokenOut, UtilisateurOut, UtilisateurUpdateIn
from app.services.email_service import send_otp_email, send_welcome_email, is_valid_email
from app.services.sms_service import envoyer_sms

router = APIRouter(prefix="/auth", tags=["Authentification"])

INFOBIP_CONFIGURE = bool(os.environ.get("INFOBIP_API_KEY"))

def _send_otp_sms_sync(telephone: str, otp: str, contexte: str = "inscription"):
    """Envoi SMS OTP en parallèle — utilisé UNIQUEMENT si INFOBIP_API_KEY est configurée.
    Le canal affiché à l'utilisateur reste l'email ; le SMS sert de secours en prod."""
    tel = telephone.strip().replace(" ", "")
    if tel.startswith("00"):
        tel = "+" + tel[2:]
    elif not tel.startswith("+"):
        tel = "+237" + tel.lstrip("0")
    msg = (f"Marché·CM - Code de réinitialisation: {otp}\nValide 5 minutes. Ne le partagez pas."
           if contexte == "reset" else
           f"Marché·CM - Code de vérification: {otp}\nValide 5 minutes. Bienvenue !")
    try:
        result = asyncio.run(envoyer_sms(tel, msg))
        print(f"[SMS OTP {'OK' if result.get('success') else 'ERR'}] {tel}")
        return result
    except Exception as e:
        print(f"[SMS OTP EXCEPTION] {e}")
        return {"success": False, "error": str(e)}

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
@limiter.limit("5/minute")
def demande_otp(request: Request, p: DemandeOTPIn, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
    if user and user.statut == "actif":
        raise HTTPException(409, "Numéro déjà enregistré")

    # Vérifier l'unicité de l'email avant toute modification
    if p.email:
        email_clean = p.email.strip().lower()
        email_query = db.query(Utilisateur).filter(Utilisateur.email == email_clean)
        if user:
            email_query = email_query.filter(Utilisateur.id != user.id)
        email_owner = email_query.first()
        if email_owner:
            if email_owner.statut == "actif":
                raise HTTPException(409, "Cette adresse email est déjà utilisée")
            # Compte en attente jamais finalisé : libérer l'email
            email_owner.email = None
            db.commit()

    # Cooldown : empêcher les demandes successives trop rapides qui écrasent l'OTP en cours
    if user and user.otp_derniere_demande:
        derniere = user.otp_derniere_demande
        if derniere.tzinfo is not None:
            derniere = derniere.replace(tzinfo=None)
        if (datetime.utcnow() - derniere).total_seconds() < 60:
            raise HTTPException(429, "Veuillez attendre 60 secondes avant de redemander un code")

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
                           email=p.email,
                           otp_code=otp, otp_expire_at=expire, otp_tentatives=0,
                           otp_derniere_demande=datetime.utcnow())
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            # Race condition : une autre requête a déjà créé ce compte (double-tap)
            db.rollback()
            user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
            if not user:
                raise HTTPException(500, "Erreur lors de la création du compte")
            if user.statut == "actif":
                raise HTTPException(409, "Numéro déjà enregistré")
            user.otp_code = otp
            user.otp_expire_at = expire
            user.otp_tentatives = 0
            user.otp_derniere_demande = datetime.utcnow()
            if p.email:
                user.email = p.email
            db.commit()
    else:
        user.otp_code = otp
        user.otp_expire_at = expire
        user.otp_tentatives = 0
        user.otp_derniere_demande = datetime.utcnow()
        if p.email:
            user.email = p.email
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "Numéro ou adresse email déjà utilisé")
    debug = settings.DEBUG
    print(f"[OTP DEV] {p.telephone} -> {otp} (unique: {attempt + 1 if 'attempt' in locals() else 'max'})")

    # ── Envoi OTP par EMAIL (canal principal) ──
    email_result = send_otp_email(p.email, user.nom_complet or "", otp, contexte="inscription")
    # ── Envoi OTP par SMS en parallèle (toujours tenté si provider configuré) ──
    sms_result = _send_otp_sms_sync(p.telephone, otp, contexte="inscription")
    if not email_result.get("success") and not sms_result.get("success"):
        raise HTTPException(503, "Impossible d'envoyer le code de vérification. Vérifiez votre adresse email et réessayez.")
    canal = "email et SMS" if email_result.get("success") and sms_result.get("success") and not sms_result.get("simulation") else ("SMS" if sms_result.get("success") and not sms_result.get("simulation") else "email")
    resp = {"message": f"OTP envoyé par {canal}"}
    if debug:
        resp["email_status"] = email_result
        resp["sms_status"] = sms_result
    print(f"[DEBUG] settings.DEBUG={settings.DEBUG}, resp={resp}")
    return resp

@router.post("/inscription/verifier")
def verifier_otp(p: VerifOTPIn, db: Session = Depends(get_db)):
    try:
        # Nettoyer le code saisi (espaces, tirets, etc.)
        otp_code = p.otp_code.strip().replace(" ", "").replace("-", "")
        print(f"[DEBUG] Vérification OTP pour {p.telephone} avec code {otp_code}")

        user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
        print(f"[DEBUG] Utilisateur trouvé: {user is not None}")
        
        if not user: 
            print(f"[DEBUG] Utilisateur non trouvé pour {p.telephone}")
            raise HTTPException(404, "Numéro introuvable")
        
        print(f"[DEBUG] OTP stocké: {user.otp_code}, OTP reçu: {otp_code}")
        print(f"[DEBUG] Tentatives: {user.otp_tentatives or 0}")
        print(f"[DEBUG] Expiration: {user.otp_expire_at}")

        if (user.otp_tentatives or 0) >= 3:
            raise HTTPException(429, "Trop de tentatives")

        # Vérification simplifiée de l'expiration
        if not user.otp_expire_at:
            raise HTTPException(400, "OTP expiré")

        now = datetime.utcnow()
        expire = user.otp_expire_at
        if expire.tzinfo is not None:
            expire = expire.replace(tzinfo=None)
        if now > expire:
            print(f"[DEBUG] OTP expiré: {now} > {expire}")
            raise HTTPException(400, "OTP expiré")

        if user.otp_code != otp_code:
            print(f"[DEBUG] OTP incorrect: {user.otp_code} != {otp_code}")
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
    from app.models.models import Livreur
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone).first()
    if not user: raise HTTPException(404, "Numéro introuvable")
    if user.statut == "actif": raise HTTPException(409, "Déjà actif")
    valider_mot_de_passe_fort(p.mot_de_passe)
    user.nom_complet = p.nom_complet
    user.mot_de_passe_hash = hash_password(p.mot_de_passe)
    if p.email:
        email_owner = db.query(Utilisateur).filter(
            Utilisateur.email == p.email, Utilisateur.id != user.id
        ).first()
        if email_owner and email_owner.statut == "actif":
            raise HTTPException(409, "Adresse email déjà utilisée par un autre compte")
        user.email = p.email
    if p.telephone_secondaire:
        user.telephone_secondaire = p.telephone_secondaire
    user.statut = "actif"
    # Assigner le rôle choisi (client ou livreur uniquement, pas admin)
    role = p.role if p.role in ("client", "livreur") else "client"
    user.role = role
    if not db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first():
        db.add(FideliteCompte(utilisateur_id=user.id))
    # Si livreur, créer le profil livreur associé
    if role == "livreur":
        existing_livreur = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
        if not existing_livreur:
            db.add(Livreur(utilisateur_id=user.id, statut="disponible", niveau="debutant"))
    try:
        db.commit(); db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Numéro ou adresse email déjà utilisé")

    # ── Email de bienvenue ──
    if user.email and is_valid_email(user.email):
        try:
            send_welcome_email(user.email, user.nom_complet, user.telephone, user.role)
        except Exception as e:
            print(f"[WELCOME EMAIL WARN] {e}")

    return TokenOut(access_token=create_access_token({"sub": str(user.id)}),
                    refresh_token=create_refresh_token({"sub": str(user.id)}),
                    user=UtilisateurOut.model_validate(user))

@router.post("/connexion", response_model=TokenOut)
@limiter.limit("10/minute")
def connexion(request: Request, p: ConnexionIn, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(Utilisateur.telephone == p.telephone, Utilisateur.deleted_at.is_(None)).first()
    if not user or not verify_password(p.mot_de_passe, user.mot_de_passe_hash or ""):
        raise HTTPException(401, "Identifiants incorrects")
    if user.statut != "actif": raise HTTPException(403, f"Compte {user.statut}")
    user.derniere_connexion = datetime.utcnow()
    user.derniere_plateforme = p.plateforme or "web"
    db.commit()
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

@router.post("/mot-de-passe-oublie/otp")
@limiter.limit("5/minute")
def reset_otp(request: Request, body: dict = None, db: Session = Depends(get_db)):
    body = body or {}
    telephone = body.get("telephone")
    if not telephone: raise HTTPException(400, "Numéro requis")
    user = db.query(Utilisateur).filter(Utilisateur.telephone == telephone, Utilisateur.statut == "actif", Utilisateur.deleted_at.is_(None)).first()
    if not user: raise HTTPException(404, "Aucun compte actif trouvé avec ce numéro")
    otp = gen_otp()
    user.otp_code = otp
    user.otp_expire_at = datetime.utcnow() + timedelta(minutes=5)
    user.otp_tentatives = 0
    db.commit()
    debug = os.environ.get("DEBUG", "false").lower() in ("true", "1", "yes")
    print(f"[RESET OTP] {telephone} -> {otp}")

    # ── Envoi OTP reset par EMAIL (canal principal) ──
    email_result = {"success": False}
    if user.email and is_valid_email(user.email):
        email_result = send_otp_email(user.email, user.nom_complet, otp, contexte="reset")
    sms_result = {"success": False}
    # ── Secours SMS en parallèle : si pas d'email ou échec, uniquement si provider SMS configuré ──
    if not email_result.get("success") and INFOBIP_CONFIGURE:
        sms_result = _send_otp_sms_sync(telephone, otp, contexte="reset")
    if not email_result.get("success") and not sms_result.get("success"):
        if not user.email:
            raise HTTPException(400, "Aucune adresse email associée à ce compte — contactez le support")
        raise HTTPException(503, "Impossible d'envoyer le code par email. Réessayez dans un instant.")
    resp = {"message": "Code de réinitialisation envoyé par email"}
    if debug:
        resp["email_status"] = email_result
        resp["sms_status"] = sms_result
    return resp

@router.post("/mot-de-passe-oublie/verifier")
def reset_verify(body: dict = None, db: Session = Depends(get_db)):
    body = body or {}
    telephone = body.get("telephone")
    otp_code = body.get("otp_code")
    if not telephone or not otp_code: raise HTTPException(400, "Numéro et code requis")
    user = db.query(Utilisateur).filter(Utilisateur.telephone == telephone).first()
    if not user: raise HTTPException(404, "Numéro introuvable")
    if (user.otp_tentatives or 0) >= 3: raise HTTPException(429, "Trop de tentatives")
    _exp = user.otp_expire_at
    if _exp and _exp.tzinfo is not None:
        _exp = _exp.replace(tzinfo=None)
    if not _exp or datetime.utcnow() > _exp:
        raise HTTPException(400, "Code expiré")
    if user.otp_code != otp_code:
        user.otp_tentatives = (user.otp_tentatives or 0) + 1
        db.commit()
        raise HTTPException(400, "Code incorrect")
    user.otp_code = None
    user.otp_tentatives = 0
    db.commit()
    return {"message": "Code vérifié", "reset_token": create_access_token({"sub": str(user.id), "type": "reset"}, expires_minutes=10)}

@router.post("/mot-de-passe-oublie/reset")
def reset_password(body: dict = None, db: Session = Depends(get_db)):
    body = body or {}
    token = body.get("reset_token")
    new_password = body.get("nouveau_mot_de_passe")
    if not token or not new_password: raise HTTPException(400, "Token et nouveau mot de passe requis")
    valider_mot_de_passe_fort(new_password)
    data = decode_token(token)
    user = db.query(Utilisateur).filter(Utilisateur.id == data.get("sub")).first()
    if not user: raise HTTPException(404, "Utilisateur introuvable")
    user.mot_de_passe_hash = hash_password(new_password)
    db.commit()
    return {"message": "Mot de passe réinitialisé avec succès"}

@router.get("/me", response_model=UtilisateurOut)
def me(user=Depends(get_current_user)): return user

@router.put("/me/mot-de-passe")
def changer_mot_de_passe(body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Changement de mot de passe : ancien requis + nouveau doit être fort."""
    body = body or {}
    ancien = body.get("ancien_mot_de_passe")
    nouveau = body.get("nouveau_mot_de_passe")
    if not ancien or not nouveau: raise HTTPException(400, "Ancien et nouveau mot de passe requis")
    if not verify_password(ancien, user.mot_de_passe_hash or ""):
        raise HTTPException(403, "Mot de passe actuel incorrect")
    if ancien == nouveau: raise HTTPException(400, "Le nouveau mot de passe doit être différent de l'ancien")
    valider_mot_de_passe_fort(nouveau)
    user.mot_de_passe_hash = hash_password(nouveau)
    db.commit()
    return {"message": "Mot de passe modifié avec succès"}

@router.put("/me", response_model=UtilisateurOut)
def update_me(p: UtilisateurUpdateIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Changement d'email : format valide + pas déjà pris par un autre compte
    if p.email:
        email = p.email.strip().lower()
        if not is_valid_email(email):
            raise HTTPException(422, "Adresse email invalide")
        owner = db.query(Utilisateur).filter(
            Utilisateur.email == email, Utilisateur.id != user.id).first()
        if owner:
            raise HTTPException(409, "Cette adresse email est déjà utilisée par un autre compte")
        user.email = email
    for k, v in p.model_dump(exclude_none=True).items():
        if k != "email": setattr(user, k, v)
    try:
        db.commit(); db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Cette adresse email est déjà utilisée")
    return user
