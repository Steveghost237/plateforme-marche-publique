"""Script pour ajouter le menu Schawarma avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "schawarma").first()
    if existing:
        print("⚠️  Le menu 'Schawarma' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Schawarma
    menu = Produit(
        section_id=section.id,
        nom="Schawarma",
        slug="schawarma",
        description="Délicieux schawarma avec filet de poulet ou viande grillée, crème fraîche à l'ail, salade fraîche, tomates, oignons et laitue. Parfumé au curry, citron et persil. Servi dans un pain pita chaud.",
        prix_base_fcfa=2500,
        image_url="/static/images/menus/schawarma.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=9
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Filet de poulet / viande", "description": "300g de filet de poulet ou viande", "quantite": 300, "unite": "g", "obligatoire": True},
        {"nom": "Pain pita", "description": "Pain pita pour schawarma", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Crème fraîche", "description": "Crème fraîche", "quantite": 100, "unite": "ml", "obligatoire": True},
        {"nom": "Ail haché", "description": "1 gousse d'ail hachée", "quantite": 1, "unite": "gousse", "obligatoire": True},
        {"nom": "Persil", "description": "Persil frais", "quantite": 1, "unite": "botte", "obligatoire": True},
        {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Curry", "description": "Un peu de curry", "quantite": 1, "unite": "c. à café", "obligatoire": True},
        {"nom": "Citron", "description": "Jus de citron", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Salade", "description": "Salade fraîche", "quantite": 50, "unite": "g", "obligatoire": True},
        {"nom": "Oignon", "description": "Oignon émincé", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Tomate", "description": "Tomate fraîche", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Poivre", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Laitue", "description": "Laitue fraîche", "quantite": 50, "unite": "g", "obligatoire": True},
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
        elif ing_data["unite"] in ['botte']:
            qte_min = 0
            qte_max = 5
        else:  # pincée, c. à café, gousse, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['poulet', 'viande', 'filet']):
            prix_defaut = 500
            prix_min = 0
            prix_max = 1500
        elif any(word in nom_lower for word in ['pain pita']):
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
    print("✅ MENU SCHAWARMA AJOUTÉ AVEC SUCCÈS!")
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
