"""Seed des temoignages clients affiches sur la page d'accueil.
Idempotent : n'insere que si la table temoignages est vide.
Les temoignages reels sont ensuite ajoutes automatiquement via les sondages
post-livraison (consentement client, note >= 4)."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Temoignage

TEMOIGNAGES_INITIAUX = [
    dict(nom="Marie-Claire Fouda", role="Cliente depuis 8 mois", ville="Yaoundé, Bastos",
         note=5, avatar_url="/images/accueil/temoignage-marie-claire.jpg", ordre=1,
         texte="Je commande chaque semaine mon ERU. Les ingrédients arrivent toujours frais, exactement comme je les aurais choisis moi-même au marché. Le service est impeccable."),
    dict(nom="Patrick Ngoumou", role="Client depuis 5 mois", ville="Yaoundé, Centre-ville",
         note=5, avatar_url="/images/accueil/temoignage-patrick.jpg", ordre=2,
         texte="En tant que professionnel chargé, cette plateforme m'a changé la vie. Je commande le matin, je reçois avant midi. La qualité des produits est vraiment au rendez-vous."),
    dict(nom="Sylvie Mboumba", role="Cliente VIP", ville="Douala, Akwa",
         note=5, avatar_url="/images/accueil/temoignage-sylvie.jpg", ordre=3,
         texte="Le programme de fidélité est excellent. En quelques mois j'ai atteint le niveau Or et je bénéficie de réductions à chaque commande. Je recommande à tous."),
]

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    existing = db.query(Temoignage).count()
    if existing:
        print(f"{existing} témoignage(s) déjà en base - seed ignoré.")
    else:
        for t in TEMOIGNAGES_INITIAUX:
            db.add(Temoignage(**t))
        db.commit()
        print(f"{len(TEMOIGNAGES_INITIAUX)} témoignages insérés.")
finally:
    db.close()
