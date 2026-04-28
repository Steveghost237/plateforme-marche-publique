"""
Script pour associer les images locales des fruits, légumes et épices aux produits.
Les images sont organisées dans backend/static/images/Fruits et Légumes/
  - Fruits/
  - Légumes/
  - épices et condiments/

Le script scanne ces dossiers et met à jour image_url de chaque produit
dont le slug correspond au nom du fichier (sans extension).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Produit

Base.metadata.create_all(bind=engine)
db = SessionLocal()

BASE_IMG = os.path.join(os.path.dirname(__file__), "static", "images")

# Les 3 dossiers et leur URL publique correspondante
SUBDIRS = [
    ("Fruits et Légumes/Fruits",              "/static/images/Fruits et Légumes/Fruits"),
    ("Fruits et Légumes/Légumes",             "/static/images/Fruits et Légumes/Légumes"),
    ("Fruits et Légumes/épices et condiments","/static/images/Fruits et Légumes/épices et condiments"),
]

# Construire un mapping slug -> URL publique
slug_to_url = {}
total_images = 0
for subdir, url_prefix in SUBDIRS:
    dir_path = os.path.join(BASE_IMG, subdir)
    if not os.path.isdir(dir_path):
        print(f"[WARN] Dossier introuvable: {dir_path}")
        continue
    for fname in os.listdir(dir_path):
        if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        total_images += 1
        # Extraire slug (nom sans extension)
        slug = os.path.splitext(fname)[0]
        # URL publique (encoder espaces/accents via FastAPI static qui gère l'UTF-8)
        slug_to_url[slug] = f"{url_prefix}/{fname}"

print(f"[FRUITS/EPICES] {total_images} images trouvées dans {len(SUBDIRS)} sous-dossiers")
print(f"[FRUITS/EPICES] {len(slug_to_url)} slugs mappés")

# Mettre à jour chaque produit correspondant
updated = 0
not_found = []
for slug, url in slug_to_url.items():
    produit = db.query(Produit).filter(Produit.slug == slug).first()
    if not produit:
        not_found.append(slug)
        continue
    if produit.image_url != url:
        produit.image_url = url
        updated += 1
        print(f"  ✅ {produit.nom} → {url}")

db.commit()

print(f"\n[FRUITS/EPICES] {updated} produits mis à jour")
if not_found:
    print(f"[FRUITS/EPICES] {len(not_found)} slugs sans produit correspondant:")
    for s in not_found[:20]:
        print(f"  - {s}")

db.close()
print("[FRUITS/EPICES] Terminé!")
