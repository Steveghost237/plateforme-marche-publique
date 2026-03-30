"""Script pour ajouter le menu Bouillon de Pattes de Bœuf"""
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
        print("❌ La section Menus n'existe pas. Exécutez d'abord add_menu_okok.py")
        exit(1)

    # Vérifier si le menu existe déjà
    menu_bouillon = db.query(Produit).filter(
        Produit.slug == "bouillon-pattes-boeuf"
    ).first()
    
    if menu_bouillon:
        print(f"⚠️  Le menu 'Bouillon de Pattes de Bœuf' existe déjà")
    else:
        # Créer le menu Bouillon
        menu_bouillon = Produit(
            section_id=section_menus.id,
            nom="Bouillon de Pattes de Bœuf",
            slug="bouillon-pattes-boeuf",
            description="Délicieux bouillon de pattes de bœuf très doux, mijoté avec des épices et aromates traditionnels. Un plat réconfortant et savoureux de la cuisine camerounaise.",
            prix_base_fcfa=4000,
            image_url="/static/images/menus/bouillon-pattes-boeuf.jpg",
            est_menu=True,
            est_actif=True,
            est_populaire=True,
            ordre=2
        )
        db.add(menu_bouillon)
        db.flush()
        print(f"✅ Menu 'Bouillon de Pattes de Bœuf' créé - Prix: 4000 FCFA")

        # Ajouter les ingrédients
        ingredients_data = [
            {"nom": "Pattes de bœuf", "description": "1kg de pattes de bœuf", "quantite": 1, "unite": "kg"},
            {"nom": "Tomates", "description": "4 tomates fraîches", "quantite": 4, "unite": "pièce"},
            {"nom": "Oignons verts", "description": "1 botte d'oignons verts", "quantite": 1, "unite": "botte"},
            {"nom": "Oignons", "description": "2 oignons moyens", "quantite": 2, "unite": "pièce"},
            {"nom": "Ail", "description": "5 gousses d'ail", "quantite": 5, "unite": "gousse"},
            {"nom": "Poivre blanc", "description": "1 cuillère à café", "quantite": 1, "unite": "c. à café"},
            {"nom": "Djansan", "description": "Épice traditionnelle", "quantite": 1, "unite": "c. à café"},
            {"nom": "Rondelles", "description": "Épice locale", "quantite": 1, "unite": "c. à café"},
            {"nom": "Pepe", "description": "Piment noir", "quantite": 1, "unite": "c. à café"},
            {"nom": "Ossim", "description": "Épice camerounaise", "quantite": 1, "unite": "c. à café"},
            {"nom": "Gingembre", "description": "1 morceau de gingembre frais", "quantite": 1, "unite": "morceau"},
            {"nom": "Feuilles de Laurier", "description": "3 feuilles de laurier", "quantite": 3, "unite": "feuille"},
            {"nom": "Huile", "description": "3 cuillères à soupe d'huile", "quantite": 3, "unite": "c. à soupe"},
            {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée"},
            {"nom": "Bouillon d'assaisonnement", "description": "2 cubes de bouillon", "quantite": 2, "unite": "cube"}
        ]

        for ing_data in ingredients_data:
            ingredient = Ingredient(
                produit_id=menu_bouillon.id,
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
    print(f"Nom: Bouillon de Pattes de Bœuf")
    print(f"Prix: 4000 FCFA")
    print(f"Section: Menus")
    print(f"Ingrédients: 15")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    raise
finally:
    db.close()
