"""
migrate_extras.py — Crée les nouvelles tables et insère les zones de livraison par défaut
"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BACKEND_DIR)

from app.core.database import Base, engine, SessionLocal
from app.models.models import ZoneLivraison, SuggestionProduit, VoteSuggestion, HistoriquePrix

def run():
    print("⚙️  Création des nouvelles tables...")
    Base.metadata.create_all(bind=engine, tables=[
        SuggestionProduit.__table__,
        VoteSuggestion.__table__,
        HistoriquePrix.__table__,
    ])

    # Mise à jour ZoneLivraison (colonnes ajoutées — ALTER TABLE si nécessaire)
    from sqlalchemy import text
    with engine.connect() as conn:
        cols_to_add = [
            ("distance_min_km",       "NUMERIC(8,2) DEFAULT 0"),
            ("distance_max_km",       "NUMERIC(8,2)"),
            ("frais_base_fcfa",       "INTEGER DEFAULT 200"),
            ("prix_par_km_fcfa",      "NUMERIC(8,2) DEFAULT 50"),
            ("prix_par_kg_fcfa",      "NUMERIC(8,2) DEFAULT 100"),
            ("majoration_pointe_pct", "SMALLINT DEFAULT 20"),
            ("couleur_hex",           "VARCHAR(7) DEFAULT '#6B7280'"),
            ("ordre",                 "SMALLINT DEFAULT 0"),
            ("updated_at",            "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ]
        for col, typedef in cols_to_add:
            try:
                conn.execute(text(f"ALTER TABLE zones_livraison ADD COLUMN IF NOT EXISTS {col} {typedef}"))
                conn.commit()
                print(f"  ✓ Colonne ajoutée : zones_livraison.{col}")
            except Exception as e:
                conn.rollback()
                print(f"  ↩ {col} existe déjà ou erreur : {e}")

    print("✅  Tables créées avec succès\n")

    # Seed des zones de livraison par défaut
    db = SessionLocal()
    try:
        if db.query(ZoneLivraison).count() == 0:
            zones = [
                dict(nom="Centre-ville (0–3 km)",  distance_min_km=0,  distance_max_km=3,
                     frais_base_fcfa=300, prix_par_km_fcfa=50, prix_par_kg_fcfa=100,
                     majoration_pointe_pct=20, frais_fcfa=300, delai_min=20, delai_max=35,
                     couleur_hex="#22C55E", ordre=1),
                dict(nom="Proche banlieue (3–7 km)", distance_min_km=3, distance_max_km=7,
                     frais_base_fcfa=500, prix_par_km_fcfa=60, prix_par_kg_fcfa=100,
                     majoration_pointe_pct=20, frais_fcfa=500, delai_min=30, delai_max=50,
                     couleur_hex="#3B82F6", ordre=2),
                dict(nom="Banlieue moyenne (7–15 km)", distance_min_km=7, distance_max_km=15,
                     frais_base_fcfa=800, prix_par_km_fcfa=80, prix_par_kg_fcfa=120,
                     majoration_pointe_pct=20, frais_fcfa=800, delai_min=45, delai_max=75,
                     couleur_hex="#F59E0B", ordre=3),
                dict(nom="Grande périphérie (>15 km)", distance_min_km=15, distance_max_km=None,
                     frais_base_fcfa=1200, prix_par_km_fcfa=100, prix_par_kg_fcfa=150,
                     majoration_pointe_pct=20, frais_fcfa=1200, delai_min=60, delai_max=100,
                     couleur_hex="#EF4444", ordre=4),
            ]
            for z in zones:
                db.add(ZoneLivraison(**z))
                print(f"  Zone créée : {z['nom']}")
            db.commit()
            print("\n✅  Zones de livraison créées avec succès!")
        else:
            n = db.query(ZoneLivraison).count()
            print(f"  ℹ️  {n} zone(s) déjà présente(s) — aucune insertion")
    finally:
        db.close()

if __name__ == "__main__":
    run()
