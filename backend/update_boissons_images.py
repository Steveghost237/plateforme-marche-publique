"""Mettre à jour les images des boissons avec les images locales et ajouter les nouveaux produits"""
import sys, os, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Section

db = SessionLocal()

# Section boissons
section = db.query(Section).filter(Section.code == "boissons").first()
if not section:
    print("Section boissons introuvable!"); sys.exit(1)
print(f"Section Boissons: {section.id}")

prods = db.query(Produit).filter(
    Produit.section_id == section.id,
    Produit.deleted_at.is_(None)
).all()
print(f"Produits existants: {len(prods)}")

def get_image_url(filename):
    encoded = urllib.parse.quote(filename)
    return f"/static/images/boissons/{encoded}"

# ── MAPPING images locales → produits existants ──
IMAGE_MAP = {
    "33 Export.jpeg":       "33 Export (Bière) 65cl",
    "Castel.jpeg":         "Castel Beer 65cl",
    "Fanta Orange.jpeg":   "Fanta Orange 50cl",
    "Guiness.jpeg":        "Guinness Cameroun 65cl",
    "Jus de Bissap.jpeg":  "Jus de Bissap (Hibiscus)",
    "Malta Guiness.jpeg":  "Malta Guinness 33cl",
    "Manyan.jpeg":         "Manyan 65cl",
    "Mutzig.jpeg":         "Mutzig 65cl",
    "Vimto.jpeg":          "Vimto 33cl",
    "Baoba Naturel.jpeg":  "Jus de Baobab (Bouye)",
}

# ── NOUVEAUX produits à créer ──
NEW_PRODUCTS = {
    "Bavaria.jpeg": {
        "nom": "Bavaria 33cl",
        "description": "Bière Bavaria sans alcool, idéale pour les amateurs de bière légère",
        "prix_base_fcfa": 800, "prix_max_fcfa": 1000, "est_populaire": True
    },
    "Booster Cola.jpeg": {
        "nom": "Booster Cola",
        "description": "Boisson énergisante Booster Cola camerounaise",
        "prix_base_fcfa": 500, "prix_max_fcfa": 700, "est_populaire": False
    },
    "Bullet.jpeg": {
        "nom": "Bullet Energy 25cl",
        "description": "Boisson énergisante Bullet, populaire au Cameroun",
        "prix_base_fcfa": 500, "prix_max_fcfa": 700, "est_populaire": True
    },
    "Chill.jpeg": {
        "nom": "Chill 33cl",
        "description": "Boisson gazeuse Chill, rafraîchissante et fruitée",
        "prix_base_fcfa": 500, "prix_max_fcfa": 600, "est_populaire": False
    },
    "Heineken.jpeg": {
        "nom": "Heineken 33cl",
        "description": "Bière Heineken premium, brassée selon la recette originale",
        "prix_base_fcfa": 1000, "prix_max_fcfa": 1500, "est_populaire": True
    },
    "Orangina.jpeg": {
        "nom": "Orangina 33cl",
        "description": "Orangina, la boisson pétillante à la pulpe d'orange naturelle",
        "prix_base_fcfa": 600, "prix_max_fcfa": 800, "est_populaire": False
    },
    "Reaktor.jpeg": {
        "nom": "Reaktor Energy 50cl",
        "description": "Boisson énergisante Reaktor, énergie intense",
        "prix_base_fcfa": 500, "prix_max_fcfa": 700, "est_populaire": False
    },
    "Smirnoff Ice.jpeg": {
        "nom": "Smirnoff Ice 27.5cl",
        "description": "Smirnoff Ice, boisson pétillante à la vodka avec un goût citronné",
        "prix_base_fcfa": 1000, "prix_max_fcfa": 1500, "est_populaire": True
    },
}

# ── 1. Mettre à jour les images des produits existants ──
print("\n=== MISE À JOUR DES IMAGES ===")
updated = 0
for img_file, prod_name in IMAGE_MAP.items():
    match = [p for p in prods if p.nom == prod_name]
    if match:
        p = match[0]
        p.image_url = get_image_url(img_file)
        print(f"  ✅ {prod_name} → {p.image_url}")
        updated += 1
    else:
        print(f"  ⚠️ Produit non trouvé: {prod_name}")

db.commit()
print(f"\n{updated} produits mis à jour")

# ── 2. Créer les nouveaux produits ──
print("\n=== CRÉATION NOUVEAUX PRODUITS ===")
created = 0
for img_file, info in NEW_PRODUCTS.items():
    existing = db.query(Produit).filter(Produit.nom == info["nom"], Produit.deleted_at.is_(None)).first()
    if existing:
        existing.image_url = get_image_url(img_file)
        print(f"  🔄 {info['nom']} déjà existant, image mise à jour")
        updated += 1
        continue

    slug = info["nom"].lower().replace(" ", "-").replace(".", "").replace("'", "")
    # Vérifier slug unique
    if db.query(Produit).filter(Produit.slug == slug).first():
        slug = slug + "-cm"

    p = Produit(
        nom=info["nom"],
        slug=slug,
        description=info["description"],
        prix_base_fcfa=info["prix_base_fcfa"],
        prix_max_fcfa=info["prix_max_fcfa"],
        est_populaire=info["est_populaire"],
        est_menu=False,
        est_nouveau=True,
        stock_dispo=True,
        est_actif=True,
        section_id=section.id,
        image_url=get_image_url(img_file),
    )
    db.add(p)
    print(f"  ✅ {info['nom']} créé")
    created += 1

db.commit()
print(f"\n{created} nouveaux produits créés")

# ── 3. Résumé final ──
print("\n=== RÉSUMÉ ===")
all_boissons = db.query(Produit).filter(
    Produit.section_id == section.id,
    Produit.deleted_at.is_(None),
    Produit.est_actif == True
).all()
local_count = sum(1 for p in all_boissons if (p.image_url or "").startswith("/static/"))
unsplash_count = sum(1 for p in all_boissons if "unsplash" in (p.image_url or ""))
print(f"Total produits boissons: {len(all_boissons)}")
print(f"  Avec images locales: {local_count}")
print(f"  Avec images Unsplash: {unsplash_count}")

db.close()
