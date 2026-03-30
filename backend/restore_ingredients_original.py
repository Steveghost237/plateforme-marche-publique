"""Script pour restaurer la configuration d'origine des ingrédients"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

db = SessionLocal()

try:
    # Récupérer tous les menus
    menus = db.query(Produit).filter(Produit.est_menu == True).all()
    
    print(f"📋 Restauration des ingrédients pour {len(menus)} menus...")
    
    for menu in menus:
        print(f"\n🍽️  Menu: {menu.nom}")
        
        for ing in menu.ingredients:
            # Définir les plages de quantités et prix d'origine
            qte_def = float(ing.quantite_defaut or 1)
            
            # Définir min/max en fonction de l'unité (comme avant)
            if ing.unite in ['g', 'ml']:
                qte_min = max(0, qte_def * 0.5)
                qte_max = qte_def * 2
            elif ing.unite in ['kg', 'l']:
                qte_min = max(0, qte_def * 0.5)
                qte_max = qte_def * 2
            elif ing.unite in ['pièce', 'piece', 'pcs']:
                qte_min = 0
                qte_max = max(10, qte_def * 3)
            else:  # pincée, c. à café, etc.
                qte_min = 0
                qte_max = max(5, qte_def * 2)
            
            # Définir les prix d'origine (comme avant)
            nom_lower = ing.nom.lower()
            
            if any(word in nom_lower for word in ['viande', 'poulet', 'poisson', 'crevettes', 'bœuf', 'porc']):
                prix_defaut = 500
                prix_min = 0
                prix_max = 1500
            elif any(word in nom_lower for word in ['plantain', 'waterfufu', 'tapioca']):
                prix_defaut = 200
                prix_min = 0
                prix_max = 500
            elif any(word in nom_lower for word in ['huile de palme', 'huile']):
                prix_defaut = 100
                prix_min = 0
                prix_max = 300
            else:
                prix_defaut = 0
                prix_min = 0
                prix_max = 200
            
            # Mettre à jour l'ingrédient
            ing.quantite_min = qte_min
            ing.quantite_max = qte_max
            ing.prix_min_fcfa = prix_min
            ing.prix_max_fcfa = prix_max
            ing.prix_defaut_fcfa = prix_defaut
            
            prix_info = f"{prix_min}-{prix_max} FCFA (défaut: {prix_defaut})" if prix_max > 0 else "Inclus"
            print(f"  ✅ {ing.nom}: {qte_min}-{qte_max} {ing.unite} | {prix_info}")
    
    db.commit()
    print("\n" + "="*50)
    print("✅ CONFIGURATION D'ORIGINE RESTAURÉE!")
    print("="*50)
    print("Les ingrédients sont revenus à leur configuration d'origine")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
