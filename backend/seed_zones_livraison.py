"""seed_zones_livraison.py — Zones de livraison par défaut (Yaoundé/Douala).
Formule : frais = base + (km × F/km) + (kg × F/kg), majoration % en heure de
pointe 7j/7 (11h–14h, 18h–22h), plancher 1000 FCFA appliqué au calcul.
Idempotent : une zone existante (même nom) n'est pas recréée."""
from app.core.database import SessionLocal
from app.models.models import ZoneLivraison

ZONES = [
    dict(nom="Centre-ville & quartiers proches", distance_min_km=0,  distance_max_km=3,
         frais_base_fcfa=200, prix_par_km_fcfa=50, prix_par_kg_fcfa=80,
         majoration_pointe_pct=20, delai_min=20, delai_max=45,
         couleur_hex="#22C55E", ordre=1),
    dict(nom="Proche banlieue",                  distance_min_km=3,  distance_max_km=7,
         frais_base_fcfa=300, prix_par_km_fcfa=60, prix_par_kg_fcfa=100,
         majoration_pointe_pct=20, delai_min=30, delai_max=60,
         couleur_hex="#3B82F6", ordre=2),
    dict(nom="Banlieue",                         distance_min_km=7,  distance_max_km=15,
         frais_base_fcfa=400, prix_par_km_fcfa=70, prix_par_kg_fcfa=120,
         majoration_pointe_pct=20, delai_min=45, delai_max=90,
         couleur_hex="#F59E0B", ordre=3),
    dict(nom="Grande périphérie",                distance_min_km=15, distance_max_km=None,
         frais_base_fcfa=500, prix_par_km_fcfa=80, prix_par_kg_fcfa=150,
         majoration_pointe_pct=25, delai_min=60, delai_max=120,
         couleur_hex="#EF4444", ordre=4),
]

db = SessionLocal()
existants = {z.nom for z in db.query(ZoneLivraison).all()}
creees = 0
for z in ZONES:
    if z["nom"] not in existants:
        db.add(ZoneLivraison(ville="Yaoundé", frais_fcfa=z["frais_base_fcfa"], **z))
        creees += 1
db.commit()
print(f"{creees} zone(s) créée(s), {len(existants) + creees} au total")
