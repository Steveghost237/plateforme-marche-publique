"""Script pour ajouter les ingrédients aux 71 nouveaux menus camerounais."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

db = SessionLocal()

try:
    # Liste des slugs des 71 nouveaux menus
    nouveaux_menus_slugs = [
        "ndole-metet", "mbongo-tchobi-sauce-ebene", "ndomba-papillote-beti",
        "koki-gateau-cornille", "mets-pistache-ngonda-mukon", "sanga",
        "mintoumba-gateau-manioc", "sauce-njansan-maquereau", "muandja-moto-titiris",
        "poisson-braise-bar-maquereau-sole", "okock-okok-ikok-ekoke",
        "kpwem-kpem-puree-feuilles-manioc", "mboam-kpem-papillote",
        "ekomba-gateau-mais-arachides", "megande-pistache-oeufs-viande",
        "njapchieu-sauce-morelle-noire", "sauce-arachide-plantain-pile-ntouba",
        "bouillon-patte-boeuf", "sanga-variante-sud", "fiand-essouk-sauce-noix-palmiste",
        "ntoumba-plantain-pile-sauce-arachide", "poulet-dg-directeur-general",
        "ovianga-viande-brousse-plantain", "kondre-ragout-royal-plantain",
        "nkui-sauce-gluante-bamileke", "tac-tak-mais-pile-haricot",
        "side-plantain-saute-haricot", "kwakoukou-macabos-rapes-sauce-blanche",
        "tenue-militaire-tack-gateau-mais", "komtchap-mais-haricot-melanges",
        "njapche-specialite-bamoun", "banane-malaxee-topsi-baana",
        "macabo-huile-rouge-legumes-amers", "taro-sauce-jaune-achu-soup",
        "kati-kati-legumes-vapeur-poulet", "couscous-mais-legumes",
        "toukouri-pommes-terre-pilees-haricot", "plantain-malaxe-betterleaf",
        "eru-water-fufu", "ekwang-ekwang-coco", "kwacaco-bible-macabo-huile-rouge",
        "kwacaco-macabo-feuilles-plantain", "mbanga-soup", "riz-jollof-facon-buea",
        "corn-tchap-corn-chaff-komtchap-sw", "mets-pistache-gateau-courge",
        "mbol-sauce-noix", "ndegue-viande-brousse-epicee", "sauce-folere-oseille-guinee",
        "couscous-mil-sorgho-sauce-gombo", "bocko-feuilles-baobab",
        "gouboudo-galette-mil", "soya-brochettes-viande-epicees",
        "tasba-puree-niebe-haricot", "boule-mil", "lalo-sauce-feuilles-baobab",
        "baskodje-galette-mais", "ndjackanjaka-sauce-epicee-nord",
        "chiliki-viande-sechee-epicee", "habirou-soupe-nordiste-mil",
        "mbusuku-sauce-feuilles-gombo", "foufou-manioc", "sauce-arachide-viande-boeuf",
        "brochettes-soya", "haricots-sautes-jaze-h", "pepper-soup-soupe-epicee",
        "beignets-puff-puff-mikate", "bh-beignet-haricot",
        "fufu-mais-couscous-mais", "batons-manioc-bobolo-miondo"
    ]
    
    # Ingrédients de base communs
    def creer_ingredients_base(produit_id, type_plat):
        """Crée des ingrédients de base selon le type de plat"""
        ingredients = []
        ordre = 0
        
        if "sauce" in type_plat or "plat" in type_plat:
            # Ingrédient principal (viande/poisson)
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Ingrédient principal (viande/poisson)",
                est_obligatoire=True, type_saisie="curseur", unite="g",
                quantite_defaut=500, quantite_min=300, quantite_max=1000,
                prix_min_fcfa=1000, prix_max_fcfa=5000, prix_defaut_fcfa=2000
            ))
            ordre += 1
            
            # Oignons
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Oignons",
                est_obligatoire=True, type_saisie="curseur", unite="pcs",
                quantite_defaut=2, quantite_min=1, quantite_max=5,
                prix_min_fcfa=100, prix_max_fcfa=500, prix_defaut_fcfa=200
            ))
            ordre += 1
            
            # Tomates
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Tomates",
                est_obligatoire=False, type_saisie="curseur", unite="pcs",
                quantite_defaut=2, quantite_min=0, quantite_max=5,
                prix_min_fcfa=0, prix_max_fcfa=500, prix_defaut_fcfa=200
            ))
            ordre += 1
            
            # Ail
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Ail",
                est_obligatoire=False, type_saisie="curseur", unite="g",
                quantite_defaut=30, quantite_min=0, quantite_max=80,
                prix_min_fcfa=0, prix_max_fcfa=250, prix_defaut_fcfa=100
            ))
            ordre += 1
            
            # Gingembre
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Gingembre",
                est_obligatoire=False, type_saisie="curseur", unite="g",
                quantite_defaut=30, quantite_min=0, quantite_max=80,
                prix_min_fcfa=0, prix_max_fcfa=250, prix_defaut_fcfa=100
            ))
            ordre += 1
            
            # Piment
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Piment",
                est_obligatoire=False, type_saisie="curseur", unite="pcs",
                quantite_defaut=1, quantite_min=0, quantite_max=5,
                prix_min_fcfa=0, prix_max_fcfa=250, prix_defaut_fcfa=50
            ))
            ordre += 1
            
            # Huile de palme
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Huile de palme",
                est_obligatoire=True, type_saisie="curseur", unite="cl",
                quantite_defaut=10, quantite_min=5, quantite_max=25,
                prix_min_fcfa=150, prix_max_fcfa=600, prix_defaut_fcfa=250
            ))
            ordre += 1
            
        elif "gateau" in type_plat or "beignet" in type_plat:
            # Farine/Ingrédient de base
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Farine/Ingrédient de base",
                est_obligatoire=True, type_saisie="curseur", unite="g",
                quantite_defaut=500, quantite_min=300, quantite_max=1000,
                prix_min_fcfa=300, prix_max_fcfa=1500, prix_defaut_fcfa=600
            ))
            ordre += 1
            
            # Huile de palme/friture
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Huile de palme/friture",
                est_obligatoire=True, type_saisie="curseur", unite="cl",
                quantite_defaut=10, quantite_min=5, quantite_max=20,
                prix_min_fcfa=150, prix_max_fcfa=500, prix_defaut_fcfa=250
            ))
            ordre += 1
            
            # Sel
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Sel",
                est_obligatoire=True, type_saisie="curseur", unite="g",
                quantite_defaut=10, quantite_min=5, quantite_max=20,
                prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10
            ))
            ordre += 1
            
        else:  # Accompagnements
            # Ingrédient principal
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Ingrédient principal",
                est_obligatoire=True, type_saisie="curseur", unite="g",
                quantite_defaut=500, quantite_min=300, quantite_max=1000,
                prix_min_fcfa=300, prix_max_fcfa=1500, prix_defaut_fcfa=600
            ))
            ordre += 1
            
            # Sel
            ingredients.append(Ingredient(
                produit_id=produit_id, ordre=ordre, nom="Sel",
                est_obligatoire=True, type_saisie="curseur", unite="g",
                quantite_defaut=10, quantite_min=5, quantite_max=20,
                prix_min_fcfa=0, prix_max_fcfa=50, prix_defaut_fcfa=10
            ))
            ordre += 1
        
        return ingredients
    
    # Parcourir tous les nouveaux menus et ajouter les ingrédients
    count = 0
    for slug in nouveaux_menus_slugs:
        produit = db.query(Produit).filter(Produit.slug == slug).first()
        if produit:
            # Vérifier si le produit a déjà des ingrédients
            existing_ingredients = db.query(Ingredient).filter(Ingredient.produit_id == produit.id).count()
            if existing_ingredients == 0:
                # Déterminer le type de plat
                nom_lower = produit.nom.lower()
                if any(word in nom_lower for word in ["sauce", "soupe", "bouillon", "ragoût", "brochette", "poulet", "poisson", "viande"]):
                    type_plat = "plat"
                elif any(word in nom_lower for word in ["gâteau", "beignet", "puff", "galette"]):
                    type_plat = "gateau"
                else:
                    type_plat = "accompagnement"
                
                # Créer les ingrédients
                ingredients = creer_ingredients_base(produit.id, type_plat)
                for ing in ingredients:
                    db.add(ing)
                
                count += 1
                print(f"✅ Ingrédients ajoutés pour: {produit.nom}")
            else:
                print(f"⏭️  {produit.nom} a déjà des ingrédients")
        else:
            print(f"❌ Menu non trouvé: {slug}")
    
    db.commit()
    print(f"\n✅ {count} menus ont reçu leurs ingrédients de personnalisation!")
    
except Exception as e:
    db.rollback()
    print(f"❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
