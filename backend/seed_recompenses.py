"""Seed des récompenses du programme fidélité (idempotent : n'insère que si table vide)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import FideliteRecompense

RECOMPENSES = [
    dict(nom="−15% sur votre commande", description="Valable 30 jours · Niveau OR",
         cout_points=750,  niveau_requis="or",     type_avantage="reduction_pct", valeur_avantage=15, icone="🎁"),
    dict(nom="Livraison offerte",       description="Sur prochaine commande",
         cout_points=500,  niveau_requis="bronze", type_avantage="livraison",     valeur_avantage=None, icone="🚚"),
    dict(nom="Produit offert",          description="Fruit au choix ≤ 500 F",
         cout_points=1000, niveau_requis="bronze", type_avantage="produit",       valeur_avantage=500, icone="🛒"),
]

db = SessionLocal()
try:
    if db.query(FideliteRecompense).count() == 0:
        for r in RECOMPENSES:
            db.add(FideliteRecompense(**r))
        db.commit()
        print(f"{len(RECOMPENSES)} récompenses insérées")
    else:
        print("Récompenses déjà présentes — rien à faire")
finally:
    db.close()
