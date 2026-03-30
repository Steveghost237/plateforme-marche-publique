"""Script pour ajouter le menu Amuse bouche avec ses ingrédients"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Section, Produit, Ingredient

db = SessionLocal()

try:
    # Récupérer la section Menus & Ingrédients
    section = db.query(Section).filter(Section.code == "menus_ingredients").first()
    if not section:
        print("❌ La section 'Menus & Ingrédients' n'existe pas")
        exit(1)
    
    # Vérifier si le menu existe déjà
    existing = db.query(Produit).filter(Produit.slug == "amuse-bouche").first()
    if existing:
        print("⚠️  Le menu 'Amuse bouche' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Amuse bouche
    menu = Produit(
        section_id=section.id,
        nom="Amuse bouche 🥰",
        slug="amuse-bouche",
        description="Délicieux biscuits sucrés croustillants et fondants, parfaits pour accompagner le thé ou le café. Préparés avec des ingrédients simples : œufs, sucre, farine et vanille.",
        prix_base_fcfa=1500,
        image_url="/static/images/menus/amuse-bouche.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=4
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Œuf", "description": "1 œuf", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Sucre", "description": "80g de sucre", "quantite": 80, "unite": "g", "obligatoire": True},
        {"nom": "Eau", "description": "2 cuillères à soupe", "quantite": 2, "unite": "c. à soupe", "obligatoire": True},
        {"nom": "Huile", "description": "2 cuillères à soupe", "quantite": 2, "unite": "c. à soupe", "obligatoire": True},
        {"nom": "Vanille", "description": "1 sachet de vanille", "quantite": 1, "unite": "sachet", "obligatoire": True},
        {"nom": "Sel", "description": "1 pincée de sel", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Bicarbonate", "description": "4g de bicarbonate", "quantite": 4, "unite": "g", "obligatoire": True},
        {"nom": "Farine", "description": "250g de farine", "quantite": 250, "unite": "g", "obligatoire": True},
    ]
    
    for idx, ing_data in enumerate(ingredients_data):
        # Définir les plages de quantités
        qte_def = ing_data["quantite"]
        
        if ing_data["unite"] in ['g', 'ml']:
            qte_min = max(0, qte_def * 0.5)
            qte_max = qte_def * 2
        elif ing_data["unite"] in ['pièce', 'piece', 'pcs']:
            qte_min = 0
            qte_max = max(10, qte_def * 3)
        elif ing_data["unite"] in ['sachet']:
            qte_min = 0
            qte_max = 5
        else:  # pincée, c. à soupe, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix (ingrédients de base inclus)
        prix_defaut = 0
        prix_min = 0
        prix_max = 200
        
        ingredient = Ingredient(
            produit_id=menu.id,
            nom=ing_data["nom"],
            description=ing_data["description"],
            est_obligatoire=ing_data["obligatoire"],
            type_saisie="quantite",
            unite=ing_data["unite"],
            quantite_defaut=qte_def,
            quantite_min=qte_min,
            quantite_max=qte_max,
            prix_min_fcfa=prix_min,
            prix_max_fcfa=prix_max,
            prix_defaut_fcfa=prix_defaut,
            ordre=idx,
            actif=True
        )
        db.add(ingredient)
        print(f"  ✅ Ingrédient ajouté: {ing_data['nom']}")
    
    db.commit()
    print("\n" + "="*50)
    print("✅ MENU AMUSE BOUCHE AJOUTÉ AVEC SUCCÈS!")
    print("="*50)
    print(f"Menu: {menu.nom}")
    print(f"Prix: {menu.prix_base_fcfa} FCFA")
    print(f"Ingrédients: {len(ingredients_data)}")
    print(f"Image: {menu.image_url}")
    print("="*50)
    print("\n⚠️  N'oubliez pas de placer l'image 'amuse-bouche.jpg' dans:")
    print("   backend/static/images/menus/")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
