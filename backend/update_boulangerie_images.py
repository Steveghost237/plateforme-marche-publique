"""
Script pour associer les images locales de boulangerie aux produits.
Scanne récursivement backend/static/images/boulangerie/ et associe chaque image
au produit dont le slug correspond au nom du fichier (sans extension).
"""
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Produit

Base.metadata.create_all(bind=engine)
db = SessionLocal()

BASE_IMG = os.path.join(os.path.dirname(__file__), "static", "images", "Boulangerie")

if not os.path.isdir(BASE_IMG):
    print(f"[BOULANGERIE] Dossier introuvable: {BASE_IMG}")
    sys.exit(1)

# Scan récursif: pour chaque image, on enregistre slug -> chemin relatif
slug_to_url = {}
total_images = 0
for root, dirs, files in os.walk(BASE_IMG):
    for fname in files:
        if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            continue
        total_images += 1
        slug = os.path.splitext(fname)[0]
        # URL publique relative à /static/
        rel = os.path.relpath(os.path.join(root, fname),
                              os.path.join(os.path.dirname(__file__), "static")).replace("\\", "/")
        slug_to_url[slug] = f"/static/{rel}"

print(f"[BOULANGERIE] {total_images} images trouvées")

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

print(f"\n[BOULANGERIE] {updated} produits mis à jour")
if not_found:
    print(f"[BOULANGERIE] {len(not_found)} fichiers sans produit correspondant: {not_found}")

db.close()
print("[BOULANGERIE] Terminé!")
