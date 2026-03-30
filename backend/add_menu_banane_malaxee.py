"""Script pour ajouter le menu Banane malaxée avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "banane-malaxee").first()
    if existing:
        print("⚠️  Le menu 'Banane malaxée' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Banane malaxée
    menu = Produit(
        section_id=section.id,
        nom="Banane malaxée 🪷",
        slug="banane-malaxee",
        description="Plat traditionnel camerounais à base de bananes non mûres malaxées avec des arachides grillées, morue fumée et bounga. Une sauce onctueuse à l'huile rouge parfumée à l'ail, gingembre et tomates.",
        prix_base_fcfa=3500,
        image_url="/static/images/menus/banane-malaxee.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=7
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Banane non mûre", "description": "6 bananes non mûres", "quantite": 6, "unite": "pièce", "obligatoire": True},
        {"nom": "Arachide grillée", "description": "200g d'arachides grillées", "quantite": 200, "unite": "g", "obligatoire": True},
        {"nom": "Ail", "description": "8 gousses d'ail", "quantite": 8, "unite": "gousse", "obligatoire": True},
        {"nom": "Oignon", "description": "2 oignons", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Huile rouge", "description": "Huile de palme rouge", "quantite": 150, "unite": "ml", "obligatoire": True},
        {"nom": "Morue fumée", "description": "200g de morue fumée", "quantite": 200, "unite": "g", "obligatoire": True},
        {"nom": "Bounga", "description": "Bounga (poisson fumé)", "quantite": 100, "unite": "g", "obligatoire": True},
        {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Gingembre", "description": "Un morceau de gingembre", "quantite": 1, "unite": "morceau", "obligatoire": True},
        {"nom": "Tomate", "description": "2 à 3 tomates (pas trop)", "quantite": 3, "unite": "pièce", "obligatoire": True},
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
        elif ing_data["unite"] in ['morceau']:
            qte_min = 0
            qte_max = 5
        else:  # pincée, gousse, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['morue', 'bounga', 'poisson']):
            prix_defaut = 500
            prix_min = 0
            prix_max = 1500
        elif any(word in nom_lower for word in ['banane']):
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
    print("✅ MENU BANANE MALAXÉE AJOUTÉ AVEC SUCCÈS!")
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
