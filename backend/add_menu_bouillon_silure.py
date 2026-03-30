"""Script pour ajouter le menu Bouillon de Silure avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "bouillon-silure").first()
    if existing:
        print("⚠️  Le menu 'Bouillon de Silure' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Bouillon de Silure
    menu = Produit(
        section_id=section.id,
        nom="Bouillon de Silure 🐟",
        slug="bouillon-silure",
        description="Recette ancestrale camerounaise de bouillon de poisson silure. Délicieux bouillon parfumé au njansan, pebe, gingembre, citronnelle et odjom. Se déguste avec du riz, plantain ou tout autre féculent. Pour 4 personnes.",
        prix_base_fcfa=5200,
        image_url="/static/images/menus/bouillon-silure.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=11
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Poisson silure", "description": "1 kilo de poisson silure", "quantite": 1000, "unite": "g", "obligatoire": True},
        {"nom": "Tomates fraîches", "description": "2 tomates fraîches", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Njansan", "description": "20 graines de njansan (graines de ricin)", "quantite": 20, "unite": "graine", "obligatoire": True},
        {"nom": "Pebe", "description": "2 graines de Pebe", "quantite": 2, "unite": "graine", "obligatoire": True},
        {"nom": "Gingembre", "description": "1 petit morceau de gingembre", "quantite": 1, "unite": "morceau", "obligatoire": True},
        {"nom": "Citronnelle", "description": "Quelques brins de citronnelle", "quantite": 3, "unite": "brin", "obligatoire": True},
        {"nom": "Odjom", "description": "Odjom (feuille de gingembre)", "quantite": 2, "unite": "feuille", "obligatoire": True},
        {"nom": "Huile de cuisson", "description": "2 cuillères à soupe d'huile", "quantite": 2, "unite": "c. à soupe", "obligatoire": True},
    ]
    
    for idx, ing_data in enumerate(ingredients_data):
        # Définir les plages de quantités
        qte_def = ing_data["quantite"]
        
        if ing_data["unite"] in ['g', 'ml']:
            qte_min = max(0, qte_def * 0.5)
            qte_max = qte_def * 2
        elif ing_data["unite"] in ['pièce', 'piece', 'pcs', 'graine', 'brin', 'feuille']:
            qte_min = 0
            qte_max = max(10, qte_def * 3)
        elif ing_data["unite"] in ['morceau']:
            qte_min = 0
            qte_max = 5
        else:  # c. à soupe, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['poisson', 'silure']):
            prix_defaut = 800
            prix_min = 0
            prix_max = 2000
        elif any(word in nom_lower for word in ['njansan', 'pebe']):
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
    print("✅ MENU BOUILLON DE SILURE AJOUTÉ AVEC SUCCÈS!")
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
