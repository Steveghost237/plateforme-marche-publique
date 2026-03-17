"""
routes_extra.py — Suggestions, gestion prix, zones de livraison par distance
"""
import math
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.models import (
    Section, Produit, Adresse, ZoneLivraison, Commande,
    SuggestionProduit, VoteSuggestion, HistoriquePrix,
    FideliteCompte, FideliteTransaction, Notification, Utilisateur
)

# ──────────────────────────────────────────────
# UTILITAIRE : calcul distance haversine (km)
# ──────────────────────────────────────────────
MARCHE_LAT  = 3.8667   # Marché Mokolo, Yaoundé
MARCHE_LON  = 11.5167

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def est_heure_pointe(now: datetime) -> bool:
    """Majoration en semaine (Lun–Ven) aux heures de pointe : 11h–14h et 18h–22h."""
    jour_semaine = now.weekday()  # 0=lun … 4=ven, 5=sam, 6=dim
    if jour_semaine >= 5:          # weekend → pas de majoration
        return False
    return now.hour in range(11, 14) or now.hour in range(18, 22)

def _get_zone(distance_km: float, db: Session):
    zones = db.query(ZoneLivraison).filter(ZoneLivraison.actif == True).order_by(ZoneLivraison.distance_min_km).all()
    for z in zones:
        dmax = float(z.distance_max_km) if z.distance_max_km else 9999
        if float(z.distance_min_km) <= distance_km <= dmax:
            return z, zones
    return (zones[-1] if zones else None), zones

def detail_frais(distance_km: float, pointe: bool, db: Session, poids_kg: float = 0.0) -> dict:
    """
    Formule combinée :
        frais = frais_base + (distance_km × prix_par_km) + (poids_kg × prix_par_kg)
        si heure de pointe (Lun-Ven) : frais × (1 + majoration_pct/100)
    Cette formule intègre distance ET poids ensemble — les grandes distances
    ne deviennent pas exorbitantes car le tarif/km reste faible.
    """
    zone, _ = _get_zone(distance_km, db)
    if zone is None:
        return {"frais_total": 500, "frais_base": 500, "part_distance": 0,
                "part_poids": 0, "majoration": 0, "zone_nom": None,
                "delai_min": 30, "delai_max": 60, "est_pointe": pointe}

    frais_base  = int(getattr(zone, 'frais_base_fcfa', None) or zone.frais_fcfa or 200)
    prix_km     = float(getattr(zone, 'prix_par_km_fcfa', None) or 50)
    prix_kg     = float(getattr(zone, 'prix_par_kg_fcfa', None) or 0)
    maj_pct     = int(getattr(zone, 'majoration_pointe_pct', None) or 20)

    part_distance = round(distance_km * prix_km)
    part_poids    = round(poids_kg * prix_kg) if poids_kg > 0 else 0
    sous_total    = frais_base + part_distance + part_poids

    majoration = round(sous_total * maj_pct / 100) if pointe else 0
    frais_total = max(100, sous_total + majoration)  # minimum 100 FCFA

    return {
        "frais_total":     frais_total,
        "frais_base":      frais_base,
        "prix_par_km":     prix_km,
        "prix_par_kg":     prix_kg,
        "part_distance":   part_distance,
        "part_poids":      part_poids,
        "majoration":      majoration,
        "majoration_pct":  maj_pct if pointe else 0,
        "est_pointe":      pointe,
        "zone_nom":        zone.nom,
        "zone_couleur":    zone.couleur_hex,
        "delai_min":       zone.delai_min,
        "delai_max":       zone.delai_max,
        "distance_km":     round(distance_km, 2),
        "poids_kg":        poids_kg,
    }

def calculer_frais_livraison(distance_km: float, pointe: bool, db: Session, poids_kg: float = 0.0) -> int:
    return detail_frais(distance_km, pointe, db, poids_kg)["frais_total"]

def get_zone_pour_distance(distance_km: float, db: Session):
    z, _ = _get_zone(distance_km, db)
    return z

# ══════════════════════════════════════════════
# ZONES DE LIVRAISON (public)
# ══════════════════════════════════════════════
zones_router = APIRouter(prefix="/zones-livraison", tags=["Zones livraison"])

@zones_router.get("/")
def get_zones(db: Session = Depends(get_db)):
    return db.query(ZoneLivraison).filter(ZoneLivraison.actif == True).order_by(ZoneLivraison.ordre).all()

@zones_router.post("/calcul")
def calculer_frais(body: dict = None, db: Session = Depends(get_db)):
    """Calcule les frais de livraison (formule combinée distance + poids)."""
    body = body or {}
    lat        = body.get("latitude")
    lon        = body.get("longitude")
    adresse_id = body.get("adresse_id")
    poids_kg   = float(body.get("poids_kg") or 0)

    if adresse_id:
        adr = db.query(Adresse).filter(Adresse.id == adresse_id).first()
        if adr and adr.latitude and adr.longitude:
            lat = float(adr.latitude)
            lon = float(adr.longitude)

    if lat is None or lon is None:
        return {"frais_fcfa": 500, "frais_total": 500, "distance_km": None,
                "message": "Coordonnées manquantes — tarif forfaitaire",
                "frais_base": 500, "part_distance": 0, "part_poids": 0,
                "majoration": 0, "est_pointe": False, "poids_kg": poids_kg}

    dist   = haversine(MARCHE_LAT, MARCHE_LON, lat, lon)
    now    = datetime.utcnow()
    pointe = est_heure_pointe(now)
    d      = detail_frais(dist, pointe, db, poids_kg)
    # Alias frais_fcfa pour compatibilité frontend
    d["frais_fcfa"] = d["frais_total"]
    return d

# ══════════════════════════════════════════════
# SUGGESTIONS PRODUITS (client)
# ══════════════════════════════════════════════
suggest_router = APIRouter(prefix="/suggestions", tags=["Suggestions"])

@suggest_router.get("/")
def liste_suggestions_public(
    section: Optional[str] = None,
    statut: str = "approuvee",
    page: int = 1,
    db: Session = Depends(get_db)
):
    """Suggestions approuvées visibles de tous."""
    q = db.query(SuggestionProduit).filter(SuggestionProduit.statut == statut)
    if section:
        q = q.join(Section).filter(Section.code == section)
    total = q.count()
    items = q.order_by(SuggestionProduit.votes.desc(), SuggestionProduit.created_at.desc()).offset((page-1)*20).limit(20).all()
    return {"total": total, "items": [_fmt_suggestion(s) for s in items]}

@suggest_router.get("/mes-suggestions")
def mes_suggestions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = (db.query(SuggestionProduit)
             .filter(SuggestionProduit.client_id == user.id)
             .order_by(SuggestionProduit.created_at.desc()).all())
    return [_fmt_suggestion(s) for s in items]

@suggest_router.get("/en-attente")
def suggestions_en_attente(page: int = 1, db: Session = Depends(get_db)):
    """Suggestions visibles en attente (pour vote communautaire)."""
    q = (db.query(SuggestionProduit)
         .filter(SuggestionProduit.statut == "en_attente")
         .order_by(SuggestionProduit.votes.desc(), SuggestionProduit.created_at.desc()))
    total = q.count()
    items = q.offset((page-1)*20).limit(20).all()
    return {"total": total, "items": [_fmt_suggestion(s) for s in items]}

@suggest_router.post("/")
def creer_suggestion(body: dict = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    nom = (body.get("nom") or "").strip()
    if not nom or len(nom) < 2:
        raise HTTPException(400, "Nom du produit requis (min 2 caractères)")
    section_code = body.get("section_code")
    section = db.query(Section).filter(Section.code == section_code).first() if section_code else None
    if not section:
        section = db.query(Section).first()

    # Vérification doublon (même nom, même section, en attente ou approuvée)
    doublon = (db.query(SuggestionProduit)
               .filter(func.lower(SuggestionProduit.nom) == nom.lower(),
                       SuggestionProduit.section_id == section.id,
                       SuggestionProduit.statut.in_(["en_attente", "approuvee"])).first())
    if doublon:
        # Vote automatique sur le doublon
        vote_exist = db.query(VoteSuggestion).filter(
            VoteSuggestion.suggestion_id == doublon.id,
            VoteSuggestion.client_id == user.id).first()
        if not vote_exist:
            db.add(VoteSuggestion(suggestion_id=doublon.id, client_id=user.id))
            doublon.votes = (doublon.votes or 1) + 1
            db.commit()
        return {"message": "Ce produit a déjà été suggéré. Votre vote a été ajouté !", "suggestion_id": str(doublon.id), "is_doublon": True}

    s = SuggestionProduit(
        client_id=user.id,
        section_id=section.id,
        nom=nom,
        description=body.get("description"),
        prix_suggere_fcfa=body.get("prix_suggere_fcfa"),
        image_url=body.get("image_url"),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"message": "Suggestion soumise ! Merci de contribuer.", "suggestion_id": str(s.id), "is_doublon": False}

@suggest_router.post("/{sid}/voter")
def voter_suggestion(sid: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = db.query(SuggestionProduit).filter(SuggestionProduit.id == sid).first()
    if not s: raise HTTPException(404)
    exist = db.query(VoteSuggestion).filter(VoteSuggestion.suggestion_id == sid, VoteSuggestion.client_id == user.id).first()
    if exist: raise HTTPException(409, "Vous avez déjà voté pour cette suggestion")
    db.add(VoteSuggestion(suggestion_id=sid, client_id=user.id))
    s.votes = (s.votes or 1) + 1
    db.commit()
    return {"votes": s.votes}

def _fmt_suggestion(s: SuggestionProduit):
    return {
        "id": str(s.id),
        "nom": s.nom,
        "description": s.description,
        "prix_suggere_fcfa": s.prix_suggere_fcfa,
        "image_url": s.image_url,
        "statut": s.statut,
        "votes": s.votes,
        "note_admin": s.note_admin,
        "section_nom": s.section.nom if s.section else None,
        "section_code": s.section.code if s.section else None,
        "client_nom": s.client.nom_complet if s.client else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }

# ══════════════════════════════════════════════
# ADMIN — SUGGESTIONS
# ══════════════════════════════════════════════
admin_suggest_router = APIRouter(prefix="/admin/suggestions", tags=["Admin - Suggestions"])

@admin_suggest_router.get("/")
def admin_liste_suggestions(
    statut: str = "en_attente",
    page: int = 1,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin)
):
    q = db.query(SuggestionProduit)
    if statut != "toutes":
        q = q.filter(SuggestionProduit.statut == statut)
    total = q.count()
    items = q.order_by(SuggestionProduit.votes.desc(), SuggestionProduit.created_at.desc()).offset((page-1)*20).limit(20).all()
    return {"total": total, "items": [_fmt_suggestion(s) for s in items]}

@admin_suggest_router.put("/{sid}/approuver")
def admin_approuver(sid: UUID, body: dict = None, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    body = body or {}
    s = db.query(SuggestionProduit).filter(SuggestionProduit.id == sid).first()
    if not s: raise HTTPException(404)
    if s.statut != "en_attente": raise HTTPException(400, f"Suggestion déjà traitée ({s.statut})")

    section = db.query(Section).filter(Section.id == s.section_id).first()
    nom_final  = body.get("nom", s.nom).strip()
    prix_final = body.get("prix_fcfa", s.prix_suggere_fcfa) or 0
    desc_final = body.get("description", s.description)

    # Créer le slug
    slug_base = nom_final.lower().replace(" ", "-").replace("'", "").replace("(", "").replace(")", "")
    import re
    slug_base = re.sub(r"[^a-z0-9\-]", "", slug_base)
    slug = slug_base
    cpt = 1
    while db.query(Produit).filter(Produit.slug == slug).first():
        slug = f"{slug_base}-{cpt}"; cpt += 1

    prod = Produit(
        section_id=s.section_id,
        nom=nom_final,
        slug=slug,
        description=desc_final,
        prix_base_fcfa=prix_final,
        est_nouveau=True,
        est_actif=True,
    )
    db.add(prod)
    db.flush()

    s.statut = "approuvee"
    s.note_admin = body.get("note_admin", "")
    s.produit_cree_id = prod.id

    # +100 pts fidélité pour le client suggérant
    fid = db.query(FideliteCompte).filter(FideliteCompte.utilisateur_id == s.client_id).first()
    if fid:
        fid.points_actuels += 100
        fid.points_totaux  += 100
        db.add(FideliteTransaction(
            compte_id=fid.id, type="suggestion_approuvee", points=100,
            solde_apres=fid.points_actuels,
            description=f"Suggestion '{nom_final}' approuvée"
        ))

    db.add(Notification(
        destinataire_id=s.client_id, type="suggestion_approuvee",
        titre="🎉 Votre suggestion a été approuvée !",
        corps=f"'{nom_final}' est maintenant disponible dans le catalogue. +100 pts crédités !",
        donnees_json={"produit_id": str(prod.id)}
    ))
    db.commit()
    return {"message": "Suggestion approuvée et produit créé", "produit_id": str(prod.id)}

@admin_suggest_router.put("/{sid}/rejeter")
def admin_rejeter(sid: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    s = db.query(SuggestionProduit).filter(SuggestionProduit.id == sid).first()
    if not s: raise HTTPException(404)
    s.statut = "rejetee"
    s.note_admin = body.get("note_admin", "")
    db.add(Notification(
        destinataire_id=s.client_id, type="suggestion_rejetee",
        titre="Suggestion non retenue",
        corps=f"Votre suggestion '{s.nom}' n'a pas été retenue. {s.note_admin or ''}",
    ))
    db.commit()
    return {"message": "Suggestion rejetée"}

# ══════════════════════════════════════════════
# ADMIN — GESTION PRIX PRODUITS
# ══════════════════════════════════════════════
admin_prix_router = APIRouter(prefix="/admin/prix", tags=["Admin - Prix"])

@admin_prix_router.get("/")
def get_tous_prix(
    section: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    db: Session = Depends(get_db),
    _=Depends(get_current_admin)
):
    query = (db.query(Produit)
             .options(joinedload(Produit.section))
             .filter(Produit.deleted_at.is_(None)))
    if section:
        query = query.join(Section).filter(Section.code == section)
    if q:
        query = query.filter(func.lower(Produit.nom).contains(q.lower()))
    total = query.count()
    produits = query.order_by(Section.ordre, Produit.nom).offset((page-1)*50).limit(50).all()
    return {
        "total": total,
        "produits": [{
            "id": str(p.id), "nom": p.nom, "slug": p.slug,
            "prix_base_fcfa": p.prix_base_fcfa,
            "prix_max_fcfa": p.prix_max_fcfa,
            "est_actif": p.est_actif, "est_populaire": p.est_populaire,
            "section_nom": p.section.nom if p.section else None,
            "section_code": p.section.code if p.section else None,
            "image_url": p.image_url,
        } for p in produits]
    }

@admin_prix_router.put("/{produit_id}")
def update_prix(produit_id: UUID, body: dict = None, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    body = body or {}
    prod = db.query(Produit).filter(Produit.id == produit_id).first()
    if not prod: raise HTTPException(404)

    nouveau_prix = body.get("prix_base_fcfa")
    if nouveau_prix is not None and nouveau_prix != prod.prix_base_fcfa:
        ancien = prod.prix_base_fcfa or 0
        variation = round(((nouveau_prix - ancien) / ancien * 100), 2) if ancien else 0
        db.add(HistoriquePrix(
            produit_id=prod.id,
            admin_id=admin.id,
            ancien_prix=ancien,
            nouveau_prix=nouveau_prix,
            variation_pct=variation,
            raison=body.get("raison", "Mise à jour manuelle")
        ))
        prod.prix_base_fcfa = nouveau_prix

    for field in ("prix_max_fcfa", "est_actif", "est_populaire", "est_nouveau", "stock_dispo"):
        if field in body:
            setattr(prod, field, body[field])

    db.commit()
    return {"ok": True, "nouveau_prix": prod.prix_base_fcfa}

@admin_prix_router.post("/bulk-update")
def bulk_update_prix(body: dict = None, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    """Mise à jour en masse : +/- % ou valeur fixe sur toute une section."""
    body = body or {}
    section_code = body.get("section_code")
    mode         = body.get("mode", "pourcentage")  # pourcentage | fixe
    valeur       = body.get("valeur", 0)
    raison       = body.get("raison", "Mise à jour en masse")

    query = db.query(Produit).filter(Produit.deleted_at.is_(None))
    if section_code:
        query = query.join(Section).filter(Section.code == section_code)

    produits = query.all()
    mis_a_jour = 0
    for p in produits:
        ancien = p.prix_base_fcfa or 0
        if mode == "pourcentage":
            nouveau = max(0, int(ancien * (1 + valeur / 100)))
        else:
            nouveau = max(0, int(ancien + valeur))
        if nouveau != ancien:
            variation = round(((nouveau - ancien) / ancien * 100), 2) if ancien else 0
            db.add(HistoriquePrix(
                produit_id=p.id, admin_id=admin.id,
                ancien_prix=ancien, nouveau_prix=nouveau,
                variation_pct=variation, raison=raison
            ))
            p.prix_base_fcfa = nouveau
            mis_a_jour += 1

    db.commit()
    return {"ok": True, "mis_a_jour": mis_a_jour}

@admin_prix_router.get("/{produit_id}/historique")
def historique_prix(produit_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = (db.query(HistoriquePrix)
            .filter(HistoriquePrix.produit_id == produit_id)
            .order_by(HistoriquePrix.created_at.desc()).limit(20).all())
    return [{
        "id": str(r.id),
        "ancien_prix": r.ancien_prix,
        "nouveau_prix": r.nouveau_prix,
        "variation_pct": float(r.variation_pct or 0),
        "raison": r.raison,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]

# ══════════════════════════════════════════════
# ADMIN — ZONES DE LIVRAISON
# ══════════════════════════════════════════════
admin_zones_router = APIRouter(prefix="/admin/zones-livraison", tags=["Admin - Zones"])

@admin_zones_router.get("/")
def admin_get_zones(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(ZoneLivraison).order_by(ZoneLivraison.ordre).all()

@admin_zones_router.post("/")
def admin_creer_zone(body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    z = ZoneLivraison(
        nom=body["nom"],
        ville=body.get("ville", "Yaoundé"),
        distance_min_km=body.get("distance_min_km", 0),
        distance_max_km=body.get("distance_max_km"),
        frais_fcfa=body["frais_fcfa"],
        frais_pointe_fcfa=body.get("frais_pointe_fcfa"),
        delai_min=body.get("delai_min", 30),
        delai_max=body.get("delai_max", 60),
        couleur_hex=body.get("couleur_hex", "#6B7280"),
        ordre=body.get("ordre", 0),
        actif=body.get("actif", True),
    )
    db.add(z); db.commit(); db.refresh(z)
    return z

@admin_zones_router.put("/{zone_id}")
def admin_update_zone(zone_id: UUID, body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    body = body or {}
    z = db.query(ZoneLivraison).filter(ZoneLivraison.id == zone_id).first()
    if not z: raise HTTPException(404)
    for k, v in body.items():
        if hasattr(z, k): setattr(z, k, v)
    db.commit()
    return {"ok": True}

@admin_zones_router.delete("/{zone_id}")
def admin_delete_zone(zone_id: UUID, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    z = db.query(ZoneLivraison).filter(ZoneLivraison.id == zone_id).first()
    if not z: raise HTTPException(404)
    db.delete(z); db.commit()
    return {"ok": True}

@admin_zones_router.post("/simuler")
def simuler_frais(body: dict = None, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    """Simule les frais (formule combinée distance+poids) pour l'outil admin."""
    body = body or {}
    dist     = float(body.get("distance_km", 0))
    pointe   = bool(body.get("est_pointe", False))
    poids_kg = float(body.get("poids_kg") or 0)
    d = detail_frais(dist, pointe, db, poids_kg)
    d["frais_fcfa"] = d["frais_total"]  # alias
    return d
