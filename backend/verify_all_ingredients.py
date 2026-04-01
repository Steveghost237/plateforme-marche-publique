"""Script de vérification finale : tous les menus ont des ingrédients avec des données valides."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

db = SessionLocal()

try:
    print("🔍 VÉRIFICATION COMPLÈTE DES INGRÉDIENTS\n")
    print("="*70)
    
    # Récupérer tous les menus
    menus = db.query(Produit).filter(Produit.est_menu == True).order_by(Produit.nom).all()
    
    total_menus = len(menus)
    menus_ok = 0
    menus_sans_ingredients = 0
    menus_avec_problemes = []
    
    for menu in menus:
        ingredients = db.query(Ingredient).filter(Ingredient.produit_id == menu.id).all()
        
        if len(ingredients) == 0:
            menus_sans_ingredients += 1
            print(f"❌ {menu.nom} - AUCUN INGRÉDIENT")
        else:
            # Vérifier la cohérence des données
            problemes = []
            for ing in ingredients:
                if ing.quantite_max is None or ing.quantite_max <= 0:
                    problemes.append(f"  • {ing.nom}: quantite_max invalide ({ing.quantite_max})")
                if ing.quantite_min is None:
                    problemes.append(f"  • {ing.nom}: quantite_min manquant")
                if ing.quantite_defaut is None or ing.quantite_defaut < ing.quantite_min or ing.quantite_defaut > ing.quantite_max:
                    problemes.append(f"  • {ing.nom}: quantite_defaut invalide ({ing.quantite_defaut})")
                if ing.prix_max_fcfa is None or ing.prix_max_fcfa < 0:
                    problemes.append(f"  • {ing.nom}: prix_max_fcfa invalide ({ing.prix_max_fcfa})")
                if ing.prix_min_fcfa is None or ing.prix_min_fcfa < 0:
                    problemes.append(f"  • {ing.nom}: prix_min_fcfa invalide ({ing.prix_min_fcfa})")
            
            if problemes:
                menus_avec_problemes.append((menu, problemes))
                print(f"⚠️  {menu.nom} - {len(ingredients)} ingrédients (avec problèmes)")
                for p in problemes:
                    print(p)
            else:
                menus_ok += 1
                print(f"✅ {menu.nom} - {len(ingredients)} ingrédients")
    
    print("\n" + "="*70)
    print("📊 RÉSUMÉ DE LA VÉRIFICATION")
    print("="*70)
    print(f"Total de menus: {total_menus}")
    print(f"✅ Menus OK (avec ingrédients valides): {menus_ok}")
    print(f"⚠️  Menus avec problèmes de données: {len(menus_avec_problemes)}")
    print(f"❌ Menus sans ingrédients: {menus_sans_ingredients}")
    
    if menus_sans_ingredients == 0 and len(menus_avec_problemes) == 0:
        print("\n🎉 PARFAIT ! Tous les menus ont des ingrédients valides !")
        print("   La personnalisation devrait fonctionner correctement.")
    else:
        print("\n⚠️  Des corrections sont nécessaires.")
    
    print("\n" + "="*70)
    print("💡 CONSEILS POUR LE FRONTEND:")
    print("="*70)
    print("1. Les barres de personnalisation utilisent:")
    print("   - quantite_min et quantite_max pour les limites")
    print("   - quantite_defaut pour la valeur initiale")
    print("2. Le calcul du prix doit être proportionnel:")
    print("   - ratio = (qte - qte_min) / (qte_max - qte_min)")
    print("   - prix = prix_min + ratio * (prix_max - prix_min)")
    print("3. Le total estimé = prix_base + somme(prix_ingredients)")
    
finally:
    db.close()
