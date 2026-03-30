"""Script pour ajouter le menu Poisson Braisé au Four"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Section, Produit, Ingredient

db = SessionLocal()

try:
    # Récupérer la section Menus
    section_menus = db.query(Section).filter(Section.code == "menus").first()
    if not section_menus:
        print("❌ La section Menus n'existe pas")
        exit(1)

    # Vérifier si le menu existe déjà
    menu_poisson = db.query(Produit).filter(
        Produit.slug == "poisson-braise-four"
    ).first()
    
    if menu_poisson:
        print(f"⚠️  Le menu 'Poisson Braisé au Four' existe déjà")
    else:
        # Créer le menu Poisson Braisé
        menu_poisson = Produit(
            section_id=section_menus.id,
            nom="Poisson Braisé au Four 🐟",
            slug="poisson-braise-four",
            description="Délicieux poisson braisé au four, mariné avec des épices et aromates. Servi avec des plantains frits et des légumes sautés. Un plat savoureux et équilibré.",
            prix_base_fcfa=5000,
            image_url="/static/images/menus/poisson-braise-four.jpg",
            est_menu=True,
            est_actif=True,
            est_populaire=True,
            ordre=3
        )
        db.add(menu_poisson)
        db.flush()
        print(f"✅ Menu 'Poisson Braisé au Four' créé - Prix: 5000 FCFA")

        # Ajouter les ingrédients
        ingredients_data = [
            {"nom": "Poisson entier", "description": "1 poisson entier (tilapia, carpe ou bar)", "quantite": 1, "unite": "pièce"},
            {"nom": "Ail", "description": "6 gousses d'ail", "quantite": 6, "unite": "gousse"},
            {"nom": "Oignon", "description": "2 oignons moyens", "quantite": 2, "unite": "pièce"},
            {"nom": "Herbe de Provence", "description": "2 cuillères à café", "quantite": 2, "unite": "c. à café"},
            {"nom": "Poivron rouge", "description": "1 poivron rouge", "quantite": 1, "unite": "pièce"},
            {"nom": "Poivre blanc", "description": "1 cuillère à café", "quantite": 1, "unite": "c. à café"},
            {"nom": "Rondelle", "description": "Épice locale", "quantite": 1, "unite": "c. à café"},
            {"nom": "Pébè", "description": "Piment noir", "quantite": 1, "unite": "c. à café"},
            {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée"},
            {"nom": "Plantains", "description": "3 plantains mûrs pour accompagnement", "quantite": 3, "unite": "pièce"},
            {"nom": "Huile", "description": "Pour la cuisson", "quantite": 3, "unite": "c. à soupe"}
        ]

        for ing_data in ingredients_data:
            ingredient = Ingredient(
                produit_id=menu_poisson.id,
                nom=ing_data["nom"],
                description=ing_data["description"],
                unite=ing_data["unite"],
                quantite_defaut=ing_data["quantite"],
                est_obligatoire=True
            )
            db.add(ingredient)
        
        print(f"✅ {len(ingredients_data)} ingrédients ajoutés")

    db.commit()
    print("\n" + "="*50)
    print("✅ MENU AJOUTÉ AVEC SUCCÈS!")
    print("="*50)
    print(f"Nom: Poisson Braisé au Four 🐟")
    print(f"Prix: 5000 FCFA")
    print(f"Section: Menus")
    print(f"Ingrédients: 11")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    raise
finally:
    db.close()
