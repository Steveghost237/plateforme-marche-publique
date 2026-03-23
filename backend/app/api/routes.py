from datetime import datetime
import os, uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text, or_
from typing import Optional, List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin, get_optional_user
from app.models.models import (Section, Produit, Ingredient, Adresse, Commande, CommandeLigne,
    CommandeIngredient, Paiement, Livreur, FideliteCompte, FideliteTransaction, FideliteRecompense,
    Notification, Evaluation, Utilisateur, Parametre, ListeFavorite, ListeFavoriteLigne, ZoneLivraison)
from app.api.routes_extra import calculer_frais_livraison, haversine, MARCHE_LAT, MARCHE_LON, est_heure_pointe
from app.schemas.schemas import (SectionOut, ProduitListOut, ProduitOut, ProduitCreateIn, AdresseIn,
    AdresseOut, CommandeCreateIn, CommandeOut, EvaluationIn, PaiementOut, FideliteOut, FideliteTxOut,
    NotifOut, DashboardOut, UtilisateurOut)

# ══════════════════════════════════════════════
# CATALOGUE
# ══════════════════════════════════════════════
cat_router = APIRouter(prefix="/catalogue", tags=["Catalogue"])

@cat_router.get("/sections", response_model=List[SectionOut])
def get_sections(db: Session = Depends(get_db)):
    return db.query(Section).filter(Section.actif == True).order_by(Section.ordre).all()

@cat_router.get("/produits", response_model=List[ProduitListOut])
def list_produits(
    section: Optional[str] = None,
    populaire: Optional[bool] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (db.query(Produit).options(joinedload(Produit.section))
             .filter(Produit.est_actif == True, Produit.deleted_at.is_(None)))
    if section:
        query = query.join(Section).filter(Section.code == section)
    if populaire is not None:
        query = query.filter(Produit.est_populaire == populaire)
    if q:
        query = query.filter(or_(func.lower(Produit.nom).contains(q.lower()),
                                  func.lower(Produit.description).contains(q.lower())))
    return query.order_by(Produit.ordre, Produit.nom).offset((page-1)*limit).limit(limit).all()

@cat_router.get("/produits/{slug}", response_model=ProduitOut)
def get_produit(slug: str, db: Session = Depends(get_db)):
    p = (db.query(Produit).options(joinedload(Produit.section), joinedload(Produit.ingredients))
         .filter(Produit.slug == slug, Produit.est_actif == True, Produit.deleted_at.is_(None)).first())
    if not p: raise HTTPException(404, "Produit introuvable")
    return p

@cat_router.post("/produits", response_model=ProduitOut)
def create_produit(p: ProduitCreateIn, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if db.query(Produit).filter(Produit.slug == p.slug).first(): raise HTTPException(409, "Slug déjà pris")
    prod = Produit(**p.model_dump()); db.add(prod); db.commit(); db.refresh(prod); return prod

@cat_router.put("/produits/{produit_id}")
def update_produit(produit_id: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    prod = db.query(Produit).filter(Produit.id == produit_id).first()
    if not prod: raise HTTPException(404)
    for k, v in body.items():
        if hasattr(prod, k): setattr(prod, k, v)
    db.commit(); return {"ok": True}

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "produits")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@cat_router.post("/produits/{produit_id}/image")
async def upload_produit_image(
    produit_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    prod = db.query(Produit).filter(Produit.id == produit_id).first()
    if not prod:
        raise HTTPException(404, "Produit introuvable")
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        raise HTTPException(400, "Format image non supporté (jpg, png, webp, gif)")
    fname = f"{_uuid.uuid4().hex}{ext.lower()}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    contents = await file.read()
    with open(fpath, "wb") as f:
        f.write(contents)
    # Delete old local file if any
    if prod.image_url and prod.image_url.startswith("/uploads/"):
        old = os.path.join(os.path.dirname(UPLOAD_DIR), *prod.image_url.split("/")[2:])
        if os.path.exists(old):
            os.remove(old)
    prod.image_url = f"/uploads/produits/{fname}"
    db.commit()
    return {"ok": True, "image_url": prod.image_url}

@cat_router.delete("/produits/{produit_id}")
def delete_produit(produit_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    prod = db.query(Produit).filter(Produit.id == produit_id).first()
    if not prod: raise HTTPException(404)
    prod.deleted_at = datetime.utcnow(); db.commit(); return {"ok": True}

# ══════════════════════════════════════════════
# ADRESSES
# ══════════════════════════════════════════════
adr_router = APIRouter(prefix="/adresses", tags=["Adresses"])

@adr_router.get("/", response_model=List[AdresseOut])
def mes_adresses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Adresse).filter(Adresse.utilisateur_id == user.id).all()

@adr_router.post("/", response_model=AdresseOut)
def creer_adresse(p: AdresseIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if p.est_par_defaut:
        db.query(Adresse).filter(Adresse.utilisateur_id == user.id).update({"est_par_defaut": False})
    a = Adresse(utilisateur_id=user.id, **p.model_dump()); db.add(a); db.commit(); db.refresh(a); return a

@adr_router.delete("/{adr_id}")
def delete_adresse(adr_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(Adresse).filter(Adresse.id == adr_id, Adresse.utilisateur_id == user.id).first()
    if a: db.delete(a); db.commit()
    return {"ok": True}

# ══════════════════════════════════════════════
# COMMANDES
# ══════════════════════════════════════════════
cmd_router = APIRouter(prefix="/commandes", tags=["Commandes"])

def _numero(db):
    n = db.query(Commande).count() + 1
    return f"MKT-{n:05d}"

@cmd_router.post("/", response_model=CommandeOut)
def creer_commande(p: CommandeCreateIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sous_total = sum(l.prix_unitaire * l.quantite for l in p.lignes)

    # Calcul frais livraison par distance + poids
    frais     = 500
    poids_kg  = float(getattr(p, 'poids_estime_kg', None) or 0)
    if p.adresse_id:
        adr = db.query(Adresse).filter(Adresse.id == p.adresse_id).first()
        if adr and adr.latitude and adr.longitude:
            dist   = haversine(MARCHE_LAT, MARCHE_LON, float(adr.latitude), float(adr.longitude))
            pointe = est_heure_pointe(datetime.utcnow())
            frais  = calculer_frais_livraison(dist, pointe, db, poids_kg)

    # Livraison offerte si commande >= 5000 FCFA
    if sous_total >= 5000:
        frais = 0

    total = sous_total + frais
    cmd = Commande(numero=_numero(db), client_id=user.id, adresse_id=p.adresse_id,
                   creneau=p.creneau, date_livraison=p.date_livraison,
                   sous_total_fcfa=sous_total, frais_livraison=frais, total_fcfa=total,
                   points_gagnes=total//500, statut="en_attente_paiement", note_client=p.note_client)
    db.add(cmd); db.flush()
    for l in p.lignes:
        ligne = CommandeLigne(commande_id=cmd.id, produit_id=l.produit_id, section_id=l.section_id,
                              quantite=l.quantite, prix_unitaire=l.prix_unitaire, prix_total=l.prix_unitaire*l.quantite)
        db.add(ligne); db.flush()
        for ing in l.ingredients:
            db.add(CommandeIngredient(ligne_id=ligne.id, ingredient_id=ing.ingredient_id,
                                      quantite=ing.quantite, unite=ing.unite, prix_choisi=ing.prix_choisi))
    pmt = Paiement(commande_id=cmd.id, mode=p.mode_paiement, montant_fcfa=total,
                   telephone_paiement=p.telephone_paiement,
                   operateur="MTN" if "mtn" in p.mode_paiement else ("Orange" if "orange" in p.mode_paiement else None))
    db.add(pmt); db.commit(); db.refresh(cmd); return cmd

@cmd_router.get("/mes-commandes", response_model=List[CommandeOut])
def mes_commandes(page: int = 1, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return (db.query(Commande).filter(Commande.client_id == user.id)
            .order_by(Commande.created_at.desc()).offset((page-1)*10).limit(10).all())

@cmd_router.get("/{cmd_id}")
def get_commande(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cmd = (db.query(Commande)
           .options(
               joinedload(Commande.client),
               joinedload(Commande.livreur).joinedload(Livreur.utilisateur),
               joinedload(Commande.adresse),
               joinedload(Commande.lignes).joinedload(CommandeLigne.produit),
           )
           .filter(Commande.id == cmd_id).first())
    if not cmd: raise HTTPException(404)
    if user.role == "client" and str(cmd.client_id) != str(user.id): raise HTTPException(403)
    liv_user = cmd.livreur.utilisateur if cmd.livreur else None
    client   = cmd.client
    return {
        "id": str(cmd.id), "numero": cmd.numero, "statut": cmd.statut,
        "creneau": cmd.creneau,
        "date_livraison": str(cmd.date_livraison) if cmd.date_livraison else None,
        "sous_total_fcfa": cmd.sous_total_fcfa, "frais_livraison": cmd.frais_livraison,
        "reduction_points": cmd.reduction_points, "total_fcfa": cmd.total_fcfa,
        "points_gagnes": cmd.points_gagnes,
        "note_client": cmd.note_client,
        "created_at": cmd.created_at.isoformat() if cmd.created_at else None,
        "livree_at":  cmd.livree_at.isoformat()  if cmd.livree_at  else None,
        "assignee_at": cmd.assignee_at.isoformat() if cmd.assignee_at else None,
        # ── Livreur (visible au client) ───────────────────────────────
        "livreur_nom":       liv_user.nom_complet if liv_user else None,
        "livreur_telephone": liv_user.telephone   if liv_user else None,
        "livreur_photo":     liv_user.avatar_url  if liv_user else None,
        "livreur_note":      float(cmd.livreur.note_moyenne or 0) if cmd.livreur else None,
        "livreur_niveau":    cmd.livreur.niveau   if cmd.livreur else None,
        "livreur_total_livraisons": cmd.livreur.total_livraisons if cmd.livreur else 0,
        # ── Client (visible au livreur / admin seulement) ────────────
        "client_nom":       client.nom_complet if client else None,
        "client_telephone": client.telephone   if (client and user.role in ("livreur","admin","super_admin")) else None,
        # ── Adresse ──────────────────────────────────────────────────
        "adresse": {
            "libelle":   cmd.adresse.libelle   if cmd.adresse else None,
            "quartier":  cmd.adresse.quartier  if cmd.adresse else None,
            "ville":     cmd.adresse.ville     if cmd.adresse else None,
            "latitude":  float(cmd.adresse.latitude)  if cmd.adresse and cmd.adresse.latitude  else None,
            "longitude": float(cmd.adresse.longitude) if cmd.adresse and cmd.adresse.longitude else None,
        } if cmd.adresse else None,
        # ── Lignes ───────────────────────────────────────────────────
        "lignes": [{
            "id": str(l.id),
            "produit_nom": l.produit.nom if l.produit else None,
            "quantite": l.quantite,
            "prix_unitaire": l.prix_unitaire,
            "prix_total": l.prix_total,
        } for l in (cmd.lignes or [])],
    }

@cmd_router.post("/{cmd_id}/payer")
def confirmer_paiement(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    pmt = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
    if pmt: pmt.statut = "confirme"; pmt.confirme_at = datetime.utcnow()
    cmd.statut = "payee"; cmd.payee_at = datetime.utcnow()
    db.add(Notification(destinataire_id=user.id, type="commande_confirmee",
                        titre="Commande confirmée !", corps=f"Commande {cmd.numero} confirmée.",
                        donnees_json={"commande_id": str(cmd_id)}))
    db.commit()
    return {"message": "Paiement confirmé", "numero": cmd.numero}

@cmd_router.post("/{cmd_id}/annuler")
def annuler(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    if cmd.statut in ("livree", "en_livraison"): raise HTTPException(400, "Déjà en livraison")
    cmd.statut = "annulee"; cmd.annulee_at = datetime.utcnow(); db.commit()
    return {"message": "Annulée"}

@cmd_router.post("/{cmd_id}/evaluer")
def evaluer(cmd_id: UUID, p: EvaluationIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id, Commande.statut == "livree").first()
    if not cmd: raise HTTPException(404, "Commande non trouvée ou non livrée")
    if db.query(Evaluation).filter(Evaluation.commande_id == cmd_id).first(): raise HTTPException(409, "Déjà évaluée")
    db.add(Evaluation(commande_id=cmd_id, client_id=user.id, livreur_id=cmd.livreur_id, note=p.note, commentaire=p.commentaire))
    fid = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first()
    if fid:
        fid.points_actuels += cmd.points_gagnes; fid.points_totaux += cmd.points_gagnes
        db.add(FideliteTransaction(compte_id=fid.id, type="gain_commande", points=cmd.points_gagnes,
                                   solde_apres=fid.points_actuels, commande_id=cmd_id,
                                   description=f"Points commande {cmd.numero}"))
    db.commit()
    return {"message": "Évaluation enregistrée", "points_gagnes": cmd.points_gagnes}

# Livreur routes
@cmd_router.get("/livreur/disponibles")
def cmd_disponibles(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in ("livreur", "admin", "super_admin"): raise HTTPException(403)
    cmds = (db.query(Commande)
            .options(joinedload(Commande.client), joinedload(Commande.adresse))
            .filter(Commande.statut == "payee")
            .order_by(Commande.created_at).limit(20).all())
    return [{
        "id": str(c.id), "numero": c.numero, "statut": c.statut,
        "total_fcfa": c.total_fcfa, "creneau": c.creneau,
        "client_nom":       c.client.nom_complet if c.client else None,
        "client_telephone": c.client.telephone   if c.client else None,
        "adresse_quartier": c.adresse.quartier   if c.adresse else None,
        "adresse_ville":    c.adresse.ville       if c.adresse else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    } for c in cmds]

@cmd_router.get("/livreur/en-cours")
def cmd_en_cours(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in ("livreur", "admin", "super_admin"): raise HTTPException(403)
    livreur = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not livreur: raise HTTPException(404, "Profil livreur introuvable")
    cmds = (db.query(Commande)
            .options(joinedload(Commande.client), joinedload(Commande.adresse))
            .filter(
                Commande.livreur_id == livreur.id,
                Commande.statut.in_(["assignee", "en_cours_marche", "en_livraison"])
            )
            .order_by(Commande.assignee_at.desc()).all())
    return [{
        "id": str(c.id), "numero": c.numero, "statut": c.statut,
        "total_fcfa": c.total_fcfa, "creneau": c.creneau,
        "client_nom":       c.client.nom_complet if c.client else None,
        "client_telephone": c.client.telephone   if c.client else None,
        "adresse_quartier": c.adresse.quartier   if c.adresse else None,
        "adresse_ville":    c.adresse.ville       if c.adresse else None,
        "assignee_at": c.assignee_at.isoformat() if c.assignee_at else None,
    } for c in cmds]

@cmd_router.post("/{cmd_id}/accepter")
def accepter(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    livreur = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not livreur: raise HTTPException(404, "Profil livreur introuvable")
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.statut == "payee").first()
    if not cmd: raise HTTPException(404, "Commande indisponible")
    cmd.livreur_id = livreur.id; cmd.statut = "assignee"; cmd.assignee_at = datetime.utcnow()
    livreur.statut = "occupe"
    db.add(Notification(destinataire_id=cmd.client_id, type="livreur_assigne",
                        titre="Livreur en route !", corps=f"Votre livreur {user.nom_complet} est en route vers le marché.",
                        donnees_json={"commande_id": str(cmd_id)}))
    db.commit(); return {"message": "Commande acceptée"}

@cmd_router.post("/{cmd_id}/statut")
def changer_statut(cmd_id: UUID, body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    nouveau = body.get("statut")
    if nouveau not in ("en_cours_marche", "en_livraison", "livree"): raise HTTPException(400, "Statut invalide")
    livreur = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.livreur_id == livreur.id).first() if livreur else None
    if not cmd: raise HTTPException(404)
    cmd.statut = nouveau
    if nouveau == "en_cours_marche": cmd.marche_at = datetime.utcnow()
    elif nouveau == "en_livraison": cmd.en_livraison_at = datetime.utcnow()
    elif nouveau == "livree":
        cmd.livree_at = datetime.utcnow(); livreur.statut = "disponible"
        livreur.total_livraisons = (livreur.total_livraisons or 0) + 1
    msgs = {"en_cours_marche": ("Livreur au marché 🛒","Vos courses sont en cours !"),
            "en_livraison": ("En route vers vous 🛵","Votre commande arrive !"),
            "livree": ("Commande livrée ✅","Profitez de votre commande !")}
    t, c = msgs[nouveau]
    db.add(Notification(destinataire_id=cmd.client_id, type=f"livreur_{nouveau}", titre=t, corps=c,
                        donnees_json={"commande_id": str(cmd_id)}))
    db.commit(); return {"message": f"Statut → {nouveau}"}

# ══════════════════════════════════════════════
# FIDÉLITÉ
# ══════════════════════════════════════════════
fid_router = APIRouter(prefix="/fidelite", tags=["Fidélité"])

@fid_router.get("/compte", response_model=FideliteOut)
def mon_compte(db: Session = Depends(get_db), user=Depends(get_current_user)):
    f = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first()
    if not f: raise HTTPException(404)
    return f

@fid_router.get("/transactions", response_model=List[FideliteTxOut])
def transactions(page: int = 1, db: Session = Depends(get_db), user=Depends(get_current_user)):
    f = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first()
    if not f: return []
    return (db.query(FideliteTransaction).filter(FideliteTransaction.compte_id == f.id)
            .order_by(FideliteTransaction.created_at.desc()).offset((page-1)*20).limit(20).all())

@fid_router.get("/recompenses")
def recompenses(db: Session = Depends(get_db)):
    return db.query(FideliteRecompense).filter(FideliteRecompense.actif == True).order_by(FideliteRecompense.cout_points).all()

# ══════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════
notif_router = APIRouter(prefix="/notifications", tags=["Notifications"])

@notif_router.get("/", response_model=List[NotifOut])
def mes_notifs(non_lues: bool = False, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(Notification).filter(Notification.destinataire_id == user.id)
    if non_lues: q = q.filter(Notification.lue == False)
    return q.order_by(Notification.created_at.desc()).limit(50).all()

@notif_router.post("/{nid}/lire")
def lire(nid: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == nid, Notification.destinataire_id == user.id).first()
    if n: n.lue = True; n.lue_at = datetime.utcnow(); db.commit()
    return {"ok": True}

@notif_router.post("/tout-lire")
def tout_lire(db: Session = Depends(get_db), user=Depends(get_current_user)):
    db.query(Notification).filter(Notification.destinataire_id == user.id, Notification.lue == False).update({"lue": True, "lue_at": datetime.utcnow()})
    db.commit(); return {"ok": True}

# ══════════════════════════════════════════════
# ADMIN
# ══════════════════════════════════════════════
admin_router = APIRouter(prefix="/admin", tags=["Administration"])

@admin_router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    today = datetime.utcnow().date()
    first_of_month = today.replace(day=1)
    base = db.query(Commande).filter(func.date(Commande.created_at) == today)
    cmd_today = base.count()
    en_cours = db.query(Commande).filter(Commande.statut.in_(['en_livraison', 'en_cours_marche', 'assignee'])).count()
    livrees_today = db.query(Commande).filter(Commande.statut == 'livree', func.date(Commande.livree_at) == today).count()
    annulees_today = db.query(Commande).filter(Commande.statut == 'annulee', func.date(Commande.annulee_at) == today).count()
    ca_today = db.query(func.coalesce(func.sum(Commande.total_fcfa), 0)).filter(
        Commande.statut.notin_(['annulee', 'brouillon']), func.date(Commande.created_at) == today).scalar()
    ca_mois = db.query(func.coalesce(func.sum(Commande.total_fcfa), 0)).filter(
        Commande.statut.notin_(['annulee', 'brouillon']), func.date(Commande.created_at) >= first_of_month).scalar()
    return DashboardOut(commandes_aujourd_hui=cmd_today, en_cours_livraison=en_cours,
                        livrees_aujourd_hui=livrees_today, annulees_aujourd_hui=annulees_today,
                        ca_aujourd_hui=ca_today or 0, ca_mois=ca_mois or 0)

@admin_router.get("/commandes")
def admin_commandes(page: int = 1, statut: str = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    q = db.query(Commande).options(joinedload(Commande.client), joinedload(Commande.livreur).joinedload(Livreur.utilisateur))
    if statut: q = q.filter(Commande.statut == statut)
    cmds = q.order_by(Commande.created_at.desc()).offset((page-1)*20).limit(20).all()
    result = []
    for c in cmds:
        liv_user = c.livreur.utilisateur if c.livreur else None
        result.append({
            "id": str(c.id), "numero": c.numero, "statut": c.statut,
            "total_fcfa": c.total_fcfa, "sous_total_fcfa": c.sous_total_fcfa,
            "frais_livraison": c.frais_livraison, "creneau": c.creneau,
            "date_livraison": str(c.date_livraison) if c.date_livraison else None,
            "client_nom": c.client.nom_complet if c.client else None,
            "client_telephone": c.client.telephone if c.client else None,
            "livreur_nom": liv_user.nom_complet if liv_user else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return result

@admin_router.get("/livreurs")
def admin_livreurs(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    livs = db.query(Livreur).options(joinedload(Livreur.utilisateur)).all()
    result = []
    for l in livs:
        u = l.utilisateur
        result.append({
            "id": str(l.id), "utilisateur_id": str(l.utilisateur_id),
            "nom_complet": u.nom_complet if u else None,
            "telephone": u.telephone if u else None,
            "type_vehicule": l.type_vehicule, "plaque": l.plaque,
            "statut": l.statut, "niveau": l.niveau,
            "note_moyenne": float(l.note_moyenne or 0),
            "total_livraisons": l.total_livraisons or 0,
            "total_gains_fcfa": l.total_gains_fcfa or 0,
            "est_verifie": l.est_verifie,
            "zone_couverte": l.zone_couverte,
        })
    return result

@admin_router.get("/utilisateurs")
def admin_users(role: str = None, page: int = 1, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    q = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None))
    if role: q = q.filter(Utilisateur.role == role)
    total = q.count()
    users = q.order_by(Utilisateur.created_at.desc()).offset((page-1)*20).limit(20).all()
    return {"total": total, "users": [UtilisateurOut.model_validate(u) for u in users]}

@admin_router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = db.execute(text("""
        SELECT p.nom, COUNT(cl.id) nb_commandes, COALESCE(SUM(cl.prix_total),0) ca
        FROM commandes_lignes cl JOIN produits p ON cl.produit_id=p.id
        GROUP BY p.id,p.nom ORDER BY nb_commandes DESC LIMIT 10
    """)).mappings().all()
    return [dict(r) for r in rows]

@admin_router.put("/commandes/{cmd_id}/assigner/{livreur_id}")
def assigner(cmd_id: UUID, livreur_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    cmd = db.query(Commande).filter(Commande.id == cmd_id).first()
    liv = db.query(Livreur).filter(Livreur.id == livreur_id).first()
    if not cmd or not liv: raise HTTPException(404)
    cmd.livreur_id = liv.id; cmd.statut = "assignee"; cmd.assignee_at = datetime.utcnow()
    liv.statut = "occupe"; db.commit(); return {"ok": True}

@admin_router.put("/utilisateurs/{user_id}/statut")
def admin_change_user_statut(user_id: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    u = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not u: raise HTTPException(404)
    u.statut = body.get("statut", u.statut); db.commit()
    return {"ok": True, "statut": u.statut}

@admin_router.put("/livreurs/{livreur_id}/verifier")
def admin_toggle_verif(livreur_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    liv = db.query(Livreur).filter(Livreur.id == livreur_id).first()
    if not liv: raise HTTPException(404)
    liv.est_verifie = not liv.est_verifie
    if liv.est_verifie: liv.verifie_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "est_verifie": liv.est_verifie}

@admin_router.get("/stats/commandes")
def admin_stats_commandes(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = db.execute(text("""
        SELECT statut, COUNT(*) as count, COALESCE(SUM(total_fcfa),0) as total
        FROM commandes GROUP BY statut ORDER BY count DESC
    """)).mappings().all()
    return [dict(r) for r in rows]

@admin_router.get("/stats/revenus")
def admin_stats_revenus(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = db.execute(text("""
        SELECT TO_CHAR(created_at, 'YYYY-MM') as mois,
               COUNT(*) as nb_commandes,
               COALESCE(SUM(total_fcfa),0) as ca
        FROM commandes WHERE statut NOT IN ('annulee','brouillon')
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY mois DESC LIMIT 12
    """)).mappings().all()
    return [dict(r) for r in rows]

@admin_router.get("/parametres")
def get_params(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(Parametre).all()

@admin_router.put("/parametres/{cle}")
def update_param(cle: str, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    p = db.query(Parametre).filter(Parametre.cle == cle).first()
    if not p: raise HTTPException(404)
    p.valeur = str(body.get("valeur", p.valeur)); db.commit(); return {"ok": True}

# ══════════════════════════════════════════════
# LIVREUR PROFIL
# ══════════════════════════════════════════════
liv_router = APIRouter(prefix="/livreur", tags=["Livreur"])

@liv_router.get("/profil")
def profil_livreur(db: Session = Depends(get_db), user=Depends(get_current_user)):
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    return {"id": str(liv.id), "statut": liv.statut, "niveau": liv.niveau,
            "note_moyenne": float(liv.note_moyenne or 0), "total_livraisons": liv.total_livraisons,
            "total_gains_fcfa": liv.total_gains_fcfa, "est_verifie": liv.est_verifie}

@liv_router.put("/statut")
def changer_statut_livreur(body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    liv.statut = body.get("statut", liv.statut); db.commit(); return {"statut": liv.statut}

@liv_router.put("/localisation")
def update_localisation(body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    liv.latitude_actuelle = body.get("latitude"); liv.longitude_actuelle = body.get("longitude")
    liv.localisation_at = datetime.utcnow(); db.commit(); return {"ok": True}

@liv_router.get("/historique")
def historique_livreur(db: Session = Depends(get_db), user=Depends(get_current_user)):
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    cmds = (db.query(Commande).filter(Commande.livreur_id == liv.id, Commande.statut == "livree")
            .order_by(Commande.livree_at.desc()).limit(20).all())
    return [{"id": str(c.id), "numero": c.numero, "total_fcfa": c.total_fcfa,
             "livree_at": c.livree_at.isoformat() if c.livree_at else None} for c in cmds]
