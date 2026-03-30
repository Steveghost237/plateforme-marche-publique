"""Script pour ajouter le menu Ndolé Royal avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "ndole-royal").first()
    if existing:
        print("⚠️  Le menu 'Ndolé Royal' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Ndolé Royal
    menu = Produit(
        section_id=section.id,
        nom="Ndolé Royal ❤️",
        slug="ndole-royal",
        description="Délicieux Ndolé Royal camerounais préparé avec des feuilles de Ndolé, arachides blanches, viande de bœuf, crevettes, poissons fumés et écrevisses. Servi avec des plantains frits et du miondo de Dibombari.",
        prix_base_fcfa=4500,
        image_url="/static/images/menus/ndole-royal.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=1
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Ndolé préalablement lavé", "description": "500g de feuilles de Ndolé", "quantite": 500, "unite": "g", "obligatoire": True},
        {"nom": "Arachides blanc du ndole", "description": "200g d'arachides blanches", "quantite": 200, "unite": "g", "obligatoire": True},
        {"nom": "Viande de bœuf", "description": "500g de viande de bœuf", "quantite": 500, "unite": "g", "obligatoire": True},
        {"nom": "Crevettes", "description": "200g de crevettes fraîches", "quantite": 200, "unite": "g", "obligatoire": True},
        {"nom": "Poissons fumés", "description": "2 pièces (selon votre choix)", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Écrevisses", "description": "150g d'écrevisses", "quantite": 150, "unite": "g", "obligatoire": True},
        {"nom": "Oignon", "description": "2 oignons moyens", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Ail", "description": "5 gousses d'ail", "quantite": 5, "unite": "gousse", "obligatoire": True},
        {"nom": "Huile de cuisson", "description": "100ml d'huile", "quantite": 100, "unite": "ml", "obligatoire": True},
        {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Miondô de Dibombari", "description": "4 bâtons de miondo", "quantite": 4, "unite": "pièce", "obligatoire": False},
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
        else:  # pincée, gousse, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['viande', 'crevettes', 'poissons', 'bœuf']):
            prix_defaut = 500
            prix_min = 0
            prix_max = 1500
        elif any(word in nom_lower for word in ['miondo', 'miondô']):
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
    print("✅ MENU NDOLÉ ROYAL AJOUTÉ AVEC SUCCÈS!")
    print("="*50)
    print(f"Menu: {menu.nom}")
    print(f"Prix: {menu.prix_base_fcfa} FCFA")
    print(f"Ingrédients: {len(ingredients_data)}")
    print(f"Image: {menu.image_url}")
    print("="*50)
    print("\n⚠️  N'oubliez pas de placer l'image 'ndole-royal.jpg' dans:")
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
