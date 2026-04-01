"""Script pour mettre à jour les ingrédients détaillés des 71 menus camerounais."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

db = SessionLocal()

# Dictionnaire complet des ingrédients détaillés par slug de menu
INGREDIENTS_DETAILLES = {
    # RÉGION DU LITTORAL
    "ndole-metet": [
        dict(nom="Feuilles de Ndolè", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=300, quantite_min=200, quantite_max=600, prix_min_fcfa=400, prix_max_fcfa=1200, prix_defaut_fcfa=600),
        dict(nom="Arachides crues", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=300, quantite_min=150, quantite_max=500, prix_min_fcfa=300, prix_max_fcfa=1000, prix_defaut_fcfa=500),
        dict(nom="Crevettes fraîches", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=600, quantite_min=300, quantite_max=1000, prix_min_fcfa=1500, prix_max_fcfa=5000, prix_defaut_fcfa=2500),
        dict(nom="Poisson fumé", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=100, quantite_min=0, quantite_max=300, prix_min_fcfa=0, prix_max_fcfa=1500, prix_defaut_fcfa=600),
        dict(nom="Viande de bœuf", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=500, quantite_min=200, quantite_max=800, prix_min_fcfa=1000, prix_max_fcfa=4000, prix_defaut_fcfa=2000),
        dict(nom="Oignons", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Gingembre", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=50, quantite_min=0, quantite_max=100, prix_min_fcfa=0, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Tomate", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=300, prix_defaut_fcfa=100),
        dict(nom="Piment", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Huile de palme rouge", est_obligatoire=True, type_saisie="curseur", unite="cl",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=150, prix_max_fcfa=500, prix_defaut_fcfa=250),
        dict(nom="Cubes Maggi", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=0, quantite_max=4, prix_min_fcfa=0, prix_max_fcfa=200, prix_defaut_fcfa=100),
    ],
    
    "mbongo-tchobi-sauce-ebene": [
        dict(nom="Poisson (machoiron/carpe)", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=1000, quantite_min=500, quantite_max=1500, prix_min_fcfa=2000, prix_max_fcfa=7500, prix_defaut_fcfa=4000),
        dict(nom="Mbongo (poivre sauvage)", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=50, quantite_min=30, quantite_max=100, prix_min_fcfa=300, prix_max_fcfa=1000, prix_defaut_fcfa=500),
        dict(nom="Djansang", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=30, quantite_min=15, quantite_max=60, prix_min_fcfa=200, prix_max_fcfa=600, prix_defaut_fcfa=300),
        dict(nom="Rondelles", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=0, quantite_max=30, prix_min_fcfa=0, prix_max_fcfa=300, prix_defaut_fcfa=100),
        dict(nom="Ail", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=30, quantite_min=15, quantite_max=60, prix_min_fcfa=50, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Gingembre", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=30, quantite_min=15, quantite_max=60, prix_min_fcfa=50, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Piment", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Oignon", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=1, quantite_max=3, prix_min_fcfa=50, prix_max_fcfa=300, prix_defaut_fcfa=100),
        dict(nom="Huile de palme", est_obligatoire=True, type_saisie="curseur", unite="cl",
             quantite_defaut=8, quantite_min=4, quantite_max=20, prix_min_fcfa=100, prix_max_fcfa=500, prix_defaut_fcfa=200),
    ],
    
    "ndomba-papillote-beti": [
        dict(nom="Poulet/Porc/Poisson", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=1000, quantite_min=500, quantite_max=1500, prix_min_fcfa=2000, prix_max_fcfa=7500, prix_defaut_fcfa=3500),
        dict(nom="Feuilles de bananier", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=3, quantite_min=2, quantite_max=6, prix_min_fcfa=100, prix_max_fcfa=300, prix_defaut_fcfa=150),
        dict(nom="Oignons", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Ail", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=30, quantite_min=15, quantite_max=60, prix_min_fcfa=50, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Gingembre", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=30, quantite_min=15, quantite_max=60, prix_min_fcfa=50, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Rondelles", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=0, quantite_max=30, prix_min_fcfa=0, prix_max_fcfa=300, prix_defaut_fcfa=100),
        dict(nom="Djansang", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=20, quantite_min=10, quantite_max=50, prix_min_fcfa=150, prix_max_fcfa=500, prix_defaut_fcfa=250),
        dict(nom="Sel gemme", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10),
        dict(nom="Poivre blanc", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=5, quantite_min=0, quantite_max=15, prix_min_fcfa=0, prix_max_fcfa=100, prix_defaut_fcfa=30),
        dict(nom="Piment", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
    ],
    
    "koki-gateau-cornille": [
        dict(nom="Graines de cornille", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=1000, quantite_min=500, quantite_max=2000, prix_min_fcfa=500, prix_max_fcfa=2000, prix_defaut_fcfa=1000),
        dict(nom="Huile de palme rouge", est_obligatoire=True, type_saisie="curseur", unite="ml",
             quantite_defaut=600, quantite_min=300, quantite_max=1000, prix_min_fcfa=600, prix_max_fcfa=2000, prix_defaut_fcfa=1000),
        dict(nom="Feuilles de bananier", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=4, quantite_min=2, quantite_max=8, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Piment", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
    ],
    
    "mets-pistache-ngonda-mukon": [
        dict(nom="Graines de courge (pistache)", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=500, quantite_min=250, quantite_max=800, prix_min_fcfa=500, prix_max_fcfa=1600, prix_defaut_fcfa=800),
        dict(nom="Crevettes", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=200, quantite_min=0, quantite_max=500, prix_min_fcfa=0, prix_max_fcfa=2500, prix_defaut_fcfa=1000),
        dict(nom="Poisson fumé", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=150, quantite_min=100, quantite_max=300, prix_min_fcfa=500, prix_max_fcfa=1500, prix_defaut_fcfa=800),
        dict(nom="Huile de palme", est_obligatoire=True, type_saisie="curseur", unite="cl",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=150, prix_max_fcfa=500, prix_defaut_fcfa=250),
        dict(nom="Sel", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10),
        dict(nom="Piment", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Feuilles de bananier", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=3, quantite_min=2, quantite_max=6, prix_min_fcfa=100, prix_max_fcfa=300, prix_defaut_fcfa=150),
    ],
    
    "sanga": [
        dict(nom="Maïs frais en épis", est_obligatoire=True, type_saisie="curseur", unite="kg",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=500, prix_max_fcfa=2000, prix_defaut_fcfa=1000),
        dict(nom="Feuilles de zom/épinards", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=1000, quantite_min=500, quantite_max=1500, prix_min_fcfa=300, prix_max_fcfa=900, prix_defaut_fcfa=500),
        dict(nom="Jus de noix de palme", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=500, quantite_min=300, quantite_max=800, prix_min_fcfa=400, prix_max_fcfa=1200, prix_defaut_fcfa=600),
        dict(nom="Sucre", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=100, quantite_min=0, quantite_max=200, prix_min_fcfa=0, prix_max_fcfa=200, prix_defaut_fcfa=50),
    ],
    
    "mintoumba-gateau-manioc": [
        dict(nom="Manioc fermenté", est_obligatoire=True, type_saisie="curseur", unite="kg",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=400, prix_max_fcfa=1600, prix_defaut_fcfa=800),
        dict(nom="Huile de palme rouge", est_obligatoire=True, type_saisie="curseur", unite="ml",
             quantite_defaut=100, quantite_min=50, quantite_max=200, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Feuilles de bananier", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=4, quantite_min=2, quantite_max=8, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Piment", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Sel", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10),
    ],
    
    "sauce-njansan-maquereau": [
        dict(nom="Njansan (akpi)", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=100, quantite_min=50, quantite_max=200, prix_min_fcfa=300, prix_max_fcfa=1200, prix_defaut_fcfa=600),
        dict(nom="Maquereaux", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=3, quantite_min=2, quantite_max=5, prix_min_fcfa=1000, prix_max_fcfa=2500, prix_defaut_fcfa=1500),
        dict(nom="Oignon", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Ail", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=30, quantite_min=15, quantite_max=60, prix_min_fcfa=50, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Piment", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Huile de palme", est_obligatoire=True, type_saisie="curseur", unite="cl",
             quantite_defaut=8, quantite_min=4, quantite_max=15, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Sel", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10),
    ],
    
    "muandja-moto-titiris": [
        dict(nom="Titiris (petits poissons)", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=500, quantite_min=300, quantite_max=800, prix_min_fcfa=1000, prix_max_fcfa=3200, prix_defaut_fcfa=1500),
        dict(nom="Oignons", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Tomates", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=3, quantite_min=2, quantite_max=5, prix_min_fcfa=150, prix_max_fcfa=500, prix_defaut_fcfa=250),
        dict(nom="Piment", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=50, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Ail", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=20, quantite_min=0, quantite_max=50, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Huile de palme", est_obligatoire=True, type_saisie="curseur", unite="cl",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=150, prix_max_fcfa=500, prix_defaut_fcfa=250),
        dict(nom="Sel", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10),
        dict(nom="Cubes d'assaisonnement", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=0, quantite_max=4, prix_min_fcfa=0, prix_max_fcfa=200, prix_defaut_fcfa=100),
    ],
    
    "poisson-braise-bar-maquereau-sole": [
        dict(nom="Poisson entier (bar/maquereau/sole)", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=2, quantite_min=1, quantite_max=4, prix_min_fcfa=1500, prix_max_fcfa=6000, prix_defaut_fcfa=3000),
        dict(nom="Oignon", est_obligatoire=True, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=1, quantite_max=3, prix_min_fcfa=50, prix_max_fcfa=300, prix_defaut_fcfa=100),
        dict(nom="Tomate", est_obligatoire=False, type_saisie="curseur", unite="pcs",
             quantite_defaut=1, quantite_min=0, quantite_max=3, prix_min_fcfa=0, prix_max_fcfa=300, prix_defaut_fcfa=100),
        dict(nom="Persil", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=20, quantite_min=0, quantite_max=50, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Céleri", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=20, quantite_min=0, quantite_max=50, prix_min_fcfa=0, prix_max_fcfa=150, prix_defaut_fcfa=50),
        dict(nom="Djansang", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=20, quantite_min=10, quantite_max=50, prix_min_fcfa=150, prix_max_fcfa=500, prix_defaut_fcfa=250),
        dict(nom="Rondelles", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=0, quantite_max=30, prix_min_fcfa=0, prix_max_fcfa=300, prix_defaut_fcfa=100),
        dict(nom="Ail", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=30, quantite_min=15, quantite_max=60, prix_min_fcfa=50, prix_max_fcfa=200, prix_defaut_fcfa=100),
        dict(nom="Huile raffinée", est_obligatoire=True, type_saisie="curseur", unite="cl",
             quantite_defaut=8, quantite_min=4, quantite_max=15, prix_min_fcfa=100, prix_max_fcfa=400, prix_defaut_fcfa=200),
        dict(nom="Sel", est_obligatoire=True, type_saisie="curseur", unite="g",
             quantite_defaut=10, quantite_min=5, quantite_max=20, prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10),
        dict(nom="Poivre", est_obligatoire=False, type_saisie="curseur", unite="g",
             quantite_defaut=5, quantite_min=0, quantite_max=15, prix_min_fcfa=0, prix_max_fcfa=100, prix_defaut_fcfa=30),
    ],
}

try:
    count_updated = 0
    count_skipped = 0
    
    for slug, ingredients_list in INGREDIENTS_DETAILLES.items():
        produit = db.query(Produit).filter(Produit.slug == slug).first()
        if produit:
            # Supprimer les anciens ingrédients
            db.query(Ingredient).filter(Ingredient.produit_id == produit.id).delete()
            
            # Ajouter les nouveaux ingrédients détaillés
            for ordre, ing_data in enumerate(ingredients_list):
                ingredient = Ingredient(
                    produit_id=produit.id,
                    ordre=ordre,
                    **ing_data
                )
                db.add(ingredient)
            
            count_updated += 1
            print(f"✅ {produit.nom}: {len(ingredients_list)} ingrédients mis à jour")
        else:
            count_skipped += 1
            print(f"❌ Menu non trouvé: {slug}")
    
    db.commit()
    print(f"\n✅ Mise à jour terminée!")
    print(f"   - {count_updated} menus mis à jour")
    print(f"   - {count_skipped} menus non trouvés")
    
except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
