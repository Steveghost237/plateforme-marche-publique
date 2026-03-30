"""Script pour vérifier les menus dans la base de données"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Section, Produit

db = SessionLocal()

try:
    # Vérifier la section Menus
    section = db.query(Section).filter(Section.code == "menus").first()
    
    if section:
        print(f"✅ Section trouvée: {section.nom}")
        print(f"   Code: {section.code}")
        print(f"   Active: {section.actif}")
        print(f"   Ordre: {section.ordre}")
        print()
        
        # Lister les menus
        menus = db.query(Produit).filter(Produit.section_id == section.id).all()
        print(f"📋 Nombre de menus: {len(menus)}")
        print()
        
        for i, menu in enumerate(menus, 1):
            print(f"{i}. {menu.nom}")
            print(f"   Prix: {menu.prix_base_fcfa} FCFA")
            print(f"   Slug: {menu.slug}")
            print(f"   Actif: {menu.est_actif}")
            print(f"   Menu: {menu.est_menu}")
            print(f"   Image: {menu.image_url}")
            print()
    else:
        print("❌ Section Menus non trouvée")
        
finally:
    db.close()
