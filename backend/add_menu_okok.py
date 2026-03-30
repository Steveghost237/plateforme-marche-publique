"""Script pour ajouter le menu Okok avec Water Leaf"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Section, Produit, Ingredient
from sqlalchemy import func

db = SessionLocal()

try:
    # Créer ou récupérer la section Menus
    section_menus = db.query(Section).filter(Section.code == "menus").first()
    if not section_menus:
        section_menus = Section(
            code="menus",
            nom="Menus",
            description="Plats préparés et menus complets de cuisine camerounaise",
            icone="🍽️",
            ordre=7,
            actif=True
        )
        db.add(section_menus)
        db.flush()
        print(f"✅ Section 'Menus' créée")
    else:
        print(f"✅ Section 'Menus' existe déjà")

    # Vérifier si le menu existe déjà
    menu_okok = db.query(Produit).filter(
        Produit.slug == "okok-water-leaf"
    ).first()
    
    if menu_okok:
        print(f"⚠️  Le menu 'Okok avec Water Leaf' existe déjà")
    else:
        # Créer le menu Okok
        menu_okok = Produit(
            section_id=section_menus.id,
            nom="Okok avec Water Leaf",
            slug="okok-water-leaf",
            description="Plat traditionnel camerounais à base d'Okok et de Water Leaf, accompagné de viande de bœuf, poissons fumés, écrevisses et peau de bœuf. Servi avec du waterfufu ou tapioca.",
            prix_base_fcfa=3500,
            image_url="/static/images/menus/okok-water-leaf.jpg",
            est_menu=True,
            est_actif=True,
            est_populaire=True,
            ordre=1
        )
        db.add(menu_okok)
        db.flush()
        print(f"✅ Menu 'Okok avec Water Leaf' créé - Prix: 3500 FCFA")

        # Ajouter les ingrédients
        ingredients_data = [
            {"nom": "Okok", "description": "500g de feuilles d'Okok", "quantite": 500, "unite": "g"},
            {"nom": "Water leaf", "description": "300g de feuilles de Water leaf", "quantite": 300, "unite": "g"},
            {"nom": "Écrevisses (Mandjanga)", "description": "200g d'écrevisses", "quantite": 200, "unite": "g"},
            {"nom": "Poisson fumé", "description": "2 pièces (brochet/bifaga/morue)", "quantite": 2, "unite": "pièce"},
            {"nom": "Peau de bœuf", "description": "300g de peau de bœuf", "quantite": 300, "unite": "g"},
            {"nom": "Viande de bœuf", "description": "1kg de viande de bœuf", "quantite": 1, "unite": "kg"},
            {"nom": "Huile de palme", "description": "500ml d'huile de palme", "quantite": 500, "unite": "ml"},
            {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée"},
            {"nom": "Piment", "description": "Au goût (facultatif)", "quantite": 1, "unite": "pincée"},
            {"nom": "Waterfufu ou tapioca", "description": "4 bâtons de waterfufu", "quantite": 4, "unite": "pièce"}
        ]

        for ing_data in ingredients_data:
            ingredient = Ingredient(
                produit_id=menu_okok.id,
                nom=ing_data["nom"],
                description=ing_data["description"],
                unite=ing_data["unite"],
                quantite_defaut=ing_data["quantite"],
                est_obligatoire=(ing_data["nom"] != "Piment")
            )
            db.add(ingredient)
        
        print(f"✅ {len(ingredients_data)} ingrédients ajoutés")

    db.commit()
    print("\n" + "="*50)
    print("✅ MENU AJOUTÉ AVEC SUCCÈS!")
    print("="*50)
    print(f"Nom: Okok avec Water Leaf")
    print(f"Prix: 3500 FCFA")
    print(f"Section: Menus")
    print(f"Ingrédients: 10")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    raise
finally:
    db.close()
