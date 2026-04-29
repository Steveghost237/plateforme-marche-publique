"""
Script qui:
1. Ajoute des ingrédients génériques à TOUS les menus (est_menu=True) qui n'en ont pas,
   afin que le client puisse personnaliser la composition (web + mobile).
2. Désactive (est_actif=False) les menus dont l'image n'est pas locale (/static/...).
"""
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Produit, Ingredient

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── INGRÉDIENTS GÉNÉRIQUES POUR LES MENUS CAMEROUNAIS ─────────
# Set de base appliqué à tous les menus sans ingrédients spécifiques.
GENERIC_INGREDIENTS = [
    dict(nom="Viande / Poisson",   est_obligatoire=True,  type_saisie="curseur", unite="g",
         quantite_defaut=300, quantite_min=100, quantite_max=800, prix_min_fcfa=500, prix_max_fcfa=4000, prix_defaut_fcfa=1500),
    dict(nom="Légumes / Feuilles", est_obligatoire=True,  type_saisie="curseur", unite="g",
         quantite_defaut=200, quantite_min=100, quantite_max=500, prix_min_fcfa=200, prix_max_fcfa=1500, prix_defaut_fcfa=500),
    dict(nom="Huile",              est_obligatoire=True,  type_saisie="curseur", unite="cl",
         quantite_defaut=8,   quantite_min=4,   quantite_max=20,  prix_min_fcfa=100, prix_max_fcfa=500,  prix_defaut_fcfa=200),
    dict(nom="Oignons",            est_obligatoire=True,  type_saisie="curseur", unite="g",
         quantite_defaut=100, quantite_min=50,  quantite_max=300, prix_min_fcfa=50,  prix_max_fcfa=300,  prix_defaut_fcfa=100),
    dict(nom="Épices / Bouillon",  est_obligatoire=False, type_saisie="curseur", unite="g",
         quantite_defaut=20,  quantite_min=0,   quantite_max=80,  prix_min_fcfa=0,   prix_max_fcfa=400,  prix_defaut_fcfa=100),
    dict(nom="Piment",             est_obligatoire=False, type_saisie="curseur", unite="g",
         quantite_defaut=10,  quantite_min=0,   quantite_max=50,  prix_min_fcfa=0,   prix_max_fcfa=200,  prix_defaut_fcfa=50),
]

# ── 1) AJOUT DES INGRÉDIENTS GÉNÉRIQUES ─────────────────────────
menus = db.query(Produit).filter(Produit.est_menu == True).all()
print(f"[INGRS] {len(menus)} menus trouvés au total")

added = 0
already_ok = 0
for menu in menus:
    existing = db.query(Ingredient).filter(Ingredient.produit_id == menu.id).count()
    if existing > 0:
        already_ok += 1
        continue
    # Ajouter les ingrédients génériques
    for j, ing in enumerate(GENERIC_INGREDIENTS):
        db.add(Ingredient(produit_id=menu.id, ordre=j, **ing))
    added += 1
    print(f"  ✅ Ingrédients ajoutés à: {menu.nom}")

db.commit()
print(f"\n[INGRS] {added} menus enrichis avec ingrédients génériques")
print(f"[INGRS] {already_ok} menus avaient déjà leurs ingrédients spécifiques (conservés)")

# ── 2) DÉSACTIVATION DES MENUS SANS IMAGE LOCALE ────────────────
print(f"\n[IMAGES] Vérification des images locales pour les menus...")
disabled = 0
kept_active = 0
for menu in menus:
    has_local = menu.image_url and menu.image_url.startswith('/static/')
    if not has_local:
        if menu.est_actif:
            menu.est_actif = False
            menu.stock_dispo = False
            disabled += 1
            print(f"  ❌ Désactivé (pas d'image locale): {menu.nom} → {menu.image_url[:60] if menu.image_url else 'None'}")
    else:
        # Réactiver si jamais désactivé par erreur
        if not menu.est_actif:
            menu.est_actif = True
            menu.stock_dispo = True
            print(f"  ♻️ Réactivé: {menu.nom}")
        kept_active += 1

db.commit()

print(f"\n[IMAGES] {kept_active} menus actifs avec image locale")
print(f"[IMAGES] {disabled} menus désactivés (pas d'image locale)")

db.close()
print("\n✅ Terminé!")
