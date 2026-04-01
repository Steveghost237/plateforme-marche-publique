"""Script pour ajouter les ingrédients manquants aux 6 menus."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

def ing(nom, oblig=True, unite="g", qte_def=100, qte_min=0, qte_max=200, prix_min=0, prix_max=500, prix_def=200):
    return {
        "nom": nom,
        "est_obligatoire": oblig,
        "type_saisie": "curseur",
        "unite": unite,
        "quantite_defaut": qte_def,
        "quantite_min": qte_min,
        "quantite_max": qte_max,
        "prix_min_fcfa": prix_min,
        "prix_max_fcfa": prix_max,
        "prix_defaut_fcfa": prix_def
    }

# Ingrédients pour les 6 menus manquants
INGREDIENTS_MANQUANTS = {
    "koki-gateau-haricots": [
        ing("Haricots cornille (niébé)", True, "g", 300, 200, 500, 200, 600, 400),
        ing("Huile de palme rouge", True, "cl", 10, 5, 20, 100, 300, 200),
        ing("Sel", True, "g", 5, 2, 10, 0, 50, 25),
        ing("Piment rouge", False, "pcs", 1, 0, 3, 0, 100, 50),
        ing("Oignon", False, "pcs", 1, 0, 2, 50, 150, 100),
        ing("Feuilles de bananier", True, "pcs", 2, 1, 4, 50, 200, 100)
    ],
    
    "beignets-haricots-accra": [
        ing("Haricots blancs", True, "g", 250, 150, 400, 200, 500, 350),
        ing("Oignon", True, "pcs", 1, 0, 3, 50, 150, 100),
        ing("Piment", False, "pcs", 1, 0, 3, 0, 100, 50),
        ing("Sel", True, "g", 5, 2, 10, 0, 50, 25),
        ing("Huile de friture", True, "cl", 20, 10, 30, 200, 500, 300),
        ing("Ail", False, "g", 5, 0, 15, 0, 100, 50),
        ing("Gingembre", False, "g", 5, 0, 15, 0, 100, 50)
    ],
    
    "sauce-gombo": [
        ing("Gombo frais", True, "g", 300, 200, 500, 200, 600, 400),
        ing("Viande de bœuf", True, "g", 250, 150, 400, 500, 1500, 1000),
        ing("Poisson fumé", False, "g", 100, 0, 200, 200, 600, 400),
        ing("Huile de palme", True, "cl", 10, 5, 20, 100, 300, 200),
        ing("Oignon", True, "pcs", 1, 0, 3, 50, 150, 100),
        ing("Tomate", True, "pcs", 2, 1, 4, 100, 300, 200),
        ing("Piment", False, "pcs", 1, 0, 3, 0, 100, 50),
        ing("Cubes Maggi", True, "pcs", 2, 1, 4, 50, 150, 100),
        ing("Sel", True, "g", 5, 2, 10, 0, 50, 25)
    ],
    
    "poisson-braise": [
        ing("Poisson frais (bar/maquereau/dorade)", True, "g", 400, 300, 800, 800, 2500, 1500),
        ing("Oignon", True, "pcs", 2, 1, 4, 50, 200, 150),
        ing("Tomate", True, "pcs", 2, 1, 4, 100, 300, 200),
        ing("Poivron", False, "pcs", 1, 0, 2, 50, 150, 100),
        ing("Ail", True, "g", 10, 5, 20, 50, 150, 100),
        ing("Gingembre", True, "g", 10, 5, 20, 50, 150, 100),
        ing("Piment", False, "pcs", 2, 0, 5, 0, 150, 75),
        ing("Huile végétale", True, "cl", 5, 3, 10, 100, 250, 150),
        ing("Citron", False, "pcs", 1, 0, 2, 50, 150, 100),
        ing("Persil", False, "g", 10, 0, 30, 0, 100, 50),
        ing("Sel", True, "g", 5, 2, 10, 0, 50, 25),
        ing("Poivre noir", True, "g", 3, 1, 8, 0, 100, 50)
    ],
    
    "achu-soup": [
        ing("Taro (macabo)", True, "g", 500, 300, 800, 300, 800, 500),
        ing("Viande de bœuf", True, "g", 250, 150, 400, 500, 1500, 1000),
        ing("Tripes", False, "g", 150, 0, 300, 300, 800, 500),
        ing("Huile de palme jaune", True, "cl", 15, 10, 25, 150, 400, 250),
        ing("Limestone (kanwa)", True, "g", 5, 3, 10, 50, 150, 100),
        ing("Oignon", True, "pcs", 1, 0, 3, 50, 150, 100),
        ing("Piment", False, "pcs", 2, 0, 5, 0, 150, 75),
        ing("Cubes Maggi", True, "pcs", 2, 1, 4, 50, 150, 100),
        ing("Sel", True, "g", 5, 2, 10, 0, 50, 25)
    ],
    
    "nkui": [
        ing("Légumes nkui (huckleberry)", True, "g", 300, 200, 500, 200, 600, 400),
        ing("Viande de bœuf", True, "g", 250, 150, 400, 500, 1500, 1000),
        ing("Huile de palme rouge", True, "cl", 10, 5, 20, 100, 300, 200),
        ing("Limestone (kanwa)", True, "g", 5, 3, 10, 50, 150, 100),
        ing("Oignon", True, "pcs", 1, 0, 3, 50, 150, 100),
        ing("Piment", False, "pcs", 1, 0, 3, 0, 100, 50),
        ing("Cubes Maggi", True, "pcs", 2, 1, 4, 50, 150, 100),
        ing("Sel", True, "g", 5, 2, 10, 0, 50, 25)
    ]
}

db = SessionLocal()

try:
    count_updated = 0
    total_ingredients = 0
    
    print("🔄 Ajout des ingrédients manquants...\n")
    print("="*70)
    
    for slug, ingredients_list in INGREDIENTS_MANQUANTS.items():
        produit = db.query(Produit).filter(Produit.slug == slug).first()
        if produit:
            # Vérifier s'il n'a vraiment pas d'ingrédients
            existing_count = db.query(Ingredient).filter(Ingredient.produit_id == produit.id).count()
            
            if existing_count == 0:
                # Ajouter les nouveaux ingrédients
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
                print(f"   Ajouté: {len(ingredients_list)} ingrédients")
            else:
                print(f"⏭️  {produit.nom} - déjà {existing_count} ingrédients (ignoré)")
        else:
            print(f"❌ Menu non trouvé: {slug}")
    
    db.commit()
    
    print("\n" + "="*70)
    print(f"✅ AJOUT TERMINÉ AVEC SUCCÈS!")
    print(f"="*70)
    print(f"📊 Statistiques:")
    print(f"   • Menus mis à jour: {count_updated}/6")
    print(f"   • Total ingrédients ajoutés: {total_ingredients}")
    if count_updated > 0:
        print(f"   • Moyenne par menu: {total_ingredients/count_updated:.1f} ingrédients")
    print(f"\n🎉 Tous les menus ont maintenant des ingrédients!")
    
except Exception as e:
    db.rollback()
    print(f"\n❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
