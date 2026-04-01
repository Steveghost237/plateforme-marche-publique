"""Script pour identifier tous les menus sans ingrédients."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient
from sqlalchemy import func

db = SessionLocal()

try:
    # Récupérer tous les menus
    menus = db.query(Produit).filter(Produit.est_menu == True).all()
    
    print(f"📊 Total de menus dans la base: {len(menus)}\n")
    print("="*70)
    
    menus_sans_ingredients = []
    menus_avec_ingredients = []
    
    for menu in menus:
        count = db.query(Ingredient).filter(Ingredient.produit_id == menu.id).count()
        if count == 0:
            menus_sans_ingredients.append(menu)
            print(f"❌ {menu.nom} (slug: {menu.slug}) - 0 ingrédients")
        else:
            menus_avec_ingredients.append((menu, count))
    
    print("\n" + "="*70)
    print(f"\n✅ Menus AVEC ingrédients: {len(menus_avec_ingredients)}")
    print(f"❌ Menus SANS ingrédients: {len(menus_sans_ingredients)}\n")
    
    if menus_sans_ingredients:
        print("📋 Liste des menus sans ingrédients:")
        for menu in menus_sans_ingredients:
            print(f"   • {menu.nom} ({menu.slug})")
    
    print("\n" + "="*70)
    print("📊 Statistiques des menus avec ingrédients:")
    for menu, count in sorted(menus_avec_ingredients, key=lambda x: x[1]):
        print(f"   {count:2d} ingrédients - {menu.nom}")
    
finally:
    db.close()
