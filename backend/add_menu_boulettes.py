"""Script pour ajouter le menu Sauté de boulettes de viande de bœuf avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "saute-boulettes-boeuf").first()
    if existing:
        print("⚠️  Le menu 'Sauté de boulettes de viande de bœuf' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Sauté de boulettes
    menu = Produit(
        section_id=section.id,
        nom="Sauté de boulettes de viande de bœuf",
        slug="saute-boulettes-boeuf",
        description="Délicieuses boulettes de viande de bœuf frites et sautées avec des oignons, tomates, poivrons et condiments verts. Un plat savoureux et parfumé avec des épices secrètes.",
        prix_base_fcfa=3800,
        image_url="/static/images/menus/saute-boulettes-boeuf.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=2
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Boulettes de viande de bœuf fris", "description": "500g de boulettes frites", "quantite": 500, "unite": "g", "obligatoire": True},
        {"nom": "Oignons", "description": "2 oignons moyens", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Tomates", "description": "3 tomates fraîches", "quantite": 3, "unite": "pièce", "obligatoire": True},
        {"nom": "Poivron", "description": "1 poivron (rouge ou vert)", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Céléri", "description": "Condiment vert au choix", "quantite": 1, "unite": "botte", "obligatoire": False},
        {"nom": "Persil", "description": "Condiment vert au choix", "quantite": 1, "unite": "botte", "obligatoire": False},
        {"nom": "Poireau", "description": "Condiment vert au choix", "quantite": 1, "unite": "pièce", "obligatoire": False},
        {"nom": "Basilic", "description": "Condiment vert au choix", "quantite": 1, "unite": "botte", "obligatoire": False},
        {"nom": "Épices SECRET", "description": "Mélange d'épices au choix", "quantite": 2, "unite": "c. à café", "obligatoire": True},
        {"nom": "Huile de friture", "description": "Pour la cuisson", "quantite": 100, "unite": "ml", "obligatoire": True},
    ]
    
    for idx, ing_data in enumerate(ingredients_data):
        # Définir les plages de quantités
        qte_def = ing_data["quantite"]
        
        if ing_data["unite"] in ['g', 'ml']:
            qte_min = max(0, qte_def * 0.5)
            qte_max = qte_def * 2
        elif ing_data["unite"] in ['kg', 'l']:
            qte_min = max(0, qte_def * 0.5)
            qte_max = qte_def * 2
        elif ing_data["unite"] in ['pièce', 'piece', 'pcs']:
            qte_min = 0
            qte_max = max(10, qte_def * 3)
        elif ing_data["unite"] in ['botte']:
            qte_min = 0
            qte_max = 5
        else:  # pincée, c. à café, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['boulettes', 'viande', 'bœuf']):
            prix_defaut = 500
            prix_min = 0
            prix_max = 1500
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
    print("✅ MENU SAUTÉ DE BOULETTES AJOUTÉ AVEC SUCCÈS!")
    print("="*50)
    print(f"Menu: {menu.nom}")
    print(f"Prix: {menu.prix_base_fcfa} FCFA")
    print(f"Ingrédients: {len(ingredients_data)}")
    print(f"Image: {menu.image_url}")
    print("="*50)
    print("\n⚠️  N'oubliez pas de placer l'image 'saute-boulettes-boeuf.jpg' dans:")
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
