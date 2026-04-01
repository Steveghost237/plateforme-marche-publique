"""Script pour mettre à jour TOUS les ingrédients détaillés des 71 menus camerounais."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient
from ingredients_data import INGREDIENTS_COMPLETS

db = SessionLocal()

try:
    count_updated = 0
    count_skipped = 0
    total_ingredients = 0
    
    print("🔄 Mise à jour des ingrédients pour les 71 menus camerounais...\n")
    
    for slug, ingredients_list in INGREDIENTS_COMPLETS.items():
        produit = db.query(Produit).filter(Produit.slug == slug).first()
        if produit:
            # Supprimer les anciens ingrédients
            old_count = db.query(Ingredient).filter(Ingredient.produit_id == produit.id).count()
            db.query(Ingredient).filter(Ingredient.produit_id == produit.id).delete()
            
            # Ajouter les nouveaux ingrédients détaillés
            for ordre, ing_data in enumerate(ingredients_list):
                ingredient = Ingredient(
                    produit_id=produit.id,
                    ordre=ordre,
                    **ing_data
                )
                db.add(ingredient)
            
            count_updated += 1
            total_ingredients += len(ingredients_list)
            print(f"✅ {produit.nom}")
            print(f"   Anciens: {old_count} → Nouveaux: {len(ingredients_list)} ingrédients")
        else:
            count_skipped += 1
            print(f"❌ Menu non trouvé: {slug}")
    
    db.commit()
    
    print(f"\n{'='*60}")
    print(f"✅ MISE À JOUR TERMINÉE AVEC SUCCÈS!")
    print(f"{'='*60}")
    print(f"📊 Statistiques:")
    print(f"   • Menus mis à jour: {count_updated}/71")
    print(f"   • Menus non trouvés: {count_skipped}")
    print(f"   • Total ingrédients ajoutés: {total_ingredients}")
    print(f"   • Moyenne par menu: {total_ingredients/count_updated:.1f} ingrédients")
    print(f"\n🎉 Tous les menus ont maintenant leurs ingrédients détaillés!")
    print(f"   La personnalisation est maintenant disponible pour tous les plats.")
    
except Exception as e:
    db.rollback()
    print(f"\n❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
