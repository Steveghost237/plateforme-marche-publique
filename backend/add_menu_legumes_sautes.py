"""Script pour ajouter le menu Légumes sautés Poisson Plantain mûr avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "legumes-sautes-poisson-plantain").first()
    if existing:
        print("⚠️  Le menu 'Légumes sautés Poisson Plantain' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Légumes sautés
    menu = Produit(
        section_id=section.id,
        nom="Légumes sautés Poisson Plantain mûr 👌",
        slug="legumes-sautes-poisson-plantain",
        description="Délicieux légumes verts sautés avec du poisson frais, accompagnés de plantains mûrs. Un plat sain et savoureux avec tomates, ail, piment, poireau, oignon et poivron.",
        prix_base_fcfa=3200,
        image_url="/static/images/menus/legumes-sautes-poisson-plantain.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=5
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Légumes verts", "description": "500g de légumes verts (épinards, feuilles...)", "quantite": 500, "unite": "g", "obligatoire": True},
        {"nom": "Poisson frais", "description": "300g de poisson frais", "quantite": 300, "unite": "g", "obligatoire": True},
        {"nom": "Plantain mûr", "description": "3 plantains mûrs", "quantite": 3, "unite": "pièce", "obligatoire": True},
        {"nom": "Tomate", "description": "2 tomates fraîches", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Ail", "description": "5 gousses d'ail", "quantite": 5, "unite": "gousse", "obligatoire": True},
        {"nom": "Piment", "description": "1-2 piments au goût", "quantite": 2, "unite": "pièce", "obligatoire": False},
        {"nom": "Poireau", "description": "1 poireau", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Oignon", "description": "2 oignons", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Poivron", "description": "1 poivron", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Huile végétale", "description": "Pour la cuisson", "quantite": 100, "unite": "ml", "obligatoire": True},
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
        else:  # pincée, gousse, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['poisson']):
            prix_defaut = 500
            prix_min = 0
            prix_max = 1500
        elif any(word in nom_lower for word in ['plantain']):
            prix_defaut = 200
            prix_min = 0
            prix_max = 500
        elif any(word in nom_lower for word in ['huile']):
            prix_defaut = 100
            prix_min = 0
            prix_max = 300
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
    print("✅ MENU LÉGUMES SAUTÉS AJOUTÉ AVEC SUCCÈS!")
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
