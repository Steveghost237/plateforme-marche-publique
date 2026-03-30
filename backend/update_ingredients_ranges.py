"""Script pour mettre à jour les plages de quantités et prix des ingrédients des menus"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

db = SessionLocal()

try:
    # Récupérer tous les menus
    menus = db.query(Produit).filter(Produit.est_menu == True).all()
    
    print(f"📋 Mise à jour des ingrédients pour {len(menus)} menus...")
    
    for menu in menus:
        print(f"\n🍽️  Menu: {menu.nom}")
        
        for ing in menu.ingredients:
            # Définir les plages de quantités et prix
            qte_def = float(ing.quantite_defaut or 1)
            
            # Fixer qte_max à 25 pour tous les ingrédients
            qte_min = 0
            qte_max = 25
            
            # Définir les prix en fonction du type d'ingrédient
            # Prix varient entre 50 et 25000 FCFA selon le type
            
            nom_lower = ing.nom.lower()
            
            # Ingrédients premium avec prix élevés
            if any(word in nom_lower for word in ['viande', 'poulet', 'poisson', 'crevettes', 'bœuf', 'porc', 'peau']):
                prix_min = 50
                prix_max = 25000
                prix_defaut = 5000  # Prix moyen pour viandes/poissons
            elif any(word in nom_lower for word in ['plantain', 'waterfufu', 'tapioca']):
                prix_min = 50
                prix_max = 5000
                prix_defaut = 1000
            elif any(word in nom_lower for word in ['huile de palme', 'huile']):
                prix_min = 50
                prix_max = 3000
                prix_defaut = 500
            elif any(word in nom_lower for word in ['écrevisses', 'mandjanga', 'crevettes séchées']):
                prix_min = 50
                prix_max = 10000
                prix_defaut = 2000
            else:
                # Autres ingrédients (légumes, épices)
                prix_min = 50
                prix_max = 2000
                prix_defaut = 200
            
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
    print("✅ INGRÉDIENTS MIS À JOUR AVEC SUCCÈS!")
    print("="*50)
    print("Les curseurs de quantité fonctionnent maintenant correctement")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
