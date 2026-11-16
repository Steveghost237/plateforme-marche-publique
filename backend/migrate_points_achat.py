"""
migrate_points_achat.py — Points d'achat (marchés) + rôle agent commercial.
- Crée la table points_achat
- Ajoute les colonnes point_achat_id sur utilisateurs et commandes
- Seed les marchés par défaut et un agent de test
Idempotent — sans risque à rejouer.
"""
import uuid
from datetime import datetime
from sqlalchemy import text, inspect
from app.core.database import engine, Base, SessionLocal
from app.models.models import PointAchat, Utilisateur, Commande
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()
insp = inspect(engine)

# ── Colonnes point_achat_id (ALTER TABLE si absentes — SQLite/PG compatible) ──
def add_col_if_missing(table: str, column: str, coltype: str):
    cols = [c["name"] for c in insp.get_columns(table)]
    if column not in cols:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))
        print(f"[MIGRATE] colonne {table}.{column} ajoutee")

uuid_type = "CHAR(36)" if engine.dialect.name == "sqlite" else "UUID"
add_col_if_missing("utilisateurs", "point_achat_id", uuid_type)
add_col_if_missing("commandes", "point_achat_id", uuid_type)
# Préparation par agent commercial
add_col_if_missing("commandes", "prete_at", "TIMESTAMP")
add_col_if_missing("commandes", "preparee_par_id", uuid_type)
# Coordonnées GPS des marchés (distance livreur ↔ point d'achat)
add_col_if_missing("points_achat", "latitude", "NUMERIC(9,6)")
add_col_if_missing("points_achat", "longitude", "NUMERIC(9,6)")

# ── Seed points d'achat ──
# Coordonnées vérifiées via OpenStreetMap/Nominatim
MARCHES = [
    {"nom": "Marché Central",  "ville": "Yaoundé", "quartier": "Centre-ville", "lat": 3.866318, "lon": 11.517807},
    {"nom": "Marché Mokolo",   "ville": "Yaoundé", "quartier": "Mokolo",       "lat": 3.874691, "lon": 11.500193},
    {"nom": "Marché Deïdo",    "ville": "Douala",  "quartier": "Deïdo",        "lat": 4.060145, "lon": 9.718189},
    {"nom": "Marché Mboppi",   "ville": "Douala",  "quartier": "Mboppi",       "lat": 4.046799, "lon": 9.715043},
]
for m in MARCHES:
    ex = db.query(PointAchat).filter(PointAchat.nom == m["nom"]).first()
    if not ex:
        db.add(PointAchat(id=uuid.uuid4(), nom=m["nom"], ville=m["ville"], quartier=m["quartier"],
                          latitude=m["lat"], longitude=m["lon"], actif=True))
        print(f"[SEED] point d'achat: {m['nom']} ({m['ville']})")
    elif ex.latitude is None:
        ex.latitude = m["lat"]; ex.longitude = m["lon"]
db.commit()

# ── Backfill : rattacher les commandes existantes au marché de leur ville ──
default_pa = db.query(PointAchat).order_by(PointAchat.created_at).first()
if default_pa:
    cmds = db.query(Commande).filter(Commande.point_achat_id.is_(None)).all()
    from app.models.models import Adresse
    fixed = 0
    for c in cmds:
        pa = default_pa
        if c.adresse and c.adresse.ville:
            found = db.query(PointAchat).filter(PointAchat.ville.ilike(f"%{c.adresse.ville}%")).first()
            if found: pa = found
        c.point_achat_id = pa.id
        fixed += 1
    db.commit()
    if fixed: print(f"[MIGRATE] {fixed} commandes rattachees a un point d'achat")

# ── Agent de test ──
AGENT_TEL = "+237633333333"
agent = db.query(Utilisateur).filter(Utilisateur.telephone == AGENT_TEL).first()
if not agent:
    pa = db.query(PointAchat).filter(PointAchat.nom == "Marché Central").first() or default_pa
    db.add(Utilisateur(id=uuid.uuid4(), telephone=AGENT_TEL, nom_complet="Agent Central",
                       email="agent@marche.cm", role="agent", statut="actif",
                       mot_de_passe_hash=hash_password("Agent@2026!"),
                       point_achat_id=pa.id if pa else None,
                       created_at=datetime.utcnow()))
    db.commit()
    print(f"[SEED] agent test: {AGENT_TEL} / Agent@2026! (Marche Central)")
else:
    print("[SEED] agent test existe deja")

db.close()
print("[DONE] Migration points d'achat terminee")
