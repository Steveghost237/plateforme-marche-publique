"""
Remplace les ingrédients génériques (Viande/Poisson, Légumes/Feuilles, ...)
ajoutés par fix_menus_ingredients_and_images.py par de vraies recettes
propres à chaque menu camerounais.

Idempotent et sûr pour la prod :
- n'agit que sur les menus dont TOUS les ingrédients actuels appartiennent
  au set générique (ou qui n'en ont aucun)
- conserve tout menu déjà enrichi manuellement
"""
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Produit, Ingredient

Base.metadata.create_all(bind=engine)
db = SessionLocal()

GENERIC_NAMES = {"Viande / Poisson", "Légumes / Feuilles", "Huile",
                 "Oignons", "Épices / Bouillon", "Piment"}

def ing(nom, oblig=True, unite="g", qte_def=100, qte_min=0, qte_max=300,
        prix_min=0, prix_max=500, prix_def=200):
    return dict(nom=nom, est_obligatoire=oblig, type_saisie="curseur", unite=unite,
                quantite_defaut=qte_def, quantite_min=qte_min, quantite_max=qte_max,
                prix_min_fcfa=prix_min, prix_max_fcfa=prix_max, prix_defaut_fcfa=prix_def)

# ── Ingrédients réutilisables ─────────────────────────────────
def sel():            return ing("Sel", True, "g", 5, 2, 15, 0, 50, 20)
def piment():         return ing("Piment frais", False, "g", 10, 0, 50, 0, 200, 50)
def maggi():          return ing("Cube Maggi", True, "pcs", 2, 1, 4, 50, 200, 100)
def oignon():         return ing("Oignon", True, "g", 100, 50, 300, 50, 300, 150)
def tomate():         return ing("Tomate fraîche", True, "g", 150, 100, 400, 100, 400, 200)
def ail():            return ing("Ail", False, "g", 10, 0, 30, 0, 150, 50)
def gingembre():      return ing("Gingembre", False, "g", 10, 0, 30, 0, 150, 50)
def huile_palme():    return ing("Huile de palme rouge", True, "cl", 10, 5, 30, 100, 600, 250)
def huile():          return ing("Huile végétale", True, "cl", 8, 3, 20, 100, 400, 200)
def huile_friture():  return ing("Huile de friture", True, "cl", 20, 10, 40, 200, 600, 350)
def viande():         return ing("Viande de bœuf", True, "g", 250, 100, 800, 500, 4000, 1500)
def porc():           return ing("Viande de porc", True, "g", 250, 100, 800, 500, 4000, 1500)
def poulet():         return ing("Poulet (morceaux)", True, "g", 400, 200, 1000, 1000, 5000, 2500)
def poisson_fume():   return ing("Poisson fumé", False, "g", 100, 0, 300, 0, 1500, 600)
def poisson_frais():  return ing("Poisson frais", True, "g", 400, 300, 1000, 800, 4000, 2000)
def crevettes_sechees(): return ing("Crevettes séchées (crayfish)", False, "g", 50, 0, 200, 0, 1500, 500)
def feuilles_bananier(): return ing("Feuilles de bananier (emballage)", True, "pcs", 2, 1, 6, 50, 300, 100)
def kanwa():          return ing("Kanwa (sel gemme)", True, "g", 5, 2, 15, 50, 200, 100)
def haricots():       return ing("Haricots (niébé)", True, "g", 250, 100, 600, 200, 1000, 500)
def mais():           return ing("Maïs (grains)", True, "g", 300, 150, 800, 200, 1000, 500)
def farine_mais():    return ing("Farine de maïs", True, "g", 300, 200, 800, 150, 800, 400)
def farine_mil():     return ing("Farine de mil", True, "g", 300, 200, 800, 150, 800, 400)
def plantain():       return ing("Plantain", True, "g", 400, 200, 1000, 300, 1500, 700)
def macabo():         return ing("Macabo / Taro", True, "g", 500, 300, 1000, 300, 1500, 700)
def manioc():         return ing("Manioc", True, "g", 500, 300, 1000, 200, 1000, 500)
def feuilles_manioc(): return ing("Feuilles de manioc pilées", True, "g", 300, 200, 700, 200, 800, 400)
def arachides():      return ing("Arachides pilées", True, "g", 150, 100, 400, 200, 800, 400)
def epices():         return ing("Épices du pays", False, "g", 15, 0, 50, 0, 400, 150)
def noix_palme():     return ing("Noix de palme (mbanga)", True, "g", 400, 250, 800, 300, 1200, 600)
def tripes():         return ing("Tripes / Abattis", False, "g", 150, 0, 400, 0, 1500, 600)
def pistache():       return ing("Graines de courge (pistache)", True, "g", 250, 150, 500, 300, 1000, 600)

# ── Recettes par slug de produit ──────────────────────────────
RECETTES = {
    "koki-gateau-haricots": [
        ing("Haricots cornille (niébé)", True, "g", 300, 200, 600, 200, 800, 400),
        huile_palme(), sel(), piment(),
        ing("Oignon", False, "g", 50, 0, 150, 0, 200, 100),
        feuilles_bananier(),
    ],
    "koki-gateau-cornille": [
        ing("Haricots cornille (niébé)", True, "g", 300, 200, 600, 200, 800, 400),
        huile_palme(), sel(), piment(),
        ing("Oignon", False, "g", 50, 0, 150, 0, 200, 100),
        feuilles_bananier(),
    ],
    "beignets-haricots-accra": [
        ing("Haricots niébé trempés", True, "g", 250, 150, 500, 200, 800, 400),
        oignon(), huile_friture(), sel(), piment(), ail(), gingembre(),
    ],
    "sauce-gombo": [
        ing("Gombo frais", True, "g", 300, 200, 600, 200, 800, 400),
        viande(), poisson_fume(), huile_palme(), oignon(), tomate(),
        crevettes_sechees(), piment(), maggi(), sel(),
    ],
    "couscous-mil-sorgho-sauce-gombo": [
        farine_mil(), ing("Gombo frais", True, "g", 300, 200, 600, 200, 800, 400),
        viande(), poisson_fume(), huile(), oignon(), piment(), maggi(), sel(),
    ],
    "achu-soup": [
        macabo(), viande(), tripes(),
        ing("Huile de palme jaune", True, "cl", 15, 10, 30, 150, 600, 300),
        kanwa(), oignon(), piment(), maggi(), sel(),
    ],
    "taro-sauce-jaune-achu-soup": [
        macabo(), viande(), tripes(),
        ing("Huile de palme jaune", True, "cl", 15, 10, 30, 150, 600, 300),
        kanwa(), oignon(), piment(), maggi(), sel(),
    ],
    "nkui": [
        ing("Feuilles de nkui", True, "g", 300, 200, 600, 200, 800, 400),
        porc(), huile_palme(), kanwa(), oignon(), piment(), maggi(), sel(),
    ],
    "nkui-sauce-gluante-bamileke": [
        ing("Feuilles de nkui", True, "g", 300, 200, 600, 200, 800, 400),
        porc(), huile_palme(), kanwa(), oignon(), piment(), maggi(), sel(),
    ],
    "poisson-braise": [
        ing("Poisson frais (bar/maquereau)", True, "g", 500, 300, 1200, 1000, 5000, 2500),
        oignon(), tomate(), ail(), gingembre(), huile(), piment(),
        ing("Citron", False, "pcs", 1, 0, 3, 0, 200, 100),
        ing("Persil / Céleri", False, "g", 10, 0, 40, 0, 200, 100),
        sel(), ing("Poivre noir", False, "g", 3, 0, 10, 0, 100, 50),
    ],
    "poisson-braise-bar-maquereau-sole": [
        ing("Poisson frais (bar/maquereau)", True, "g", 500, 300, 1200, 1000, 5000, 2500),
        oignon(), tomate(), ail(), gingembre(), huile(), piment(),
        ing("Citron", False, "pcs", 1, 0, 3, 0, 200, 100),
        sel(), ing("Poivre noir", False, "g", 3, 0, 10, 0, 100, 50),
    ],
    "mbongo-tchobi-sauce-ebene": [
        ing("Écorce de Mbongo (tchobi)", True, "g", 15, 10, 40, 100, 500, 250),
        ing("Viande de porc / bœuf", True, "g", 300, 150, 800, 500, 3500, 1500),
        poisson_fume(), ing("Njansang", False, "g", 10, 0, 30, 0, 300, 150),
        tomate(), oignon(), piment(), sel(),
    ],
    "ndole-metet": [
        ing("Feuilles de ndolé (bitterleaf)", True, "g", 300, 200, 600, 200, 800, 400),
        arachides(), viande(), ing("Crevettes fraîches", False, "g", 100, 0, 300, 0, 2000, 800),
        poisson_fume(), oignon(), ail(), huile(), piment(), maggi(), sel(),
    ],
    "eru-water-fufu": [
        ing("Feuilles d'okok (eru)", True, "g", 400, 250, 800, 300, 1200, 700),
        ing("Waterleaf (talinum)", True, "g", 150, 100, 400, 100, 600, 300),
        viande(), crevettes_sechees(), poisson_fume(), huile_palme(),
        ing("Water fufu (accompagnement)", True, "g", 500, 300, 1000, 200, 800, 400),
        piment(), maggi(), sel(),
    ],
    "okock-okok-ikok-ekoke": [
        ing("Feuilles d'okok", True, "g", 400, 250, 800, 300, 1200, 700),
        ing("Waterleaf (talinum)", True, "g", 150, 100, 400, 100, 600, 300),
        viande(), crevettes_sechees(), huile_palme(), piment(), maggi(), sel(),
    ],
    "poulet-dg-directeur-general": [
        poulet(), ing("Plantains mûrs", True, "g", 500, 300, 1000, 300, 1200, 600),
        ing("Carottes", True, "g", 150, 100, 400, 100, 400, 200),
        ing("Haricots verts", False, "g", 100, 0, 300, 0, 500, 250),
        ing("Poivrons", True, "g", 100, 50, 300, 100, 400, 200),
        tomate(), oignon(), ail(), gingembre(), huile(), piment(), maggi(), sel(),
    ],
    "ndomba-papillote-beti": [
        poisson_frais(), ing("Feuilles de ndomba (emballage)", True, "pcs", 3, 2, 8, 50, 300, 150),
        epices(), ail(), gingembre(), oignon(), huile(), piment(), sel(),
    ],
    "kondre-ragout-royal-plantain": [
        ing("Plantains verts", True, "g", 500, 300, 1000, 300, 1200, 600),
        viande(), huile_palme(), tomate(), oignon(), ail(), gingembre(),
        epices(), piment(), maggi(), sel(),
    ],
    "banane-malaxee-topsi-baana": [
        ing("Bananes plantain", True, "g", 500, 300, 1000, 250, 1000, 500),
        haricots(), huile_palme(), oignon(), piment(), sel(),
    ],
    "plantain-malaxe-betterleaf": [
        ing("Plantains", True, "g", 500, 300, 1000, 300, 1200, 600),
        ing("Feuilles amères (bitterleaf)", True, "g", 150, 100, 400, 100, 500, 250),
        viande(), poisson_fume(), huile_palme(), oignon(), piment(), maggi(), sel(),
    ],
    "kpwem-kpem-puree-feuilles-manioc": [
        feuilles_manioc(), huile_palme(), poisson_fume(), crevettes_sechees(),
        oignon(), piment(), maggi(), sel(),
    ],
    "mboam-kpem-papillote": [
        feuilles_manioc(), huile_palme(), poisson_fume(),
        feuilles_bananier(), oignon(), piment(), sel(),
    ],
    "sanga": [
        mais(), feuilles_manioc(), huile_palme(), poisson_fume(),
        oignon(), piment(), maggi(), sel(),
    ],
    "sanga-variante-sud": [
        mais(), feuilles_manioc(), huile_palme(), poisson_fume(),
        oignon(), piment(), maggi(), sel(),
    ],
    "ekwang-ekwang-coco": [
        ing("Macabo râpé", True, "g", 500, 300, 1000, 300, 1200, 600),
        ing("Feuilles de macabo", True, "pcs", 4, 2, 10, 50, 300, 150),
        huile_palme(), viande(), poisson_fume(), crevettes_sechees(),
        oignon(), piment(), maggi(), sel(),
    ],
    "kwacaco-macabo-feuilles-plantain": [
        ing("Macabo râpé", True, "g", 500, 300, 1000, 300, 1200, 600),
        huile_palme(), poisson_fume(), crevettes_sechees(),
        feuilles_bananier(), piment(), sel(),
    ],
    "kwacaco-bible-macabo-huile-rouge": [
        ing("Macabo râpé", True, "g", 500, 300, 1000, 300, 1200, 600),
        huile_palme(), poisson_fume(), crevettes_sechees(),
        feuilles_bananier(), piment(), sel(),
    ],
    "kwakoukou-macabos-rapes-sauce-blanche": [
        ing("Macabos râpés", True, "g", 500, 300, 1000, 300, 1200, 600),
        arachides(), poisson_fume(), huile(), feuilles_bananier(),
        oignon(), piment(), sel(),
    ],
    "mintoumba-gateau-manioc": [
        ing("Manioc râpé", True, "g", 500, 300, 1000, 250, 1000, 500),
        huile_palme(), feuilles_bananier(), sel(),
    ],
    "ekomba-gateau-mais-arachides": [
        mais(), arachides(), huile_palme(), sel(), feuilles_bananier(),
    ],
    "baskodje-galette-mais": [
        farine_mais(), huile(), sel(),
    ],
    "tenue-militaire-tack-gateau-mais": [
        farine_mais(), ing("Feuilles de manioc", False, "g", 100, 0, 300, 0, 400, 200),
        huile(), sel(), feuilles_bananier(),
    ],
    "gouboudo-galette-mil": [
        farine_mil(), huile(), sel(),
    ],
    "boule-mil": [
        farine_mil(), ing("Eau", True, "cl", 50, 30, 100, 0, 0, 0), sel(),
    ],
    "habirou-soupe-nordiste-mil": [
        farine_mil(), ing("Lait caillé", True, "cl", 30, 15, 60, 100, 500, 250),
        ing("Sucre", False, "g", 20, 0, 80, 0, 200, 100), piment(),
    ],
    "couscous-mais-legumes": [
        farine_mais(), huile(), sel(), feuilles_bananier(),
    ],
    "corn-tchap-corn-chaff-komtchap-sw": [
        mais(), haricots(), huile_palme(), tomate(), oignon(),
        ing("Épinards / Feuilles", False, "g", 100, 0, 300, 0, 400, 200),
        piment(), maggi(), sel(),
    ],
    "komtchap-mais-haricot-melanges": [
        mais(), haricots(), huile_palme(), tomate(), oignon(),
        piment(), maggi(), sel(),
    ],
    "tac-tak-mais-pile-haricot": [
        ing("Maïs pilé", True, "g", 300, 200, 700, 200, 800, 400),
        haricots(), huile_palme(), oignon(), piment(), sel(),
    ],
    "tasba-puree-niebe-haricot": [
        haricots(), huile_palme(), oignon(), piment(), sel(),
    ],
    "toukouri-pommes-terre-pilees-haricot": [
        ing("Pommes de terre", True, "g", 400, 250, 800, 250, 1000, 500),
        haricots(), huile(), tomate(), oignon(), piment(), sel(),
    ],
    "side-plantain-saute-haricot": [
        plantain(), haricots(), tomate(), oignon(), huile_palme(),
        piment(), maggi(), sel(),
    ],
    "ntoumba-plantain-pile-sauce-arachide": [
        ing("Plantains mûrs (pilés)", True, "g", 500, 300, 1000, 300, 1000, 500),
        arachides(), viande(), oignon(), piment(), maggi(), sel(),
    ],
    "sauce-arachide-plantain-pile-ntouba": [
        ing("Plantains mûrs (pilés)", True, "g", 500, 300, 1000, 300, 1000, 500),
        arachides(), viande(), tomate(), oignon(), piment(), maggi(), sel(),
    ],
    "mbanga-soup": [
        noix_palme(), viande(), poisson_fume(), oignon(), piment(), maggi(), sel(),
    ],
    "mbol-sauce-noix": [
        noix_palme(), viande(), poisson_fume(), crevettes_sechees(),
        oignon(), piment(), sel(),
    ],
    "fiand-essouk-sauce-noix-palmiste": [
        noix_palme(), viande(), poisson_fume(), oignon(), piment(), sel(),
    ],
    "mets-pistache-gateau-courge": [
        pistache(), huile_palme(), viande(), poisson_fume(),
        feuilles_bananier(), oignon(), piment(), sel(),
    ],
    "mets-pistache-ngonda-mukon": [
        pistache(), huile_palme(), viande(), poisson_fume(),
        feuilles_bananier(), oignon(), piment(), sel(),
    ],
    "megande-pistache-oeufs-viande": [
        pistache(), ing("Œufs", True, "pcs", 3, 1, 8, 150, 800, 400),
        viande(), huile_palme(), oignon(), piment(), sel(),
    ],
    "macabo-huile-rouge-legumes-amers": [
        macabo(), huile_palme(), ing("Feuilles amères", True, "g", 150, 100, 400, 100, 500, 250),
        viande(), oignon(), piment(), maggi(), sel(),
    ],
    "muandja-moto-titiris": [
        ing("Feuilles titiri (muandja moto)", True, "g", 300, 200, 600, 200, 700, 350),
        huile_palme(), poisson_fume(), crevettes_sechees(), oignon(), piment(), sel(),
    ],
    "njapche-specialite-bamoun": [
        ing("Morelle noire (njapché)", True, "g", 300, 200, 600, 200, 700, 350),
        huile_palme(), viande(), oignon(), piment(), maggi(), sel(),
    ],
    "njapchieu-sauce-morelle-noire": [
        ing("Morelle noire (njapché)", True, "g", 300, 200, 600, 200, 700, 350),
        huile_palme(), viande(), oignon(), piment(), maggi(), sel(),
    ],
    "lalo-sauce-feuilles-baobab": [
        ing("Feuilles de baobab séchées (lalo)", True, "g", 150, 100, 300, 150, 600, 300),
        viande(), poisson_fume(), huile(), oignon(), piment(), maggi(), sel(),
    ],
    "bocko-feuilles-baobab": [
        ing("Feuilles de baobab (bocko)", True, "g", 150, 100, 300, 150, 600, 300),
        viande(), poisson_fume(), huile(), oignon(), kanwa(), piment(), sel(),
    ],
    "sauce-folere-oseille-guinee": [
        ing("Feuilles d'oseille (foléré)", True, "g", 300, 200, 600, 200, 700, 350),
        viande(), poisson_fume(), arachides(), oignon(), huile(), piment(), sel(),
    ],
    "sauce-njansan-maquereau": [
        ing("Maquereau", True, "g", 400, 250, 800, 800, 3000, 1500),
        ing("Njansan (graines)", True, "g", 15, 10, 40, 100, 500, 250),
        tomate(), oignon(), ail(), huile(), piment(), sel(),
    ],
    "bouillon-patte-boeuf": [
        ing("Pattes de bœuf", True, "g", 400, 250, 800, 500, 2500, 1200),
        oignon(), ail(), gingembre(), epices(), piment(), maggi(), sel(),
    ],
    "chiliki-viande-sechee-epicee": [
        ing("Viande séchée (kilichi)", True, "g", 250, 150, 600, 500, 2500, 1200),
        piment(), epices(), oignon(), huile(), sel(),
    ],
    "ndegue-viande-brousse-epicee": [
        ing("Viande de brousse séchée", True, "g", 250, 150, 600, 600, 3000, 1500),
        piment(), epices(), oignon(), huile(), sel(),
    ],
    "ovianga-viande-brousse-plantain": [
        ing("Viande de brousse", True, "g", 300, 150, 700, 600, 3000, 1500),
        plantain(), huile_palme(), oignon(), piment(), maggi(), sel(),
    ],
    "ndjackanjaka-sauce-epicee-nord": [
        viande(), piment(), tomate(), oignon(), epices(), huile(), maggi(), sel(),
    ],
    "soya-brochettes-viande-epicees": [
        ing("Viande de bœuf (brochettes)", True, "g", 300, 150, 700, 500, 3000, 1500),
        ing("Poudre de soya", True, "g", 20, 10, 50, 100, 500, 250),
        oignon(), huile(), piment(), sel(),
    ],
    "kati-kati-legumes-vapeur-poulet": [
        poulet(), ing("Légumes vapeur (carottes, haricots)", True, "g", 200, 100, 500, 150, 700, 350),
        oignon(), ail(), huile(), epices(), piment(), sel(),
    ],
    "riz-jollof-facon-buea": [
        ing("Riz", True, "g", 300, 200, 700, 250, 1000, 500),
        poulet(), tomate(), ing("Concentré de tomate", True, "g", 30, 15, 70, 100, 400, 200),
        oignon(), ing("Poivrons", True, "g", 100, 50, 250, 100, 400, 200),
        huile(), ail(), gingembre(), piment(), maggi(), sel(),
    ],
}

try:
    updated, skipped, missing = 0, 0, []
    for slug, recette in RECETTES.items():
        p = db.query(Produit).filter(Produit.slug == slug).first()
        if not p:
            missing.append(slug); continue
        current = [i.nom for i in p.ingredients]
        # Ne toucher que si vide ou 100% générique
        if current and any(n not in GENERIC_NAMES for n in current):
            skipped += 1
            print(f"⏭️  {p.nom} — ingrédients spécifiques déjà présents")
            continue
        for i in p.ingredients:
            db.delete(i)
        for ordre, data in enumerate(recette):
            db.add(Ingredient(produit_id=p.id, ordre=ordre, **data))
        updated += 1
        print(f"✅ {p.nom} — {len(recette)} ingrédients réels")

    db.commit()
    print("\n" + "=" * 60)
    print(f"Menus corrigés : {updated} | ignorés (déjà OK) : {skipped} | slugs absents : {len(missing)}")
    if missing: print("  Absents :", ", ".join(missing))
except Exception as e:
    db.rollback()
    print(f"❌ ERREUR : {e}")
    import traceback; traceback.print_exc()
    raise
finally:
    db.close()
