"""Script pour ajouter le menu Koki spongieux avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "koki-spongieux").first()
    if existing:
        print("⚠️  Le menu 'Koki spongieux' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Koki spongieux
    menu = Produit(
        section_id=section.id,
        nom="Koki spongieux 🤩",
        slug="koki-spongieux",
        description="Délicieux Koki camerounais souple comme une éponge ! Gâteau de haricots cuit à la vapeur dans des feuilles de bananier avec de l'huile de palme rouge. Texture moelleuse et spongieuse. Servi avec plantains et igname.",
        prix_base_fcfa=2800,
        image_url="/static/images/menus/koki-spongieux.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=10
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Haricots (koki)", "description": "4 boîtes de koki", "quantite": 4, "unite": "boîte", "obligatoire": True},
        {"nom": "Huile de palme", "description": "500 ml d'huile de palme rouge", "quantite": 500, "unite": "ml", "obligatoire": True},
        {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Feuilles de bananier", "description": "Pour l'emballage", "quantite": 10, "unite": "feuille", "obligatoire": True},
        {"nom": "Eau", "description": "Pour la cuisson", "quantite": 500, "unite": "ml", "obligatoire": True},
        {"nom": "Piment", "description": "Piment (facultatif)", "quantite": 2, "unite": "pièce", "obligatoire": False},
        {"nom": "Sel germe ou kanwa", "description": "Sel germe (facultatif)", "quantite": 1, "unite": "c. à café", "obligatoire": False},
    ]
    
    for idx, ing_data in enumerate(ingredients_data):
        # Définir les plages de quantités
        qte_def = ing_data["quantite"]
        
        if ing_data["unite"] in ['ml']:
            qte_min = max(0, qte_def * 0.5)
            qte_max = qte_def * 2
        elif ing_data["unite"] in ['pièce', 'piece', 'pcs', 'boîte', 'feuille']:
            qte_min = 0
            qte_max = max(10, qte_def * 3)
        else:  # pincée, c. à café, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['haricots', 'koki', 'boîte']):
            prix_defaut = 300
            prix_min = 0
            prix_max = 800
        elif any(word in nom_lower for word in ['huile de palme']):
            prix_defaut = 200
            prix_min = 0
            prix_max = 500
        else:
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
    print("✅ MENU KOKI SPONGIEUX AJOUTÉ AVEC SUCCÈS!")
    print("="*50)
    print(f"Menu: {menu.nom}")
    print(f"Prix: {menu.prix_base_fcfa} FCFA")
    print(f"Ingrédients: {len(ingredients_data)}")
    print(f"Image: {menu.image_url}")
    print("="*50)

except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
