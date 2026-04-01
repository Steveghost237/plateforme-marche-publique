"""Script pour corriger les quantités par défaut invalides."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

db = SessionLocal()

try:
    print("🔧 Correction des quantités par défaut invalides...\n")
    print("="*70)
    
    # Récupérer tous les ingrédients
    ingredients = db.query(Ingredient).all()
    
    fixed_count = 0
    
    for ing in ingredients:
        qte_def = float(ing.quantite_defaut or 0)
        qte_min = float(ing.quantite_min or 0)
        qte_max = float(ing.quantite_max or 100)
        
        # Vérifier si quantite_defaut est invalide
        if qte_def < qte_min or qte_def > qte_max:
            # Calculer une valeur par défaut raisonnable (milieu de la plage)
            new_qte_def = (qte_min + qte_max) / 2
            
            produit = db.query(Produit).filter(Produit.id == ing.produit_id).first()
            print(f"🔧 {produit.nom if produit else 'Menu inconnu'}")
            print(f"   Ingrédient: {ing.nom}")
            print(f"   Ancien: {qte_def} (min={qte_min}, max={qte_max})")
            print(f"   Nouveau: {new_qte_def}")
            
            ing.quantite_defaut = new_qte_def
            fixed_count += 1
    
    db.commit()
    
    print("\n" + "="*70)
    print(f"✅ CORRECTION TERMINÉE!")
    print(f"="*70)
    print(f"📊 {fixed_count} ingrédients corrigés")
    print(f"\n🎉 Toutes les quantités sont maintenant valides!")
    
except Exception as e:
    db.rollback()
    print(f"\n❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
