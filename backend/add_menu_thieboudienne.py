"""Script pour ajouter le menu Thiéboudienne avec ses ingrédients"""
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
    existing = db.query(Produit).filter(Produit.slug == "thieboudienne").first()
    if existing:
        print("⚠️  Le menu 'Thiéboudienne' existe déjà. Suppression...")
        db.delete(existing)
        db.commit()
    
    # Créer le menu Thiéboudienne
    menu = Produit(
        section_id=section.id,
        nom="Thiéboudienne (Riz au Poisson)",
        slug="thieboudienne",
        description="Plat traditionnel sénégalais à base de riz cassé, poisson frais farci, légumes variés (navets, carottes, choux, aubergines, manioc, patate douce) et sauce tomate parfumée au tamarin. Un festin complet pour 6-8 personnes.",
        prix_base_fcfa=6500,
        image_url="/static/images/menus/thieboudienne.jpg",
        est_menu=True,
        est_actif=True,
        est_populaire=True,
        est_nouveau=True,
        stock_dispo=True,
        ordre=3
    )
    db.add(menu)
    db.flush()
    
    print(f"✅ Menu '{menu.nom}' créé avec succès")
    
    # Ajouter les ingrédients
    ingredients_data = [
        # Ingrédients principaux
        {"nom": "Riz cassé", "description": "1.5 kg de riz cassé", "quantite": 1500, "unite": "g", "obligatoire": True},
        {"nom": "Poisson frais", "description": "1 gros poisson frais", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Poisson séché (Guedje)", "description": "Un morceau de poisson séché", "quantite": 1, "unite": "pièce", "obligatoire": True},
        
        # Légumes
        {"nom": "Navets", "description": "3 navets", "quantite": 3, "unite": "pièce", "obligatoire": True},
        {"nom": "Carottes", "description": "4 carottes", "quantite": 4, "unite": "pièce", "obligatoire": True},
        {"nom": "Choux blancs", "description": "2 petits choux blancs", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Aubergines", "description": "2 aubergines", "quantite": 2, "unite": "pièce", "obligatoire": True},
        {"nom": "Manioc", "description": "Un peu de manioc", "quantite": 200, "unite": "g", "obligatoire": False},
        {"nom": "Patate douce", "description": "1 grosse patate douce", "quantite": 1, "unite": "pièce", "obligatoire": True},
        {"nom": "Dikhatô (aubergine ronde)", "description": "2 dikhatô", "quantite": 2, "unite": "pièce", "obligatoire": False},
        
        # Aromates et condiments
        {"nom": "Oignons", "description": "3 oignons", "quantite": 3, "unite": "pièce", "obligatoire": True},
        {"nom": "Ail", "description": "Une dizaine de gousses", "quantite": 10, "unite": "gousse", "obligatoire": True},
        {"nom": "Tomates bien mûres", "description": "3 tomates mixées", "quantite": 3, "unite": "pièce", "obligatoire": True},
        {"nom": "Concentré de tomate", "description": "400g de double concentré", "quantite": 400, "unite": "g", "obligatoire": True},
        {"nom": "Petits piments", "description": "Quelques petits piments", "quantite": 3, "unite": "pièce", "obligatoire": False},
        {"nom": "Dakhar (Tamarin)", "description": "Pour parfumer", "quantite": 50, "unite": "g", "obligatoire": True},
        {"nom": "Feuilles de bissap", "description": "Deux grosses poignées", "quantite": 2, "unite": "poignée", "obligatoire": False},
        
        # Huile et assaisonnements
        {"nom": "Huile neutre", "description": "1 demi bouteille (tournesol)", "quantite": 250, "unite": "ml", "obligatoire": True},
        {"nom": "Sel", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Poivre", "description": "Au goût", "quantite": 1, "unite": "pincée", "obligatoire": True},
        {"nom": "Cube maggie", "description": "Aromates de cuisson", "quantite": 2, "unite": "cube", "obligatoire": False},
        
        # Rof (Farce pour le poisson)
        {"nom": "Persil (pour farce)", "description": "1 bouquet", "quantite": 1, "unite": "botte", "obligatoire": True},
        {"nom": "Piment (pour farce)", "description": "½ piment", "quantite": 0.5, "unite": "pièce", "obligatoire": False},
        {"nom": "Ail (pour farce)", "description": "3 gousses", "quantite": 3, "unite": "gousse", "obligatoire": True},
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
        elif ing_data["unite"] in ['botte', 'poignée']:
            qte_min = 0
            qte_max = 5
        elif ing_data["unite"] in ['cube']:
            qte_min = 0
            qte_max = 5
        else:  # pincée, gousse, etc.
            qte_min = 0
            qte_max = max(5, qte_def * 2)
        
        # Définir les prix
        nom_lower = ing_data["nom"].lower()
        
        if any(word in nom_lower for word in ['poisson frais', 'poisson séché', 'guedje']):
            prix_defaut = 500
            prix_min = 0
            prix_max = 1500
        elif any(word in nom_lower for word in ['riz']):
            prix_defaut = 300
            prix_min = 0
            prix_max = 800
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
    print("✅ MENU THIÉBOUDIENNE AJOUTÉ AVEC SUCCÈS!")
    print("="*50)
    print(f"Menu: {menu.nom}")
    print(f"Prix: {menu.prix_base_fcfa} FCFA")
    print(f"Ingrédients: {len(ingredients_data)}")
    print(f"Image: {menu.image_url}")
    print("="*50)
    print("\n⚠️  N'oubliez pas de placer l'image 'thieboudienne.jpg' dans:")
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
