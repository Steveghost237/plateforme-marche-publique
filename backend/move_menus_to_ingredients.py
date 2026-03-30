"""Script pour déplacer les menus vers la section Menus & Ingrédients et supprimer la section Menus"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Section, Produit

db = SessionLocal()

try:
    # Récupérer la section Menus & Ingrédients
    section_ingredients = db.query(Section).filter(Section.code == "menus_ingredients").first()
    if not section_ingredients:
        print("❌ La section 'Menus & Ingrédients' n'existe pas")
        exit(1)
    
    # Récupérer la section Menus
    section_menus = db.query(Section).filter(Section.code == "menus").first()
    if not section_menus:
        print("⚠️  La section 'Menus' n'existe pas")
    else:
        # Récupérer tous les produits de la section Menus
        menus = db.query(Produit).filter(Produit.section_id == section_menus.id).all()
        
        print(f"📋 Déplacement de {len(menus)} menus vers 'Menus & Ingrédients'...")
        
        # Déplacer chaque menu vers la section Menus & Ingrédients
        for menu in menus:
            db.query(Produit).filter(Produit.id == menu.id).update(
                {"section_id": section_ingredients.id},
                synchronize_session=False
            )
            print(f"  ✅ {menu.nom} déplacé")
        
        db.flush()
        
        # Supprimer la section Menus
        db.delete(section_menus)
        print(f"✅ Section 'Menus' supprimée")
    
    db.commit()
    print("\n" + "="*50)
    print("✅ OPÉRATION RÉUSSIE!")
    print("="*50)
    print(f"Les menus sont maintenant dans la section 'Menus & Ingrédients'")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    raise
finally:
    db.close()
