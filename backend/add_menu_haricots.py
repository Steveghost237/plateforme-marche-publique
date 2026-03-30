"""Script pour ajouter le menu Haricots avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "haricots-sauce").first()
    if existing:
        print("⚠️  Le menu 'Haricots' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Haricots
    menu = Produit(
        section_id=section.id,
        nom="Haricots en sauce 🫘",
        slug="haricots-sauce",
        description="Délicieux haricots rouges en sauce avec légumes variés, écrevisses et viande. Un plat complet et nutritif avec tomates, poivrons, carottes, céleri, ail et gingembre. Pour 5 personnes.",
        prix_base_fcfa=3000,
        image_url="/static/images/menus/haricots-sauce.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=8
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        {"nom": "Haricots rouges", "description": "5 boîtes de haricots", "quantite": 5, "unite": "boîte", "obligatoire": True},
        {"nom": "Tomates", "description": "3 grosses tomates", "quantite": 3, "unite": "pièce", "obligatoire": True},
        {"nom": "Ail", "description": "3 têtes d'ail ou moins", "quantite": 3, "unite": "tête", "obligatoire": True},
        {"nom": "Poivron vert", "description": "1 poivron vert", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Poivron jaune", "description": "1 poivron jaune (facultatif)", "quantite": 1, "unite": "pièce", "obligatoire": False},
        {"nom": "Céleri", "description": "1 tige de céleri", "quantite": 1, "unite": "tige", "obligatoire": True},
        {"nom": "Écrevisse", "description": "Écrevisses", "quantite": 150, "unite": "g", "obligatoire": True},
        {"nom": "Poireau", "description": "1 poireau", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Oignons", "description": "2 oignons", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Gingembre", "description": "Un morceau de gingembre", "quantite": 1, "unite": "morceau", "obligatoire": True},
        {"nom": "Odjom", "description": "Pour le parfum (facultatif)", "quantite": 1, "unite": "pincée", "obligatoire": False},
        {"nom": "Carottes", "description": "4 carottes", "quantite": 4, "unite": "pièce", "obligatoire": True},
        {"nom": "Haricot vert", "description": "Haricots verts frais", "quantite": 200, "unite": "g", "obligatoire": False},
    ]
    
    for idx, ing_data in enumerate(ingredients_data):
        # Définir les plages de quantités
        qte_def = ing_data["quantite"]
        
        if ing_data["unite"] in ['g', 'ml']:
            qte_min = max(0, qte_def * 0.5)
            qte_max = qte_def * 2
        elif ing_data["unite"] in ['pièce', 'piece', 'pcs', 'boîte', 'tête', 'tige']:
            qte_min = 0
            qte_max = max(10, qte_def * 3)
        elif ing_data["unite"] in ['morceau']:
            qte_min = 0
            qte_max = 5
        else:  # pincée, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['haricots rouges', 'boîte']):
            prix_defaut = 300
            prix_min = 0
            prix_max = 800
        elif any(word in nom_lower for word in ['écrevisse']):
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
    print("✅ MENU HARICOTS AJOUTÉ AVEC SUCCÈS!")
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
