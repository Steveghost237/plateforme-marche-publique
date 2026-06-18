#!/bin/bash
set -e

echo "=== Demarrage ComeBuy API ==="

# 1. Créer les tables + comptes de base (idempotent)
echo "[1/3] Initialisation tables et comptes..."
python create_tables_and_seed.py

# 2. Seeder le catalogue uniquement si la table produits est vide
echo "[2/3] Verification catalogue produits..."
PRODUCT_COUNT=$(python -c "
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath('.')))
from app.core.database import SessionLocal
from app.models.models import Produit
db = SessionLocal()
try:
    count = db.query(Produit).count()
    print(count)
finally:
    db.close()
" 2>/dev/null || echo "0")

if [ "$PRODUCT_COUNT" -eq "0" ]; then
  echo "   Catalogue vide - chargement initial des produits..."
  python seed_produits.py
  python update_boissons_images.py
  python update_menus_images_v2.py
  python update_fruits_epices_images.py
  python update_boulangerie_images.py
  python fix_menus_ingredients_and_images.py
  echo "   Catalogue charge avec succes."
else
  echo "   Catalogue deja present ($PRODUCT_COUNT produits) - seed ignore."
fi

# 3. Démarrer Uvicorn
echo "[3/3] Demarrage du serveur Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
