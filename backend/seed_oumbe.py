"""Seed : nouvelles sections (Épicerie, Entretien, Cosmétique, Ma Liste)
+ import des produits Oumbemarket depuis data/oumbe_products.json.

Usage :
    python seed_oumbe.py                      # utilise DATABASE_URL du .env
    DATABASE_URL=postgresql://... python seed_oumbe.py   # base de production
"""
import sys, os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Section, Produit
from app.services.seed_oumbe_service import run_import

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    recap = run_import(db)
    print(f"\nTerminé : {recap['produits_crees']} créés, "
          f"{recap['produits_mis_a_jour']} mis à jour, "
          f"{recap['ignores']} ignorés")
    for nom in recap["sections_creees"]:
        print(f"  Section créée : {nom}")
    for sec in db.query(Section).order_by(Section.ordre).all():
        n = db.query(Produit).filter(
            Produit.section_id == sec.id, Produit.est_actif == True).count()
        print(f"  {sec.nom:28s} : {n} produits")
except Exception as e:
    db.rollback()
    print(f"ERREUR: {e}")
    raise
finally:
    db.close()
