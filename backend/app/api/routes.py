from datetime import datetime
import os, uuid as _uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text, or_
from typing import Optional, List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin, get_current_staff, get_optional_user, hash_password, valider_mot_de_passe_fort
from app.models.models import (Section, Produit, Ingredient, Adresse, Commande, CommandeLigne,
    CommandeIngredient, Paiement, Livreur, FideliteCompte, FideliteTransaction, FideliteRecompense,
    Notification, Evaluation, Utilisateur, Parametre, ListeFavorite, ListeFavoriteLigne, ZoneLivraison,
    Temoignage, PointAchat)
from app.api.routes_extra import calculer_frais_livraison, haversine, MARCHE_LAT, MARCHE_LON, est_heure_pointe, heure_cameroun
from app.services.email_service import send_acceptation_emails, is_valid_email, send_welcome_email
from app.schemas.schemas import (SectionOut, ProduitListOut, ProduitOut, ProduitCreateIn, AdresseIn,
    AdresseOut, CommandeCreateIn, CommandeOut, EvaluationIn, SondageIn, PaiementOut, FideliteOut, FideliteTxOut,
    NotifOut, DashboardOut, UtilisateurOut, IngredientOut)

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
    tri: Optional[str] = None,
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
    if tri == "commandes":
        # Classement réel : nb de lignes de commande par produit (commandes payées ou plus)
        nb = func.count(CommandeLigne.id)
        ranked = (db.query(CommandeLigne.produit_id, nb.label("nb"))
                  .join(Commande, CommandeLigne.commande_id == Commande.id)
                  .filter(~Commande.statut.in_(["brouillon", "en_attente_paiement", "annulee"]))
                  .group_by(CommandeLigne.produit_id)
                  .order_by(nb.desc(), func.sum(CommandeLigne.quantite).desc())
                  .offset((page-1)*limit).limit(limit).all())
        ids = [r.produit_id for r in ranked]
        produits = query.filter(Produit.id.in_(ids)).all() if ids else []
        rank = {pid: i for i, pid in enumerate(ids)}
        produits.sort(key=lambda p: rank.get(p.id, len(ids)))
        if len(produits) < limit:
            extra = (db.query(Produit).options(joinedload(Produit.section))
                     .filter(Produit.est_actif == True, Produit.deleted_at.is_(None),
                             Produit.est_populaire == True,
                             ~Produit.id.in_(ids or [_uuid.UUID(int=0)]))
                     .order_by(Produit.ordre, Produit.nom).limit(limit - len(produits)).all())
            produits += extra
        return produits
    return query.order_by(Produit.ordre, Produit.nom).offset((page-1)*limit).limit(limit).all()

@cat_router.get("/produits/{slug}", response_model=ProduitOut)
def get_produit(slug: str, db: Session = Depends(get_db)):
    p = (db.query(Produit).options(joinedload(Produit.section), joinedload(Produit.ingredients))
         .filter(Produit.slug == slug, Produit.est_actif == True, Produit.deleted_at.is_(None)).first())
    if not p: raise HTTPException(404, "Produit introuvable")
    return p

@cat_router.post("/produits", response_model=ProduitOut)
def create_produit(p: ProduitCreateIn, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    if db.query(Produit).filter(Produit.slug == p.slug).first(): raise HTTPException(409, "Slug déjà pris")
    prod = Produit(**p.model_dump()); db.add(prod); db.commit(); db.refresh(prod); return prod

PRODUIT_EDITABLE_FIELDS = {
    "nom", "slug", "description", "prix_base_fcfa", "prix_max_fcfa",
    "image_url", "est_menu", "est_actif", "est_populaire", "est_nouveau",
    "stock_dispo", "ordre", "section_id",
}

@cat_router.put("/produits/{produit_id}")
def update_produit(produit_id: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    body = body or {}
    prod = db.query(Produit).filter(Produit.id == produit_id).first()
    if not prod: raise HTTPException(404)
    for k, v in body.items():
        if k in PRODUIT_EDITABLE_FIELDS:
            setattr(prod, k, v)
    db.commit(); return {"ok": True}

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "produits")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@cat_router.post("/produits/{produit_id}/image")
async def upload_produit_image(
    produit_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_staff),
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
def delete_produit(produit_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    prod = db.query(Produit).filter(Produit.id == produit_id).first()
    if not prod: raise HTTPException(404)
    prod.deleted_at = datetime.utcnow(); db.commit(); return {"ok": True}

# ── INGRÉDIENTS (staff) — CRUD des composants d'un menu ───────
INGREDIENT_FIELDS = {
    "nom", "description", "est_obligatoire", "type_saisie", "unite",
    "quantite_defaut", "quantite_min", "quantite_max",
    "prix_min_fcfa", "prix_max_fcfa", "prix_defaut_fcfa", "ordre", "actif",
}

def _prix_curseur_ing(ing, qte: float) -> int:
    """Prix d'un ingrédient à une quantité donnée — même courbe que le frontend
    (calcPrixCurseur) : interpolation par morceaux
      quantite_min → prix_min · quantite_defaut → prix_defaut · quantite_max → prix_max
    Ainsi le prix saisi comme « prix par défaut » est exactement le prix payé au défaut.
    Si prix_defaut absent/0 → simple interpolation linéaire min→max (comportement historique)."""
    q_min, q_max = float(ing.quantite_min or 0), float(ing.quantite_max or 100)
    p_min, p_max = int(ing.prix_min_fcfa or 0), int(ing.prix_max_fcfa or 0)
    q_def, p_def = float(ing.quantite_defaut or 0), int(ing.prix_defaut_fcfa or 0)

    def interp(qa, pa, qb, pb):
        if qb == qa:
            return float(pb)
        r = max(0.0, min(1.0, (qte - qa) / (qb - qa)))
        return pa + r * (pb - pa)

    if p_def > 0 and q_min < q_def < q_max:
        prix = interp(q_min, p_min, q_def, p_def) if qte <= q_def else interp(q_def, p_def, q_max, p_max)
    else:
        prix = interp(q_min, p_min, q_max, p_max)
    return min(max(round(prix), 50), 100000)

def _sync_prix_menu(db: Session, produit_id):
    """Après toute modif d'ingrédient : le prix affiché du menu suit sa composition.
    prix_base = Σ prix des ingrédients actifs à leur quantité par défaut (prix du menu par défaut)
    prix_max  = Σ prix_max des ingrédients actifs (plafond réel du menu)
    Le client paie Σ prix des ingrédients choisis — pas de base en double."""
    prod = db.query(Produit).filter(Produit.id == produit_id).first()
    if not prod or not prod.est_menu:
        return
    ings = [i for i in prod.ingredients if i.actif]
    prod.prix_base_fcfa = sum(_prix_curseur_ing(i, float(i.quantite_defaut or 0)) for i in ings)
    prod.prix_max_fcfa  = sum(int(i.prix_max_fcfa or 0) for i in ings)

@cat_router.get("/produits/{produit_id}/ingredients", response_model=List[IngredientOut])
def list_ingredients(produit_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    return (db.query(Ingredient).filter(Ingredient.produit_id == produit_id)
            .order_by(Ingredient.ordre, Ingredient.nom).all())

@cat_router.post("/produits/{produit_id}/ingredients")
def create_ingredient(produit_id: UUID, body: dict, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    prod = db.query(Produit).filter(Produit.id == produit_id, Produit.deleted_at.is_(None)).first()
    if not prod: raise HTTPException(404, "Produit introuvable")
    if not (body.get("nom") or "").strip(): raise HTTPException(400, "Nom requis")
    ing = Ingredient(produit_id=prod.id, **{k: v for k, v in body.items() if k in INGREDIENT_FIELDS})
    db.add(ing); db.flush()
    _sync_prix_menu(db, prod.id)
    db.commit(); db.refresh(ing)
    return {"ok": True, "id": str(ing.id)}

@cat_router.put("/ingredients/{ingredient_id}")
def update_ingredient(ingredient_id: UUID, body: dict, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing: raise HTTPException(404)
    for k, v in body.items():
        if k in INGREDIENT_FIELDS:
            setattr(ing, k, v)
    db.flush()
    _sync_prix_menu(db, ing.produit_id)
    db.commit(); return {"ok": True}

@cat_router.delete("/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing: raise HTTPException(404)
    pid = ing.produit_id
    db.delete(ing); db.flush()
    _sync_prix_menu(db, pid)
    db.commit(); return {"ok": True}

# ══════════════════════════════════════════════
# ADRESSES
# ══════════════════════════════════════════════
# ── TÉMOIGNAGES (public) ──────────────────────────────────────
tem_router = APIRouter(prefix="/temoignages", tags=["Témoignages"])

@tem_router.get("/")
def list_temoignages(db: Session = Depends(get_db)):
    rows = (db.query(Temoignage).filter(Temoignage.est_publie == True)
            .order_by(Temoignage.ordre, Temoignage.created_at.desc()).limit(12).all())
    return [{"name": t.nom, "role": t.role, "city": t.ville, "note": t.note,
             "avatar": t.avatar_url, "text": t.texte} for t in rows]

adr_router = APIRouter(prefix="/adresses", tags=["Adresses"])

@adr_router.get("/", response_model=List[AdresseOut])
def mes_adresses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Adresse).filter(Adresse.utilisateur_id == user.id).all()

@adr_router.post("/", response_model=AdresseOut)
def creer_adresse(p: AdresseIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if p.est_par_defaut:
        db.query(Adresse).filter(Adresse.utilisateur_id == user.id).update({"est_par_defaut": False})
    a = Adresse(utilisateur_id=user.id, **p.model_dump()); db.add(a); db.flush()
    _geocoder_adresse(a, db)  # remplit lat/lon si absents (Nominatim, best-effort)
    db.commit(); db.refresh(a); return a

@adr_router.delete("/{adr_id}")
def delete_adresse(adr_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(Adresse).filter(Adresse.id == adr_id, Adresse.utilisateur_id == user.id).first()
    if a: db.delete(a); db.commit()
    return {"ok": True}

# ══════════════════════════════════════════════
# FAVORIS
# ══════════════════════════════════════════════
fav_router = APIRouter(prefix="/favoris", tags=["Favoris"])

@fav_router.get("/")
def mes_favoris(db: Session = Depends(get_db), user=Depends(get_current_user)):
    listes = db.query(ListeFavorite).filter(ListeFavorite.utilisateur_id == user.id).all()
    result = []
    for l in listes:
        lignes = db.query(ListeFavoriteLigne).filter(ListeFavoriteLigne.liste_id == l.id).all()
        produits = []
        for lg in lignes:
            p = db.query(Produit).filter(Produit.id == lg.produit_id).first()
            if p:
                produits.append({
                    "ligne_id": str(lg.id), "produit_id": str(p.id),
                    "nom": p.nom, "slug": p.slug, "image_url": p.image_url,
                    "prix_base_fcfa": p.prix_base_fcfa, "quantite": lg.quantite,
                })
        result.append({
            "id": str(l.id), "nom": l.nom,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "produits": produits,
        })
    return result

@fav_router.post("/")
def creer_liste_favorite(body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    liste = ListeFavorite(utilisateur_id=user.id, nom=body.get("nom", "Ma liste"))
    db.add(liste); db.commit(); db.refresh(liste)
    return {"id": str(liste.id), "nom": liste.nom}

@fav_router.post("/{liste_id}/produits")
def ajouter_favori(liste_id: UUID, body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    liste = db.query(ListeFavorite).filter(ListeFavorite.id == liste_id, ListeFavorite.utilisateur_id == user.id).first()
    if not liste: raise HTTPException(404, "Liste introuvable")
    produit_id = body.get("produit_id")
    if not produit_id: raise HTTPException(400, "produit_id requis")
    existing = db.query(ListeFavoriteLigne).filter(
        ListeFavoriteLigne.liste_id == liste_id, ListeFavoriteLigne.produit_id == produit_id).first()
    if existing: return {"ok": True, "message": "Déjà dans la liste"}
    lg = ListeFavoriteLigne(liste_id=liste_id, produit_id=produit_id, quantite=body.get("quantite", 1))
    db.add(lg); db.commit()
    return {"ok": True}

@fav_router.delete("/{liste_id}/produits/{produit_id}")
def retirer_favori(liste_id: UUID, produit_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    liste = db.query(ListeFavorite).filter(ListeFavorite.id == liste_id, ListeFavorite.utilisateur_id == user.id).first()
    if not liste: raise HTTPException(404, "Liste introuvable")
    lg = db.query(ListeFavoriteLigne).filter(
        ListeFavoriteLigne.liste_id == liste_id, ListeFavoriteLigne.produit_id == produit_id).first()
    if lg: db.delete(lg); db.commit()
    return {"ok": True}

@fav_router.delete("/{liste_id}")
def supprimer_liste_favorite(liste_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    liste = db.query(ListeFavorite).filter(ListeFavorite.id == liste_id, ListeFavorite.utilisateur_id == user.id).first()
    if not liste: raise HTTPException(404)
    db.delete(liste); db.commit()
    return {"ok": True}

# ══════════════════════════════════════════════
# COMMANDES
# ══════════════════════════════════════════════
cmd_router = APIRouter(prefix="/commandes", tags=["Commandes"])

def _numero(db):
    n = db.query(Commande).count() + 1
    return f"MKT-{n:05d}"

def _geocoder_adresse(adr, db):
    """Remplit latitude/longitude de l'adresse via Nominatim (OpenStreetMap).
    Best-effort : silencieux si le service est indisponible. Persiste pour
    ne géocoder qu'une seule fois par adresse."""
    if adr.latitude is not None and adr.longitude is not None:
        return
    try:
        import urllib.request, urllib.parse, json as _json
        q = urllib.parse.quote(f"{adr.quartier or ''}, {adr.ville or ''}, Cameroun".strip(", "))
        req = urllib.request.Request(
            f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1&countrycodes=cm",
            headers={"User-Agent": "marche-en-ligne/2.0 (geocodage adresse livraison)"})
        data = _json.loads(urllib.request.urlopen(req, timeout=4).read())
        if data:
            adr.latitude = float(data[0]["lat"])
            adr.longitude = float(data[0]["lon"])
            db.flush()
    except Exception:
        pass

def _choisir_point_achat(db, adr):
    """Marché actif le plus proche de l'adresse de livraison (distance GPS réelle).
    Priorité aux marchés de la même ville ; sinon le plus proche globalement.
    Repli texte (quartier → ville → 1er actif) si l'adresse n'est pas géolocalisable."""
    pas = db.query(PointAchat).filter(PointAchat.actif == True).all()
    if not pas:
        return None
    if adr is not None:
        _geocoder_adresse(adr, db)
        if adr.latitude is not None and adr.longitude is not None:
            geo = [p for p in pas if p.latitude is not None and p.longitude is not None]
            if geo:
                lat, lon = float(adr.latitude), float(adr.longitude)
                def dist(p):
                    return haversine(lat, lon, float(p.latitude), float(p.longitude))
                ville = (adr.ville or "").strip().lower()
                meme_ville = [p for p in geo
                              if ville and (ville in (p.ville or "").lower()
                                            or (p.ville or "").lower() in ville)]
                return min(meme_ville or geo, key=dist)
        # Repli texte : quartier, puis ville, puis 1er marché actif
        if adr.quartier:
            p = next((p for p in pas
                      if adr.quartier.strip().lower() in (p.quartier or "").lower()
                      or (p.quartier or "").lower() in adr.quartier.strip().lower()), None)
            if p: return p
        if adr.ville:
            p = next((p for p in pas
                      if adr.ville.strip().lower() in (p.ville or "").lower()
                      or (p.ville or "").lower() in adr.ville.strip().lower()), None)
            if p: return p
    return pas[0]

@cmd_router.post("/", response_model=CommandeOut)
def creer_commande(p: CommandeCreateIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    sous_total = sum(l.prix_unitaire * l.quantite for l in p.lignes)

    # Point d'achat : marché le plus proche de l'adresse de livraison (GPS réel)
    pa_cmd = None
    adr = None
    if p.adresse_id:
        adr = db.query(Adresse).filter(Adresse.id == p.adresse_id).first()
        pa_cmd = _choisir_point_achat(db, adr)
    if not pa_cmd:
        pa_cmd = db.query(PointAchat).filter(PointAchat.actif == True).order_by(PointAchat.created_at).first()

    # Calcul frais livraison par distance + poids — départ = point d'achat assigné
    frais     = 1000
    poids_kg  = float(getattr(p, 'poids_estime_kg', None) or 0)
    if adr and adr.latitude and adr.longitude:
        dep_lat = float(pa_cmd.latitude) if pa_cmd and pa_cmd.latitude is not None else MARCHE_LAT
        dep_lon = float(pa_cmd.longitude) if pa_cmd and pa_cmd.longitude is not None else MARCHE_LON
        dist   = haversine(dep_lat, dep_lon, float(adr.latitude), float(adr.longitude))
        pointe = est_heure_pointe(heure_cameroun())
        frais  = calculer_frais_livraison(dist, pointe, db, poids_kg)

    # Frais de livraison minimum 1000 FCFA, sauf produit test "Produit Test Campay"
    PRODUIT_TEST_LIVRAISON_GRATUITE = UUID("88a2bd29-d234-4ec8-a35b-6470be95d328")
    if all(l.produit_id == PRODUIT_TEST_LIVRAISON_GRATUITE for l in p.lignes):
        frais = 0
    else:
        frais = max(1000, frais)

    total = sous_total + frais

    # Réutiliser la commande en attente de paiement la plus récente pour éviter
    # les doublons quand le client relance le checkout avant d'avoir payé.
    pending = (db.query(Commande)
               .filter(Commande.client_id == user.id, Commande.statut == "en_attente_paiement")
               .order_by(Commande.created_at.desc()).all())
    for old in pending[1:]:
        old.statut = "annulee"; old.annulee_at = datetime.utcnow()
    cmd = pending[0] if pending else None
    if cmd:
        ligne_ids = [l.id for l in db.query(CommandeLigne).filter(CommandeLigne.commande_id == cmd.id).all()]
        if ligne_ids:
            db.query(CommandeIngredient).filter(CommandeIngredient.ligne_id.in_(ligne_ids)).delete(synchronize_session=False)
        db.query(CommandeLigne).filter(CommandeLigne.commande_id == cmd.id).delete(synchronize_session=False)
        db.query(Paiement).filter(Paiement.commande_id == cmd.id).delete(synchronize_session=False)
        cmd.adresse_id = p.adresse_id; cmd.creneau = p.creneau
        cmd.date_livraison = p.date_livraison; cmd.note_client = p.note_client
        cmd.point_achat_id = pa_cmd.id if pa_cmd else None
        cmd.sous_total_fcfa = sous_total; cmd.frais_livraison = frais
        cmd.total_fcfa = total; cmd.points_gagnes = total//500
        db.flush()
    else:
        cmd = Commande(numero=_numero(db), client_id=user.id, adresse_id=p.adresse_id,
                       point_achat_id=pa_cmd.id if pa_cmd else None,
                       creneau=p.creneau, date_livraison=p.date_livraison,
                       sous_total_fcfa=sous_total, frais_livraison=frais, total_fcfa=total,
                       points_gagnes=total//500, statut="en_attente_paiement", note_client=p.note_client)
        db.add(cmd); db.flush()
    for l in p.lignes:
        ligne = CommandeLigne(commande_id=cmd.id, produit_id=l.produit_id, section_id=l.section_id,
                              quantite=l.quantite, prix_unitaire=l.prix_unitaire, prix_total=l.prix_unitaire*l.quantite,
                              note_ligne=l.note_ligne)
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
        "client_telephone2": client.telephone_secondaire if (client and user.role in ("livreur","admin","super_admin")) else None,
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
            "note_ligne": l.note_ligne,
            "quantite": l.quantite,
            "prix_unitaire": l.prix_unitaire,
            "prix_total": l.prix_total,
        } for l in (cmd.lignes or [])],
    }

@cmd_router.post("/{cmd_id}/initier-paiement")
async def initier_paiement_momo(cmd_id: UUID, body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Initie un paiement Mobile Money (MTN MoMo / Orange Money).
    Provider : Campay si CAMPAY_TOKEN configuré, sinon NotchPay."""
    body = body or {}
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    if cmd.statut not in ("en_attente_paiement", "brouillon"): raise HTTPException(400, "Commande déjà payée ou annulée")
    from app.services.payment_service import initier_paiement, initier_paiement_campay, campay_actif
    telephone = body.get("telephone_paiement") or user.telephone
    # Déterminer l'opérateur depuis le mode de paiement (champ sur Paiement)
    pmt_row = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
    op_hint = None
    mp = (pmt_row.mode if pmt_row else "").lower() if pmt_row else ""
    if "mtn" in mp:
        op_hint = "mtn"
    elif "orange" in mp:
        op_hint = "orange"

    if campay_actif():
        result = await initier_paiement_campay(
            montant_fcfa=cmd.total_fcfa,
            telephone=telephone,
            reference=cmd.numero,
            description=f"Commande {cmd.numero} — ComeBuy",
        )
    else:
        backend_url = os.environ.get("BACKEND_URL", "https://comebuy-api.onrender.com")
        result = await initier_paiement(
            montant_fcfa=cmd.total_fcfa,
            telephone=telephone,
            email=user.email,
            reference=cmd.numero,
            description=f"Commande {cmd.numero} — ComeBuy",
            callback_url=body.get("callback_url") or f"{backend_url}/api/webhooks/notchpay",
            operator=op_hint,
        )
    if result.get("success"):
        pmt = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
        if pmt:
            pmt.reference_externe = result.get("transaction_ref")
            pmt.telephone_paiement = telephone
        db.commit()
    return result


@cmd_router.get("/{cmd_id}/statut-paiement-momo")
async def statut_paiement_momo(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Poll le statut d'un paiement MoMo (Campay ou NotchPay) et marque la commande payée si confirmé."""
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    pmt = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
    if not pmt or not pmt.reference_externe:
        raise HTTPException(400, "Aucun paiement MoMo initié")
    from app.services.payment_service import verifier_paiement, verifier_paiement_campay, campay_actif
    if campay_actif():
        result = await verifier_paiement_campay(pmt.reference_externe)
    else:
        result = await verifier_paiement(pmt.reference_externe)
    status = (result.get("status") or "").lower()
    # NotchPay statuts : pending, processing, complete, failed, canceled
    if result.get("success") and (status in ("complete", "completed", "success", "successful") or result.get("simulation")):
        if cmd.statut != "payee":
            pmt.statut = "confirme"; pmt.confirme_at = datetime.utcnow()
            cmd.statut = "payee"; cmd.payee_at = datetime.utcnow()
            db.add(Notification(destinataire_id=user.id, type="commande_confirmee",
                                titre="Paiement Mobile Money confirmé !", corps=f"Commande {cmd.numero} payée.",
                                donnees_json={"commande_id": str(cmd_id)}))
            db.commit()
        return {"success": True, "status": "complete", "numero": cmd.numero}
    if status in ("failed", "canceled", "cancelled", "rejected"):
        return {"success": False, "status": status, "error": "Paiement échoué ou annulé"}
    return {"success": True, "status": status or "pending", "message": "En attente de confirmation"}

@cmd_router.post("/{cmd_id}/initier-paiement-stripe")
async def initier_paiement_stripe_route(cmd_id: UUID, body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Initie un paiement Stripe (Visa/Mastercard)"""
    body = body or {}
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    if cmd.statut not in ("en_attente_paiement", "brouillon"): raise HTTPException(400, "Commande déjà payée ou annulée")
    from app.services.payment_service import initier_paiement_stripe
    result = await initier_paiement_stripe(
        montant_fcfa=cmd.total_fcfa,
        email=user.email,
        reference=cmd.numero,
        description=f"Commande {cmd.numero} — ComeBuy",
        success_url=body.get("success_url", ""),
        cancel_url=body.get("cancel_url", ""),
    )
    if result.get("success"):
        pmt = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
        if pmt:
            pmt.reference_externe = result.get("session_id") or result.get("reference")
        db.commit()
    return result

@cmd_router.post("/{cmd_id}/initier-paiement-paypal")
async def initier_paiement_paypal_route(cmd_id: UUID, body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Initie un paiement PayPal"""
    body = body or {}
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    if cmd.statut not in ("en_attente_paiement", "brouillon"): raise HTTPException(400, "Commande déjà payée ou annulée")
    from app.services.payment_service import initier_paiement_paypal
    result = await initier_paiement_paypal(
        montant_fcfa=cmd.total_fcfa,
        email=user.email,
        reference=cmd.numero,
        description=f"Commande {cmd.numero} — ComeBuy",
        return_url=body.get("return_url", ""),
        cancel_url=body.get("cancel_url", ""),
    )
    if result.get("success"):
        pmt = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
        if pmt:
            pmt.reference_externe = result.get("order_id") or result.get("reference")
        db.commit()
    return result

@cmd_router.post("/{cmd_id}/verifier-paiement-stripe")
async def verifier_paiement_stripe_route(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Vérifie la session Stripe et marque la commande comme payée si OK."""
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    pmt = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
    if not pmt or not pmt.reference_externe:
        raise HTTPException(400, "Aucun paiement Stripe initié")
    from app.services.payment_service import verifier_paiement_stripe
    result = await verifier_paiement_stripe(pmt.reference_externe)
    if result.get("success") and (result.get("status") == "paid" or result.get("simulation")):
        pmt.statut = "confirme"; pmt.confirme_at = datetime.utcnow()
        cmd.statut = "payee"; cmd.payee_at = datetime.utcnow()
        db.add(Notification(destinataire_id=user.id, type="commande_confirmee",
                            titre="Paiement Stripe confirmé !", corps=f"Commande {cmd.numero} payée par carte.",
                            donnees_json={"commande_id": str(cmd_id)}))
        db.commit()
        return {"success": True, "numero": cmd.numero, "statut": "payee"}
    return {"success": False, "error": result.get("error") or "Paiement non confirmé", "status": result.get("status")}


@cmd_router.post("/{cmd_id}/verifier-paiement-paypal")
async def verifier_paiement_paypal_route(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Capture la commande PayPal et marque la commande comme payée si OK."""
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    pmt = db.query(Paiement).filter(Paiement.commande_id == cmd_id).first()
    if not pmt or not pmt.reference_externe:
        raise HTTPException(400, "Aucun paiement PayPal initié")
    from app.services.payment_service import capturer_paiement_paypal
    result = await capturer_paiement_paypal(pmt.reference_externe)
    if result.get("success") and (result.get("status") == "COMPLETED" or result.get("simulation")):
        pmt.statut = "confirme"; pmt.confirme_at = datetime.utcnow()
        cmd.statut = "payee"; cmd.payee_at = datetime.utcnow()
        db.add(Notification(destinataire_id=user.id, type="commande_confirmee",
                            titre="Paiement PayPal confirmé !", corps=f"Commande {cmd.numero} payée via PayPal.",
                            donnees_json={"commande_id": str(cmd_id)}))
        db.commit()
        return {"success": True, "numero": cmd.numero, "statut": "payee"}
    return {"success": False, "error": result.get("error") or "Paiement non capturé", "status": result.get("status")}


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
    # Email de confirmation/facture au client (ne bloque jamais la réponse)
    if user.email and is_valid_email(user.email):
        try:
            from app.services.email_service import send_invoice_email
            adr = cmd.adresse
            lignes = [{"nom": l.produit.nom if l.produit else "Produit",
                       "quantite": l.quantite,
                       "prix_total": l.prix_total or (l.prix_unitaire or 0) * l.quantite}
                      for l in cmd.lignes]
            send_invoice_email(user.email, user.nom_complet or "Client", cmd.numero, lignes,
                               cmd.sous_total_fcfa or 0, cmd.frais_livraison or 0, cmd.total_fcfa or 0,
                               adresse=f"{adr.quartier}, {adr.ville}" if adr else "",
                               creneau=cmd.creneau or "",
                               date_livraison=str(cmd.date_livraison or ""))
        except Exception as e:
            print(f"[EMAIL CONFIRMATION WARN] {e}")
    # SMS de confirmation en parallèle (simulé tant que INFOBIP_API_KEY n'est pas configurée)
    try:
        import asyncio
        from app.services.sms_service import envoyer_sms, sms_confirmation_commande
        msg = sms_confirmation_commande(cmd.numero, cmd.total_fcfa, cmd.creneau or "")
        asyncio.get_event_loop().create_task(envoyer_sms(user.telephone, msg))
    except Exception as e:
        print(f"[SMS SEND WARN] {e}")
    return {"message": "Paiement confirmé", "numero": cmd.numero}

@cmd_router.post("/{cmd_id}/annuler")
def annuler(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id).first()
    if not cmd: raise HTTPException(404)
    if cmd.statut in ("livree", "en_livraison"): raise HTTPException(400, "Déjà en livraison")
    if cmd.statut == "annulee": raise HTTPException(400, "Commande déjà annulée")
    # Libérer le livreur si la commande lui était assignée
    if cmd.livreur_id:
        liv = db.query(Livreur).filter(Livreur.id == cmd.livreur_id).first()
        if liv:
            liv.statut = "disponible"
            db.add(Notification(destinataire_id=liv.utilisateur_id, type="commande_annulee",
                                titre="Commande annulée", corps=f"La commande {cmd.numero} a été annulée par le client.",
                                donnees_json={"commande_id": str(cmd_id)}))
    cmd.statut = "annulee"; cmd.annulee_at = datetime.utcnow(); db.commit()
    return {"message": "Annulée"}

BONUS_SONDAGE = 50

def _niveau_pour_points(pts: int) -> str:
    if pts >= 10000: return "vip"
    if pts >= 5000:  return "or"
    if pts >= 1000:  return "argent"
    return "bronze"

def _crediter_points_livraison(cmd, db):
    """Crédite les points de la commande à la livraison (idempotent)."""
    if not (cmd.points_gagnes or 0) > 0:
        return
    fid = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == cmd.client_id).first()
    if not fid:
        return
    deja = db.query(FideliteTransaction).filter(
        FideliteTransaction.compte_id == fid.id,
        FideliteTransaction.commande_id == cmd.id,
        FideliteTransaction.type == "gain_commande").first()
    if deja:
        return
    fid.points_actuels += cmd.points_gagnes; fid.points_totaux += cmd.points_gagnes
    db.add(FideliteTransaction(compte_id=fid.id, type="gain_commande", points=cmd.points_gagnes,
                               solde_apres=fid.points_actuels, commande_id=cmd.id,
                               description=f"Points commande {cmd.numero}"))
    fid.niveau = _niveau_pour_points(fid.points_totaux)


def _evaluer_et_crediter(cmd, cmd_id, note, commentaire, extra, db, user):
    if db.query(Evaluation).filter(Evaluation.commande_id == cmd_id).first():
        raise HTTPException(409, "Déjà évaluée")
    ev = Evaluation(commande_id=cmd_id, client_id=user.id, livreur_id=cmd.livreur_id,
                    note=note, commentaire=commentaire, **extra)
    db.add(ev); db.flush()
    fid = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first()
    if fid:
        _crediter_points_livraison(cmd, db)
        # Bonus fixe +50 pts pour le sondage post-livraison complété
        fid.points_actuels += BONUS_SONDAGE; fid.points_totaux += BONUS_SONDAGE
        db.add(FideliteTransaction(compte_id=fid.id, type="bonus_sondage", points=BONUS_SONDAGE,
                                   solde_apres=fid.points_actuels, commande_id=cmd_id,
                                   description="Bonus sondage post-livraison"))
        fid.niveau = _niveau_pour_points(fid.points_totaux)
    db.commit()
    return ev

@cmd_router.post("/{cmd_id}/evaluer")
def evaluer(cmd_id: UUID, p: EvaluationIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id, Commande.statut == "livree").first()
    if not cmd: raise HTTPException(404, "Commande non trouvée ou non livrée")
    _evaluer_et_crediter(cmd, cmd_id, p.note, p.commentaire, {}, db, user)
    return {"message": "Évaluation enregistrée", "points_gagnes": cmd.points_gagnes}

@cmd_router.post("/{cmd_id}/sondage")
def sondage(cmd_id: UUID, p: SondageIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cmd = db.query(Commande).filter(Commande.id == cmd_id, Commande.client_id == user.id, Commande.statut == "livree").first()
    if not cmd: raise HTTPException(404, "Commande non trouvée ou non livrée")
    ev = _evaluer_et_crediter(cmd, cmd_id, p.note, p.commentaire,
        {"heure": p.heure, "lieu": p.lieu, "conformite": p.conformite,
         "publier_temoignage": p.publier_temoignage}, db, user)
    # Publie un témoignage si le client y consent et laisse un avis positif
    if p.publier_temoignage and p.commentaire and p.commentaire.strip() and p.note >= 4:
        ville = None
        if cmd.adresse:
            ville = ", ".join(filter(None, [cmd.adresse.ville, cmd.adresse.quartier])) or None
        db.add(Temoignage(nom=user.nom_complet or "Client", role="Client vérifié",
                          ville=ville, note=p.note, texte=p.commentaire.strip(),
                          avatar_url=user.avatar_url, evaluation_id=ev.id))
        db.commit()
    return {"message": "Sondage enregistré", "points_gagnes": cmd.points_gagnes}

# Livreur routes
@cmd_router.get("/livreur/disponibles")
def cmd_disponibles(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in ("livreur", "admin", "super_admin"): raise HTTPException(403)
    livreur = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    cmds = (db.query(Commande)
            .options(joinedload(Commande.client), joinedload(Commande.adresse),
                     joinedload(Commande.point_achat), joinedload(Commande.preparee_par))
            .filter(Commande.statut.in_(["payee", "prete"]))
            .order_by(Commande.prete_at.desc().nullslast(), Commande.created_at).limit(20).all())

    # Position actuelle du livreur pour calculer les distances marché
    liv_lat = float(livreur.latitude_actuelle) if livreur and livreur.latitude_actuelle else None
    liv_lon = float(livreur.longitude_actuelle) if livreur and livreur.longitude_actuelle else None

    result = []
    for c in cmds:
        pa = c.point_achat
        # Distance livreur → marché (si positions connues des deux côtés)
        dist = None
        if liv_lat and liv_lon and pa and pa.latitude and pa.longitude:
            dist = round(haversine(liv_lat, liv_lon, float(pa.latitude), float(pa.longitude)), 1)
        # Agent préparateur : celui qui a marqué "prête", sinon les agents du marché
        if c.preparee_par:
            agent_nom = c.preparee_par.nom_complet
        elif pa:
            agents = [a.nom_complet for a in pa.agents
                      if a.role == "agent" and a.statut == "actif" and not a.deleted_at]
            agent_nom = ", ".join(agents) if agents else None
        else:
            agent_nom = None
        result.append({
            "id": str(c.id), "numero": c.numero, "statut": c.statut,
            "prete": c.statut == "prete",
            "total_fcfa": c.total_fcfa, "creneau": c.creneau,
            "nb_lignes": len(c.lignes or []),
            "point_achat_id": str(pa.id) if pa else None,
            "point_achat_nom": pa.nom if pa else None,
            "point_achat_ville": pa.ville if pa else None,
            "point_achat_quartier": pa.quartier if pa else None,
            "agent_nom": agent_nom,
            "distance_km": dist,
            "client_nom":       c.client.nom_complet if c.client else None,
            "client_telephone": c.client.telephone   if c.client else None,
            "client_telephone2": c.client.telephone_secondaire if c.client else None,
            "adresse_quartier": c.adresse.quartier   if c.adresse else None,
            "adresse_ville":    c.adresse.ville       if c.adresse else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return result

@cmd_router.get("/livreur/en-cours")
def cmd_en_cours(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role not in ("livreur", "admin", "super_admin"): raise HTTPException(403)
    livreur = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not livreur: raise HTTPException(404, "Profil livreur introuvable")
    cmds = (db.query(Commande)
            .options(joinedload(Commande.client), joinedload(Commande.adresse),
                     joinedload(Commande.point_achat), joinedload(Commande.preparee_par))
            .filter(
                Commande.livreur_id == livreur.id,
                Commande.statut.in_(["assignee", "en_cours_marche", "en_livraison"])
            )
            .order_by(Commande.assignee_at.desc()).all())
    result = []
    for c in cmds:
        pa = c.point_achat
        if c.preparee_par:
            agent_nom = c.preparee_par.nom_complet
        elif pa:
            agents = [a.nom_complet for a in pa.agents
                      if a.role == "agent" and a.statut == "actif" and not a.deleted_at]
            agent_nom = ", ".join(agents) if agents else None
        else:
            agent_nom = None
        result.append({
            "id": str(c.id), "numero": c.numero, "statut": c.statut,
            "total_fcfa": c.total_fcfa, "creneau": c.creneau,
            "point_achat_nom": pa.nom if pa else None,
            "point_achat_quartier": pa.quartier if pa else None,
            "agent_nom": agent_nom,
            "client_nom":       c.client.nom_complet if c.client else None,
            "client_telephone": c.client.telephone   if c.client else None,
            "client_telephone2": c.client.telephone_secondaire if c.client else None,
            "adresse_quartier": c.adresse.quartier   if c.adresse else None,
            "adresse_ville":    c.adresse.ville       if c.adresse else None,
            "assignee_at": c.assignee_at.isoformat() if c.assignee_at else None,
        })
    return result

@cmd_router.post("/{cmd_id}/accepter")
def accepter(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    livreur = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not livreur: raise HTTPException(404, "Profil livreur introuvable")
    cmd = db.query(Commande).filter(Commande.id == cmd_id,
                                    Commande.statut.in_(["payee", "prete"])).first()
    if not cmd: raise HTTPException(404, "Commande indisponible")
    cmd.livreur_id = livreur.id; cmd.statut = "assignee"; cmd.assignee_at = datetime.utcnow()
    livreur.statut = "occupe"
    db.add(Notification(destinataire_id=cmd.client_id, type="livreur_assigne",
                        titre="Livreur en route !", corps=f"Votre livreur {user.nom_complet} est en route vers le marché.",
                        donnees_json={"commande_id": str(cmd_id)}))
    db.commit()

    # ── Emails : client (livreur assigné) + livreur (mission acceptée) ──
    try:
        client = cmd.client
        adr = f"{cmd.adresse.quartier}, {cmd.adresse.ville}" if cmd.adresse else ""
        send_acceptation_emails(
            client_email=client.email if client else None,
            client_nom=client.nom_complet if client else "",
            livreur_email=user.email, livreur_nom=user.nom_complet,
            livreur_tel=user.telephone,
            client_tel=client.telephone if client else "",
            client_tel2=client.telephone_secondaire if client else None,
            numero=cmd.numero, adresse=adr,
            creneau=cmd.creneau or "", total=cmd.total_fcfa or 0)
    except Exception as e:
        print(f"[ACCEPT EMAIL WARN] {e}")

    return {"message": "Commande acceptée"}

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
        _crediter_points_livraison(cmd, db)
    msgs = {"en_cours_marche": ("Livreur au marché 🛒","Vos courses sont en cours !"),
            "en_livraison": ("En route vers vous 🛵","Votre commande arrive !"),
            "livree": ("Commande livrée ✅","Profitez de votre commande !")}
    t, c = msgs[nouveau]
    db.add(Notification(destinataire_id=cmd.client_id, type=f"livreur_{nouveau}", titre=t, corps=c,
                        donnees_json={"commande_id": str(cmd_id)}))
    db.commit(); return {"message": f"Statut -> {nouveau}"}

# ══════════════════════════════════════════════
# FIDÉLITÉ
# ══════════════════════════════════════════════
fid_router = APIRouter(prefix="/fidelite", tags=["Fidélité"])

@fid_router.get("/compte", response_model=FideliteOut)
def mon_compte(db: Session = Depends(get_db), user=Depends(get_current_user)):
    f = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first()
    if not f: raise HTTPException(404)
    # Recalcule le niveau depuis les points totaux (corrige les comptes non synchronisés)
    niv = _niveau_pour_points(f.points_totaux)
    if f.niveau != niv:
        f.niveau = niv; db.commit()
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

NIVEAUX_ORDRE = {"bronze": 0, "argent": 1, "or": 2, "vip": 3}

@fid_router.post("/echanger/{recompense_id}")
def echanger(recompense_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    rec = db.query(FideliteRecompense).filter(FideliteRecompense.id == recompense_id, FideliteRecompense.actif == True).first()
    if not rec: raise HTTPException(404, "Récompense introuvable")
    fid = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == user.id).first()
    if not fid: raise HTTPException(404, "Compte fidélité introuvable")
    if NIVEAUX_ORDRE.get(fid.niveau, 0) < NIVEAUX_ORDRE.get(rec.niveau_requis, 0):
        raise HTTPException(403, f"Niveau {rec.niveau_requis} requis")
    if fid.points_actuels < rec.cout_points:
        raise HTTPException(400, f"Points insuffisants ({rec.cout_points} pts requis)")
    fid.points_actuels -= rec.cout_points
    db.add(FideliteTransaction(compte_id=fid.id, type="echange_recompense", points=-rec.cout_points,
                               solde_apres=fid.points_actuels,
                               description=f"Échange : {rec.nom}"))
    db.commit()
    return {"message": f"Récompense « {rec.nom} » obtenue", "points_actuels": fid.points_actuels}

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

# ── SCOPE AGENT COMMERCIAL ──
# Un agent ne voit que les données liées à son point d'achat (marché).
def _scope_cmd(q, user):
    if user.role == "agent":
        if not user.point_achat_id:
            return q.filter(Commande.id == None)  # aucun marché assigné -> rien
        return q.filter(Commande.point_achat_id == user.point_achat_id)
    return q

def _scope_pa(user):
    """Point d'achat de l'agent (ou None pour les admins)."""
    return user.point_achat_id if user.role == "agent" else None

@admin_router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), user=Depends(get_current_staff)):
    today = datetime.utcnow().date()
    first_of_month = today.replace(day=1)
    def cq(): return _scope_cmd(db.query(Commande), user)
    cmd_today = cq().filter(func.date(Commande.created_at) == today).count()
    en_cours = cq().filter(Commande.statut.in_(['en_livraison', 'en_cours_marche', 'assignee'])).count()
    livrees_today = cq().filter(Commande.statut == 'livree', func.date(Commande.livree_at) == today).count()
    annulees_today = cq().filter(Commande.statut == 'annulee', func.date(Commande.annulee_at) == today).count()
    # CA = montants réellement encaissés : commandes payées sur la période
    ca_today = cq().filter(
        Commande.statut.notin_(['annulee', 'brouillon']), func.date(Commande.payee_at) == today)\
        .with_entities(func.coalesce(func.sum(Commande.total_fcfa), 0)).scalar()
    ca_mois = cq().filter(
        Commande.statut.notin_(['annulee', 'brouillon']), func.date(Commande.payee_at) >= first_of_month)\
        .with_entities(func.coalesce(func.sum(Commande.total_fcfa), 0)).scalar()
    return DashboardOut(commandes_aujourd_hui=cmd_today, en_cours_livraison=en_cours,
                        livrees_aujourd_hui=livrees_today, annulees_aujourd_hui=annulees_today,
                        ca_aujourd_hui=ca_today or 0, ca_mois=ca_mois or 0)

@admin_router.get("/commandes")
def admin_commandes(page: int = 1, statut: str = None, db: Session = Depends(get_db), user=Depends(get_current_staff)):
    q = _scope_cmd(db.query(Commande), user).options(joinedload(Commande.client), joinedload(Commande.livreur).joinedload(Livreur.utilisateur))
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
            "client_telephone2": c.client.telephone_secondaire if c.client else None,
            "livreur_nom": liv_user.nom_complet if liv_user else None,
            "point_achat_nom": c.point_achat.nom if c.point_achat else None,
            "prete_at": c.prete_at.isoformat() if c.prete_at else None,
            "preparee_par_nom": c.preparee_par.nom_complet if c.preparee_par else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return result

@admin_router.get("/commandes/{cmd_id}")
def admin_commande_detail(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_staff)):
    c = (_scope_cmd(db.query(Commande), user)
         .options(joinedload(Commande.client), joinedload(Commande.adresse),
                  joinedload(Commande.lignes).joinedload(CommandeLigne.produit),
                  joinedload(Commande.livreur).joinedload(Livreur.utilisateur),
                  joinedload(Commande.point_achat), joinedload(Commande.preparee_par))
         .filter(Commande.id == cmd_id).first())
    if not c: raise HTTPException(404, "Commande introuvable")
    liv_user = c.livreur.utilisateur if c.livreur else None
    return {
        "id": str(c.id), "numero": c.numero, "statut": c.statut,
        "sous_total_fcfa": c.sous_total_fcfa, "frais_livraison": c.frais_livraison,
        "reduction_points": c.reduction_points, "total_fcfa": c.total_fcfa,
        "points_gagnes": c.points_gagnes,
        "creneau": c.creneau, "date_livraison": str(c.date_livraison) if c.date_livraison else None,
        "note_client": c.note_client,
        "client_nom": c.client.nom_complet if c.client else None,
        "client_telephone": c.client.telephone if c.client else None,
        "client_telephone2": c.client.telephone_secondaire if c.client else None,
        "adresse_quartier": c.adresse.quartier if c.adresse else None,
        "adresse_ville": c.adresse.ville if c.adresse else None,
        "adresse_details": ", ".join(filter(None, [c.adresse.rue, c.adresse.porte, c.adresse.complement])) if c.adresse else None,
        "point_achat_nom": c.point_achat.nom if c.point_achat else None,
        "point_achat_ville": c.point_achat.ville if c.point_achat else None,
        "prete_at": c.prete_at.isoformat() if c.prete_at else None,
        "preparee_par_nom": c.preparee_par.nom_complet if c.preparee_par else None,
        "livreur_nom": liv_user.nom_complet if liv_user else None,
        "livreur_telephone": liv_user.telephone if liv_user else None,
        "lignes": [{"nom": l.produit.nom if l.produit else "Produit",
                    "quantite": l.quantite or 0, "note": l.note_ligne,
                    "prix_unitaire": l.prix_unitaire, "prix_total": l.prix_total}
                   for l in (c.lignes or [])],
        "payee_at": c.payee_at.isoformat() if c.payee_at else None,
        "assignee_at": c.assignee_at.isoformat() if c.assignee_at else None,
        "livree_at": c.livree_at.isoformat() if c.livree_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }

@admin_router.post("/commandes/{cmd_id}/prete")
def marquer_commande_prete(cmd_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_staff)):
    """L'agent/admin marque une commande payée comme préparée → alerte livreurs + admins + client."""
    c = _scope_cmd(db.query(Commande), user).filter(Commande.id == cmd_id).first()
    if not c: raise HTTPException(404, "Commande introuvable")
    if c.statut == "prete":
        return {"ok": True, "message": "Déjà marquée prête"}
    if c.statut != "payee":
        raise HTTPException(409, f"Impossible : la commande est au statut « {c.statut} » (payée requis)")
    c.statut = "prete"; c.prete_at = datetime.utcnow(); c.preparee_par_id = user.id
    marche = c.point_achat.nom if c.point_achat else "le marché"

    # 1. Alerter les livreurs disponibles et vérifiés
    livreurs = (db.query(Livreur).join(Utilisateur, Livreur.utilisateur_id == Utilisateur.id)
                .filter(Livreur.statut == "disponible", Livreur.est_verifie == True,
                        Utilisateur.deleted_at.is_(None)).all())
    for liv in livreurs:
        db.add(Notification(destinataire_id=liv.utilisateur_id, type="commande_prete",
                            titre=f"Commande {c.numero} prête à récupérer 🛍️",
                            corps=f"{user.nom_complet} a préparé la commande {c.numero} au {marche} — récupérez-la pour livrer le client.",
                            donnees_json={"commande_id": str(c.id), "numero": c.numero, "marche": marche}))

    # 2. Alerter les administrateurs (sauf l'auteur)
    for adm in db.query(Utilisateur).filter(Utilisateur.role.in_(["admin", "super_admin"]),
                                          Utilisateur.deleted_at.is_(None),
                                          Utilisateur.id != user.id).all():
        db.add(Notification(destinataire_id=adm.id, type="commande_prete",
                            titre=f"Commande {c.numero} prête au {marche}",
                            corps=f"{user.nom_complet} a terminé la préparation — en attente d'un livreur.",
                            donnees_json={"commande_id": str(c.id), "numero": c.numero, "marche": marche}))

    # 3. Informer le client
    db.add(Notification(destinataire_id=c.client_id, type="commande_prete",
                        titre=f"Commande {c.numero} prête ! 🛍️",
                        corps=f"Votre commande est prête au {marche} — un livreur va la récupérer pour vous l'apporter.",
                        donnees_json={"commande_id": str(c.id)}))
    db.commit()
    return {"ok": True, "message": f"Commande {c.numero} marquée prête — {len(livreurs)} livreur(s) alerté(s)",
            "livreurs_alertes": len(livreurs)}

@admin_router.get("/livreurs")
def admin_livreurs(q: str = None, db: Session = Depends(get_db), user=Depends(get_current_staff)):
    query = db.query(Livreur).options(joinedload(Livreur.utilisateur)) \
        .join(Utilisateur, Livreur.utilisateur_id == Utilisateur.id) \
        .filter(Utilisateur.deleted_at.is_(None))
    if user.role == "agent":
        # Livreurs ayant traité une commande du marché de l'agent
        sub = db.query(Commande.livreur_id).filter(Commande.point_achat_id == user.point_achat_id,
                                                 Commande.livreur_id.isnot(None)).subquery()
        query = query.filter(Livreur.id.in_(sub))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Utilisateur.nom_complet.ilike(like),
                                 Utilisateur.telephone.ilike(like),
                                 Utilisateur.email.ilike(like),
                                 Livreur.plaque.ilike(like),
                                 Livreur.zone_couverte.ilike(like)))
    livs = query.all()
    # Nombre de missions en cours par livreur (un livreur peut en cumuler plusieurs)
    actives = dict(db.query(Commande.livreur_id, func.count(Commande.id))
                   .filter(Commande.statut.in_(["assignee", "en_cours_marche", "en_livraison"]),
                           Commande.livreur_id.isnot(None))
                   .group_by(Commande.livreur_id).all())
    result = []
    for l in livs:
        u = l.utilisateur
        result.append({
            "id": str(l.id), "utilisateur_id": str(l.utilisateur_id),
            "nom_complet": u.nom_complet if u else None,
            "telephone": u.telephone if u else None,
            "email": u.email if u else None,
            "type_vehicule": l.type_vehicule, "plaque": l.plaque,
            "numero_permis": l.numero_permis,
            "statut": l.statut, "statut_compte": u.statut if u else None, "niveau": l.niveau,
            "note_moyenne": float(l.note_moyenne or 0),
            "total_livraisons": l.total_livraisons or 0,
            "total_gains_fcfa": l.total_gains_fcfa or 0,
            "est_verifie": l.est_verifie,
            "zone_couverte": l.zone_couverte,
            "missions_actives": actives.get(l.id, 0),
        })
    return result

@admin_router.post("/livreurs")
def creer_livreur(body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    """Créer un compte livreur (utilisateur + profil livreur) — identifiants envoyés par email."""
    body = body or {}
    nom, tel, email, mdp = _creer_staff_user(body, "livreur", db)
    u = Utilisateur(nom_complet=nom, telephone=tel, email=email, role="livreur", statut="actif",
                    mot_de_passe_hash=hash_password(mdp))
    db.add(u); db.flush()
    liv = Livreur(utilisateur_id=u.id,
                  type_vehicule=body.get("type_vehicule") or "moto",
                  plaque=body.get("plaque"), numero_permis=body.get("numero_permis"),
                  zone_couverte=body.get("zone_couverte"),
                  statut="hors_ligne", est_verifie=True)
    db.add(liv); db.commit(); db.refresh(liv)
    if email:
        try: send_welcome_email(email, nom, tel, "livreur", mdp)
        except Exception as e: print(f"[WELCOME EMAIL WARN] {e}")
    return {"id": str(liv.id), "utilisateur_id": str(u.id), "nom_complet": nom, "telephone": tel}

@admin_router.put("/livreurs/{livreur_id}")
def update_livreur_admin(livreur_id: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    body = body or {}
    liv = db.query(Livreur).filter(Livreur.id == livreur_id).first()
    if not liv: raise HTTPException(404, "Livreur introuvable")
    u = liv.utilisateur
    if body.get("nom_complet"): u.nom_complet = body["nom_complet"].strip()[:120]
    if "email" in body:
        email = (body["email"] or "").strip().lower() or None
        if email and not is_valid_email(email): raise HTTPException(422, "Adresse email invalide")
        if email and db.query(Utilisateur).filter(Utilisateur.email == email, Utilisateur.id != u.id).first():
            raise HTTPException(409, "Cette adresse email est déjà utilisée")
        u.email = email
    for champ in ("type_vehicule", "plaque", "numero_permis", "zone_couverte"):
        if champ in body: setattr(liv, champ, body[champ])
    if body.get("statut") in ("disponible", "occupe", "hors_ligne", "en_pause"):
        liv.statut = body["statut"]
    if body.get("statut_compte") in ("actif", "suspendu"):
        u.statut = body["statut_compte"]
        if u.statut == "suspendu":
            # Le suspendre le retire des livreurs joignables : plus de missions ni d'alertes
            liv.statut = "hors_ligne"
    if body.get("mot_de_passe"):
        valider_mot_de_passe_fort(body["mot_de_passe"])
        u.mot_de_passe_hash = hash_password(body["mot_de_passe"])
    db.commit(); db.refresh(liv)
    return {"ok": True, "id": str(liv.id)}

@admin_router.delete("/livreurs/{livreur_id}")
def delete_livreur(livreur_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    liv = db.query(Livreur).filter(Livreur.id == livreur_id).first()
    if not liv: raise HTTPException(404, "Livreur introuvable")
    # Ne pas supprimer un livreur avec des courses en cours
    en_cours = db.query(Commande).filter(Commande.livreur_id == liv.id,
                                         Commande.statut.in_(["assignee", "en_cours_marche", "en_livraison"])).count()
    if en_cours: raise HTTPException(409, "Impossible : ce livreur a des livraisons en cours")
    u = liv.utilisateur
    u.deleted_at = datetime.utcnow(); u.statut = "supprime"; liv.statut = "hors_ligne"
    db.commit()
    return {"ok": True}

@admin_router.get("/utilisateurs")
def admin_users(role: str = None, q: str = None, page: int = 1, db: Session = Depends(get_db), user=Depends(get_current_staff)):
    # Un agent ne peut pas lister les administrateurs ni les autres agents
    if user.role == "agent" and role in ("admin", "super_admin", "agent"):
        raise HTTPException(403, "Accès réservé aux administrateurs")
    q_ = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None))
    if role == "admin":
        q_ = q_.filter(Utilisateur.role.in_(["admin", "super_admin"]))
    elif role: q_ = q_.filter(Utilisateur.role == role)
    if user.role == "agent":
        # Uniquement les clients ayant commandé sur son marché
        sub = db.query(Commande.client_id).filter(Commande.point_achat_id == user.point_achat_id).subquery()
        q_ = q_.filter(Utilisateur.role == "client", Utilisateur.id.in_(sub))
    if q:
        like = f"%{q}%"
        q_ = q_.filter(or_(Utilisateur.nom_complet.ilike(like),
                           Utilisateur.telephone.ilike(like),
                           Utilisateur.email.ilike(like)))
    q = q_
    total = q.count()
    users = q.order_by(Utilisateur.created_at.desc()).offset((page-1)*20).limit(20).all()
    return {"total": total, "users": [UtilisateurOut.model_validate(u) for u in users]}

@admin_router.get("/stats")
def admin_stats(db: Session = Depends(get_db), user=Depends(get_current_staff)):
    join_cmd = "JOIN commandes c ON cl.commande_id = c.id"
    where = "WHERE c.point_achat_id = :pa" if user.role == "agent" else ""
    rows = db.execute(text(f"""
        SELECT p.nom, COUNT(cl.id) nb_commandes, COALESCE(SUM(cl.prix_total),0) ca
        FROM commandes_lignes cl {join_cmd} JOIN produits p ON cl.produit_id=p.id
        {where}
        GROUP BY p.id,p.nom ORDER BY nb_commandes DESC LIMIT 10
    """), {"pa": str(user.point_achat_id).replace('-', '') if user.role == "agent" else None}).mappings().all()
    return [dict(r) for r in rows]

@admin_router.put("/commandes/{cmd_id}/assigner/{livreur_id}")
def assigner(cmd_id: UUID, livreur_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_staff)):
    cmd = _scope_cmd(db.query(Commande), user).filter(Commande.id == cmd_id).first()
    liv = db.query(Livreur).filter(Livreur.id == livreur_id).first()
    if not cmd or not liv: raise HTTPException(404)
    cmd.livreur_id = liv.id; cmd.statut = "assignee"; cmd.assignee_at = datetime.utcnow()
    liv.statut = "occupe"; db.commit(); return {"ok": True}

@admin_router.put("/utilisateurs/{user_id}/statut")
def admin_change_user_statut(user_id: UUID, body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_staff)):
    body = body or {}
    u = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not u: raise HTTPException(404)
    if user.role == "agent" and u.role != "client":
        raise HTTPException(403, "Un agent ne peut modifier que des comptes clients")
    u.statut = body.get("statut", u.statut); db.commit()
    return {"ok": True, "statut": u.statut}

@admin_router.put("/livreurs/{livreur_id}/verifier")
def admin_toggle_verif(livreur_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_staff)):
    liv = db.query(Livreur).filter(Livreur.id == livreur_id).first()
    if not liv: raise HTTPException(404)
    liv.est_verifie = not liv.est_verifie
    if liv.est_verifie: liv.verifie_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "est_verifie": liv.est_verifie}

@admin_router.get("/stats/commandes")
def admin_stats_commandes(db: Session = Depends(get_db), user=Depends(get_current_staff)):
    where = "WHERE point_achat_id = :pa" if user.role == "agent" else ""
    rows = db.execute(text(f"""
        SELECT statut, COUNT(*) as count,
               COALESCE(SUM(CASE WHEN payee_at IS NOT NULL THEN total_fcfa ELSE 0 END),0) as total
        FROM commandes {where} GROUP BY statut ORDER BY count DESC
    """), {"pa": str(user.point_achat_id).replace('-', '') if user.role == "agent" else None}).mappings().all()
    return [dict(r) for r in rows]

@admin_router.get("/stats/revenus")
def admin_stats_revenus(db: Session = Depends(get_db), user=Depends(get_current_staff)):
    mois_expr = ("TO_CHAR(payee_at, 'YYYY-MM')" if db.bind.dialect.name == "postgresql"
                 else "strftime('%Y-%m', payee_at)")
    and_pa = "AND point_achat_id = :pa" if user.role == "agent" else ""
    rows = db.execute(text(f"""
        SELECT {mois_expr} as mois,
               COUNT(*) as nb_commandes,
               COALESCE(SUM(total_fcfa),0) as ca
        FROM commandes WHERE statut NOT IN ('annulee','brouillon')
          AND payee_at IS NOT NULL {and_pa}
        GROUP BY {mois_expr}
        ORDER BY mois DESC LIMIT 12
    """), {"pa": str(user.point_achat_id).replace('-', '') if user.role == "agent" else None}).mappings().all()
    data = {r["mois"]: r for r in rows}
    # Série complète des 6 derniers mois — les mois sans vente valent 0,
    # sinon le graphique n'affiche qu'une barre sans contexte
    result, (y, m) = [], (datetime.utcnow().year, datetime.utcnow().month)
    for _ in range(6):
        r = data.get(f"{y:04d}-{m:02d}")
        result.append({"mois": f"{y:04d}-{m:02d}",
                       "nb_commandes": r["nb_commandes"] if r else 0,
                       "ca": r["ca"] if r else 0})
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return result

@admin_router.get("/monitoring")
def admin_monitoring(db: Session = Depends(get_db), user=Depends(get_current_staff)):
    """Dashboard de monitoring : stats globales, utilisateurs par plateforme, activité récente"""
    from datetime import timedelta
    now = datetime.utcnow()
    today = now.date()
    seuil_actif = now - timedelta(hours=24)
    seuil_en_ligne = now - timedelta(minutes=30)

    # Utilisateurs totaux (agent : clients de son marché, admins masqués)
    total_users = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None), Utilisateur.statut == "actif").count()
    if user.role == "agent":
        sub_clients = db.query(Commande.client_id).filter(Commande.point_achat_id == user.point_achat_id).subquery()
        total_clients = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None), Utilisateur.role == "client",
                                                   Utilisateur.statut == "actif", Utilisateur.id.in_(sub_clients)).count()
        total_admins = 0
    else:
        total_clients = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None), Utilisateur.role == "client", Utilisateur.statut == "actif").count()
        total_admins = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None), Utilisateur.role.in_(["admin", "super_admin"])).count()
    total_livreurs = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None), Utilisateur.role == "livreur").count()

    # Utilisateurs actifs dernières 24h
    actifs_24h = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        Utilisateur.derniere_connexion >= seuil_actif
    ).count()

    # Utilisateurs "en ligne" (connexion < 30 min)
    en_ligne = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        Utilisateur.derniere_connexion >= seuil_en_ligne
    ).count()

    # Par plateforme (en ligne < 30 min)
    en_ligne_web = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        Utilisateur.derniere_connexion >= seuil_en_ligne,
        Utilisateur.derniere_plateforme == "web"
    ).count()
    en_ligne_mobile = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        Utilisateur.derniere_connexion >= seuil_en_ligne,
        Utilisateur.derniere_plateforme == "mobile"
    ).count()

    # Actifs 24h par plateforme
    actifs_web_24h = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        Utilisateur.derniere_connexion >= seuil_actif,
        Utilisateur.derniere_plateforme == "web"
    ).count()
    actifs_mobile_24h = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        Utilisateur.derniere_connexion >= seuil_actif,
        Utilisateur.derniere_plateforme == "mobile"
    ).count()

    # Nouveaux inscrits aujourd'hui
    inscrits_today = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        func.date(Utilisateur.created_at) == today
    ).count()

    # Nouveaux inscrits ce mois
    first_of_month = today.replace(day=1)
    inscrits_mois = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        func.date(Utilisateur.created_at) >= first_of_month
    ).count()

    # Commandes du jour (scopées au marché pour un agent)
    def _cq(): return _scope_cmd(db.query(Commande), user)
    cmd_today = _cq().filter(func.date(Commande.created_at) == today).count()
    ca_today = _cq().filter(
        Commande.statut.notin_(['annulee', 'brouillon']), func.date(Commande.payee_at) == today)\
        .with_entities(func.coalesce(func.sum(Commande.total_fcfa), 0)).scalar() or 0
    en_cours = _cq().filter(Commande.statut.in_(['en_livraison', 'en_cours_marche', 'assignee'])).count()
    livrees_today = _cq().filter(Commande.statut == 'livree', func.date(Commande.livree_at) == today).count()

    # Produits
    total_produits = db.query(Produit).filter(Produit.deleted_at.is_(None), Produit.est_actif == True).count()
    total_sections = db.query(Section).filter(Section.actif == True).count()

    # Derniers utilisateurs connectés (10) — admins/agents masqués pour un agent
    recents_q = db.query(Utilisateur).filter(
        Utilisateur.deleted_at.is_(None),
        Utilisateur.derniere_connexion.isnot(None)
    )
    if user.role == "agent":
        recents_q = recents_q.filter(Utilisateur.role.in_(["client", "livreur"]))
    recents = recents_q.order_by(Utilisateur.derniere_connexion.desc()).limit(15).all()

    utilisateurs_recents = [{
        "id": str(u.id),
        "nom_complet": u.nom_complet,
        "telephone": u.telephone,
        "role": u.role,
        "plateforme": u.derniere_plateforme or "inconnu",
        "derniere_connexion": u.derniere_connexion.isoformat() if u.derniere_connexion else None,
        "en_ligne": u.derniere_connexion >= seuil_en_ligne if u.derniere_connexion else False,
    } for u in recents]

    return {
        "utilisateurs": {
            "total": total_users,
            "clients": total_clients,
            "livreurs": total_livreurs,
            "admins": total_admins,
            "en_ligne": en_ligne,
            "actifs_24h": actifs_24h,
            "inscrits_aujourd_hui": inscrits_today,
            "inscrits_mois": inscrits_mois,
        },
        "plateformes": {
            "web": {"en_ligne": en_ligne_web, "actifs_24h": actifs_web_24h},
            "mobile": {"en_ligne": en_ligne_mobile, "actifs_24h": actifs_mobile_24h},
        },
        "commandes": {
            "aujourd_hui": cmd_today,
            "ca_aujourd_hui": ca_today,
            "en_cours": en_cours,
            "livrees_aujourd_hui": livrees_today,
        },
        "catalogue": {
            "total_produits": total_produits,
            "total_sections": total_sections,
        },
        "utilisateurs_recents": utilisateurs_recents,
    }

@admin_router.get("/monitoring/utilisateurs")
def admin_monitoring_users(
    plateforme: Optional[str] = None,
    role: Optional[str] = None,
    en_ligne: Optional[bool] = None,
    page: int = 1,
    db: Session = Depends(get_db),
    user=Depends(get_current_staff)
):
    """Liste détaillée des utilisateurs avec filtres plateforme/rôle/en ligne"""
    from datetime import timedelta
    seuil_en_ligne = datetime.utcnow() - timedelta(minutes=30)

    if user.role == "agent" and role in ("admin", "super_admin", "agent"):
        raise HTTPException(403, "Accès réservé aux administrateurs")

    q = db.query(Utilisateur).filter(Utilisateur.deleted_at.is_(None))
    if user.role == "agent":
        q = q.filter(Utilisateur.role.in_(["client", "livreur"]))
    if plateforme:
        q = q.filter(Utilisateur.derniere_plateforme == plateforme)
    if role:
        q = q.filter(Utilisateur.role == role)
    if en_ligne is True:
        q = q.filter(Utilisateur.derniere_connexion >= seuil_en_ligne)
    elif en_ligne is False:
        q = q.filter(or_(
            Utilisateur.derniere_connexion.is_(None),
            Utilisateur.derniere_connexion < seuil_en_ligne
        ))

    total = q.count()
    users = q.order_by(Utilisateur.derniere_connexion.desc().nullslast()).offset((page-1)*20).limit(20).all()

    return {
        "total": total,
        "page": page,
        "users": [{
            "id": str(u.id),
            "nom_complet": u.nom_complet,
            "telephone": u.telephone,
            "email": u.email,
            "role": u.role,
            "statut": u.statut,
            "plateforme": u.derniere_plateforme or "inconnu",
            "derniere_connexion": u.derniere_connexion.isoformat() if u.derniere_connexion else None,
            "en_ligne": u.derniere_connexion >= seuil_en_ligne if u.derniere_connexion else False,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in users]
    }

@admin_router.get("/parametres")
def get_params(db: Session = Depends(get_db), _=Depends(get_current_staff)):
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

def _niveau_livreur(total_livraisons: int) -> str:
    if total_livraisons >= 150: return "elite"
    if total_livraisons >= 50:  return "expert"
    if total_livraisons >= 20:  return "senior"
    if total_livraisons >= 5:   return "junior"
    return "debutant"

def _stats_livreur(liv: Livreur, db: Session) -> dict:
    """Stats calculées depuis les vraies données (livraisons, évaluations)."""
    livrees = (db.query(Commande)
               .filter(Commande.livreur_id == liv.id, Commande.statut == "livree").all())
    total_livraisons = len(livrees)
    # Le gain du livreur = les frais de livraison de chaque commande livrée
    total_gains = sum(c.frais_livraison or 0 for c in livrees)
    note = (db.query(func.avg(Evaluation.note))
            .filter(Evaluation.livreur_id == liv.id).scalar())
    niveau = _niveau_livreur(total_livraisons)
    # Persiste les valeurs calculées
    liv.total_livraisons = total_livraisons
    liv.total_gains_fcfa = total_gains
    liv.note_moyenne = round(float(note or 0), 2)
    liv.niveau = niveau
    db.commit()
    return {"id": str(liv.id), "statut": liv.statut, "niveau": niveau,
            "note_moyenne": round(float(note or 0), 2), "total_livraisons": total_livraisons,
            "total_gains_fcfa": total_gains, "est_verifie": liv.est_verifie}

@liv_router.get("/profil")
def profil_livreur(db: Session = Depends(get_db), user=Depends(get_current_user)):
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    return _stats_livreur(liv, db)

@liv_router.put("/statut")
def changer_statut_livreur(body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    liv.statut = body.get("statut", liv.statut); db.commit(); return {"statut": liv.statut}

@liv_router.get("/profil/detail")
def profil_detail(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Profil livreur complet (infos personnelles + véhicule + zone)."""
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    return {"id": str(liv.id), "statut": liv.statut, "niveau": liv.niveau,
            "type_vehicule": liv.type_vehicule, "plaque": liv.plaque,
            "zone_couverte": liv.zone_couverte, "est_verifie": liv.est_verifie,
            "nom_complet": user.nom_complet, "telephone": user.telephone,
            "telephone_secondaire": user.telephone_secondaire, "email": user.email}

@liv_router.put("/profil")
def update_profil_livreur(body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Met à jour le véhicule et la zone de couverture du livreur."""
    body = body or {}
    liv = db.query(Livreur).filter(Livreur.utilisateur_id == user.id).first()
    if not liv: raise HTTPException(404)
    for champ in ("type_vehicule", "plaque", "zone_couverte"):
        if champ in body and body[champ] is not None:
            setattr(liv, champ, str(body[champ])[:100])
    db.commit()
    return {"message": "Profil mis à jour"}

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
    cmds = (db.query(Commande)
            .options(joinedload(Commande.client), joinedload(Commande.adresse),
                     joinedload(Commande.lignes).joinedload(CommandeLigne.produit),
                     joinedload(Commande.evaluation))
            .filter(Commande.livreur_id == liv.id, Commande.statut == "livree")
            .order_by(Commande.livree_at.desc()).limit(50).all())
    return [{
        "id": str(c.id), "numero": c.numero, "statut": c.statut,
        "total_fcfa": c.total_fcfa, "sous_total_fcfa": c.sous_total_fcfa,
        "frais_livraison": c.frais_livraison,
        "gain_fcfa": c.frais_livraison or 0,
        "creneau": c.creneau,
        "date_livraison": c.date_livraison.isoformat() if c.date_livraison else None,
        "livree_at": c.livree_at.isoformat() if c.livree_at else None,
        "client_nom": c.client.nom_complet if c.client else None,
        "client_telephone": c.client.telephone if c.client else None,
        "client_telephone2": c.client.telephone_secondaire if c.client else None,
        "adresse_quartier": c.adresse.quartier if c.adresse else None,
        "adresse_ville": c.adresse.ville if c.adresse else None,
        "lignes": [{"nom": l.produit.nom if l.produit else "Produit",
                    "quantite": l.quantite, "prix_total": l.prix_total}
                   for l in (c.lignes or [])],
        "note_client": c.evaluation.note if c.evaluation else None,
        "avis_client": c.evaluation.commentaire if c.evaluation else None,
    } for c in cmds]

# ══════════════════════════════════════════════
# POINTS D'ACHAT (marchés) + AGENTS + ADMINISTRATEURS — réservé admin
# ══════════════════════════════════════════════

def _pa_dict(p: PointAchat, db: Session) -> dict:
    return {
        "id": str(p.id), "nom": p.nom, "ville": p.ville, "quartier": p.quartier,
        "adresse": p.adresse, "telephone": p.telephone, "actif": p.actif,
        "latitude": float(p.latitude) if p.latitude is not None else None,
        "longitude": float(p.longitude) if p.longitude is not None else None,
        "nb_agents": db.query(Utilisateur).filter(Utilisateur.point_achat_id == p.id,
                                                Utilisateur.role == "agent",
                                                Utilisateur.deleted_at.is_(None)).count(),
        "nb_commandes": db.query(Commande).filter(Commande.point_achat_id == p.id).count(),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

@admin_router.get("/points-achat")
def admin_points_achat(q: str = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    query = db.query(PointAchat)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(PointAchat.nom.ilike(like), PointAchat.ville.ilike(like), PointAchat.quartier.ilike(like)))
    return [_pa_dict(p, db) for p in query.order_by(PointAchat.nom).all()]

@admin_router.post("/points-achat")
def creer_point_achat(body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    if not body.get("nom"): raise HTTPException(400, "Nom requis")
    p = PointAchat(nom=body["nom"].strip()[:120], ville=body.get("ville"),
                   quartier=body.get("quartier"), adresse=body.get("adresse"),
                   telephone=body.get("telephone"), actif=body.get("actif", True),
                   latitude=body.get("latitude"), longitude=body.get("longitude"))
    db.add(p); db.commit(); db.refresh(p)
    return _pa_dict(p, db)

@admin_router.put("/points-achat/{pa_id}")
def update_point_achat(pa_id: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    p = db.query(PointAchat).filter(PointAchat.id == pa_id).first()
    if not p: raise HTTPException(404, "Point d'achat introuvable")
    for champ in ("nom", "ville", "quartier", "adresse", "telephone", "actif", "latitude", "longitude"):
        if champ in body: setattr(p, champ, body[champ])
    db.commit(); db.refresh(p)
    return _pa_dict(p, db)

@admin_router.delete("/points-achat/{pa_id}")
def delete_point_achat(pa_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    p = db.query(PointAchat).filter(PointAchat.id == pa_id).first()
    if not p: raise HTTPException(404, "Point d'achat introuvable")
    # Sécurité : ne pas supprimer si des agents ou commandes y sont rattachés
    if db.query(Utilisateur).filter(Utilisateur.point_achat_id == p.id, Utilisateur.deleted_at.is_(None)).count():
        raise HTTPException(409, "Impossible : des agents sont rattachés à ce point d'achat")
    if db.query(Commande).filter(Commande.point_achat_id == p.id).count():
        p.actif = False; db.commit()
        return {"ok": True, "message": "Point d'achat désactivé (commandes existantes)"}
    db.delete(p); db.commit()
    return {"ok": True}

# ── Agents commerciaux ──
def _user_admin_dict(u: Utilisateur, db: Session) -> dict:
    return {
        "id": str(u.id), "nom_complet": u.nom_complet, "telephone": u.telephone,
        "email": u.email, "role": u.role, "statut": u.statut,
        "point_achat_id": str(u.point_achat_id) if u.point_achat_id else None,
        "point_achat_nom": u.point_achat.nom if u.point_achat else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }

def _creer_staff_user(body: dict, role: str, db: Session):
    """Création commune agent/admin : validations téléphone, email, mot de passe."""
    nom  = (body.get("nom_complet") or "").strip()
    tel  = (body.get("telephone") or "").strip().replace(" ", "")
    mdp  = body.get("mot_de_passe") or ""
    if not nom:  raise HTTPException(400, "Nom complet requis")
    if not tel:  raise HTTPException(400, "Téléphone requis")
    if tel.startswith("00"): tel = "+" + tel[2:]
    elif not tel.startswith("+"): tel = "+237" + tel.lstrip("0")
    if db.query(Utilisateur).filter(Utilisateur.telephone == tel, Utilisateur.deleted_at.is_(None)).first():
        raise HTTPException(409, "Ce numéro de téléphone est déjà utilisé")
    email = (body.get("email") or "").strip().lower() or None
    if email:
        if not is_valid_email(email): raise HTTPException(422, "Adresse email invalide")
        if db.query(Utilisateur).filter(Utilisateur.email == email, Utilisateur.deleted_at.is_(None)).first():
            raise HTTPException(409, "Cette adresse email est déjà utilisée")
    valider_mot_de_passe_fort(mdp)
    return nom, tel, email, mdp

@admin_router.get("/agents")
def admin_agents(q: str = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    query = db.query(Utilisateur).options(joinedload(Utilisateur.point_achat)).filter(
        Utilisateur.role == "agent", Utilisateur.deleted_at.is_(None))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Utilisateur.nom_complet.ilike(like),
                                 Utilisateur.telephone.ilike(like),
                                 Utilisateur.email.ilike(like)))
    return [_user_admin_dict(u, db) for u in query.order_by(Utilisateur.created_at.desc()).all()]

@admin_router.post("/agents")
def creer_agent(body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    nom, tel, email, mdp = _creer_staff_user(body, "agent", db)
    pa_id = body.get("point_achat_id")
    pa = None
    if pa_id:
        pa = db.query(PointAchat).filter(PointAchat.id == pa_id).first()
        if not pa: raise HTTPException(404, "Point d'achat introuvable")
    u = Utilisateur(nom_complet=nom, telephone=tel, email=email, role="agent", statut="actif",
                    mot_de_passe_hash=hash_password(mdp), point_achat_id=pa.id if pa else None)
    db.add(u); db.commit(); db.refresh(u)
    if email:
        try: send_welcome_email(email, nom, tel, "agent", mdp)
        except Exception as e: print(f"[WELCOME EMAIL WARN] {e}")
    return _user_admin_dict(u, db)

@admin_router.put("/agents/{user_id}")
def update_agent(user_id: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    u = db.query(Utilisateur).filter(Utilisateur.id == user_id, Utilisateur.role == "agent",
                                   Utilisateur.deleted_at.is_(None)).first()
    if not u: raise HTTPException(404, "Agent introuvable")
    if body.get("nom_complet"): u.nom_complet = body["nom_complet"].strip()[:120]
    if "email" in body:
        email = (body["email"] or "").strip().lower() or None
        if email and not is_valid_email(email): raise HTTPException(422, "Adresse email invalide")
        if email and db.query(Utilisateur).filter(Utilisateur.email == email, Utilisateur.id != u.id).first():
            raise HTTPException(409, "Cette adresse email est déjà utilisée")
        u.email = email
    if "point_achat_id" in body:
        pa_id = body["point_achat_id"]
        if pa_id and not db.query(PointAchat).filter(PointAchat.id == pa_id).first():
            raise HTTPException(404, "Point d'achat introuvable")
        u.point_achat_id = pa_id or None
    if body.get("statut") in ("actif", "suspendu"): u.statut = body["statut"]
    if body.get("mot_de_passe"):
        valider_mot_de_passe_fort(body["mot_de_passe"])
        u.mot_de_passe_hash = hash_password(body["mot_de_passe"])
    db.commit(); db.refresh(u)
    return _user_admin_dict(u, db)

@admin_router.delete("/agents/{user_id}")
def delete_agent(user_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    u = db.query(Utilisateur).filter(Utilisateur.id == user_id, Utilisateur.role == "agent",
                                   Utilisateur.deleted_at.is_(None)).first()
    if not u: raise HTTPException(404, "Agent introuvable")
    u.deleted_at = datetime.utcnow(); u.statut = "supprime"; db.commit()
    return {"ok": True}

# ── Administrateurs ──
@admin_router.get("/administrateurs")
def admin_administrateurs(q: str = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    query = db.query(Utilisateur).filter(Utilisateur.role.in_(["admin", "super_admin"]),
                                         Utilisateur.deleted_at.is_(None))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Utilisateur.nom_complet.ilike(like),
                                 Utilisateur.telephone.ilike(like),
                                 Utilisateur.email.ilike(like)))
    return [_user_admin_dict(u, db) for u in query.order_by(Utilisateur.created_at.desc()).all()]

@admin_router.post("/administrateurs")
def creer_admin(body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    nom, tel, email, mdp = _creer_staff_user(body, "admin", db)
    u = Utilisateur(nom_complet=nom, telephone=tel, email=email, role="admin", statut="actif",
                    mot_de_passe_hash=hash_password(mdp))
    db.add(u); db.commit(); db.refresh(u)
    if email:
        try: send_welcome_email(email, nom, tel, "admin", mdp)
        except Exception as e: print(f"[WELCOME EMAIL WARN] {e}")
    return _user_admin_dict(u, db)

@admin_router.put("/administrateurs/{user_id}")
def update_admin(user_id: UUID, body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    body = body or {}
    u = db.query(Utilisateur).filter(Utilisateur.id == user_id,
                                   Utilisateur.role.in_(["admin", "super_admin"]),
                                   Utilisateur.deleted_at.is_(None)).first()
    if not u: raise HTTPException(404, "Administrateur introuvable")
    if body.get("nom_complet"): u.nom_complet = body["nom_complet"].strip()[:120]
    if "email" in body:
        email = (body["email"] or "").strip().lower() or None
        if email and not is_valid_email(email): raise HTTPException(422, "Adresse email invalide")
        if email and db.query(Utilisateur).filter(Utilisateur.email == email, Utilisateur.id != u.id).first():
            raise HTTPException(409, "Cette adresse email est déjà utilisée")
        u.email = email
    if body.get("statut") in ("actif", "suspendu"):
        if u.id == user.id: raise HTTPException(400, "Vous ne pouvez pas suspendre votre propre compte")
        u.statut = body["statut"]
    if body.get("mot_de_passe"):
        valider_mot_de_passe_fort(body["mot_de_passe"])
        u.mot_de_passe_hash = hash_password(body["mot_de_passe"])
    db.commit(); db.refresh(u)
    return _user_admin_dict(u, db)

@admin_router.delete("/administrateurs/{user_id}")
def delete_admin(user_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_admin)):
    if user_id == user.id: raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte")
    u = db.query(Utilisateur).filter(Utilisateur.id == user_id,
                                   Utilisateur.role.in_(["admin", "super_admin"]),
                                   Utilisateur.deleted_at.is_(None)).first()
    if not u: raise HTTPException(404, "Administrateur introuvable")
    u.deleted_at = datetime.utcnow(); u.statut = "supprime"; db.commit()
    return {"ok": True}
