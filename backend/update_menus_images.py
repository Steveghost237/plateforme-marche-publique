"""
Script pour associer les images locales des menus aux produits en base de données.
Parcourt le dossier static/images/menus/ et met à jour l'image_url de chaque produit
dont le slug correspond au nom du fichier.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Produit, Section

Base.metadata.create_all(bind=engine)
db = SessionLocal()

IMAGES_DIR = os.path.join(os.path.dirname(__file__), "static", "images", "menus")

# Lister toutes les images disponibles
image_files = {}
if os.path.isdir(IMAGES_DIR):
    for f in os.listdir(IMAGES_DIR):
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            image_files[f] = f"/static/images/menus/{f}"
    print(f"[MENUS IMAGES] {len(image_files)} images trouvées dans {IMAGES_DIR}")
else:
    print(f"[MENUS IMAGES] Dossier {IMAGES_DIR} introuvable!")
    sys.exit(1)

# Mapping slug → nom de fichier image
# On essaie de faire correspondre chaque produit menu avec son image
SLUG_TO_IMAGE = {
    # ═══ CLASSIQUES ═══
    "eru-okok": "eru-okok.jpg.jpeg",
    "ndole": "ndole.jpg.jpeg",
    "poulet-dg": "poulet-dg.jpg.jpeg",
    "koki-gateau-haricots": "koki-gateau-haricots.jpg.jpeg",
    "mbongo-tchobi": "mbongo-tchobi.jpg.jpeg",
    "beignets-haricots-accra": "beignets-haricots-accra.jpg.jpeg",
    "achu-soup": "achu-soup.jpg.jpeg",
    "sauce-gombo": "sauce-gombo.jpg.jpeg",
    "nkui": "nkui.jpg",
    "poisson-braise": "poisson-braise.jpg.jpeg",
    "miondo-baton-manioc": "miondo-baton-manioc.jpg.jpeg",
    "fufu-corn": "fufu-corn.jpg.jpeg",
    "plantain-mur-frit": "plantain-mur-frit.jpg.jpeg",
    
    # ═══ LITTORAL ═══
    "ndole-metet": "ndole-royal.jpg",
    "mbongo-tchobi-sauce-ebene": "mbongo-tchobi-complet.jpg",
    "ndomba-papillote-beti": "ndomba-papillote-beti.jpg.jpeg",
    "koki-gateau-cornille": "Koki.jpeg",
    "mets-pistache-ngonda-mukon": "mets-pistache-ngonda-mukon.jpg.jpeg",
    "sanga": "sanga.jpg.jpeg",
    "mintoumba-gateau-manioc": "mintoumba-gateau-manioc.jpg.jpeg",
    "sauce-njansan-maquereau": "sauce-njansan-maquereau.jpg.jpg",
    "muandja-moto-titiris": "muandja-moto-titiris.jpg.jpg",
    "poisson-braise-bar-maquereau-sole": "poisson-braise-bar-maquereau-sole.jpg.jpeg",
    
    # ═══ CENTRE ═══
    "okock-okok-ikok-ekoke": "okock-okok-ikok-ekoke.jpg.jpeg",
    "kpwem-kpem-puree-feuilles-manioc": "kpwem-kpem-puree-feuilles-manioc.jpg.JPG",
    "mboam-kpem-papillote": "mboam-kpem-papillote.jpg.jpg",
    "ekomba-gateau-mais-arachides": "ekomba-gateau-mais-arachides.jpg.jpeg",
    "megande-pistache-oeufs-viande": "mets-pistache-ngonda-mukon.jpg.jpeg",
    "njapchieu-sauce-morelle-noire": "legumes-sautes-poisson-plantain.jpg",
    "sauce-arachide-plantain-pile-ntouba": "banane-malaxee.jpg",
    "bouillon-patte-boeuf": "bouillon-pattes-boeuf.jpg",
    
    # ═══ SUD ═══
    "sanga-variante-sud": "sanga.jpg.jpeg",
    "fiand-essouk-sauce-noix-palmiste": "okok-water-leaf.jpg",
    "ntoumba-plantain-pile-sauce-arachide": "banane-malaxee.jpg",
    "poulet-dg-directeur-general": "poulet-dg.jpg.jpeg",
    "ovianga-viande-brousse-plantain": "bouillon-pattes-boeuf.jpg",
    
    # ═══ OUEST ═══
    "kondre-ragout-royal-plantain": "plantain-mur-frit.jpg.jpeg",
    "nkui-sauce-gluante-bamileke": "nkui.jpg",
    "tac-tak-mais-pile-haricot": "fufu-corn.jpg.jpeg",
    "side-plantain-saute-haricot": "Haricot sauté.jpg",
    "kwakoukou-macabos-rapes-sauce-blanche": "ekomba-gateau-mais-arachides.jpg.jpeg",
    "tenue-militaire-tack-gateau-mais": "fufu-corn.jpg.jpeg",
    "komtchap-mais-haricot-melanges": "Haricot sauté.jpg",
    "njapche-specialite-bamoun": "legumes-sautes-poisson-plantain.jpg",
    "banane-malaxee-topsi-baana": "banane-malaxee.jpg",
    "macabo-huile-rouge-legumes-amers": "okok-water-leaf.jpg",
    
    # ═══ NORD-OUEST ═══
    "taro-sauce-jaune-achu-soup": "achu-soup.jpg.jpeg",
    "kati-kati-legumes-vapeur-poulet": "poulet-dg.jpg.jpeg",
    "couscous-mais-legumes": "fufu-corn.jpg.jpeg",
    "toukouri-pommes-terre-pilees-haricot": "Haricot sauté.jpg",
    "plantain-malaxe-betterleaf": "banane-malaxee.jpg",
    
    # ═══ SUD-OUEST ═══
    "eru-water-fufu": "eru-okok.jpg.jpeg",
    "ekwang-ekwang-coco": "mintoumba-gateau-manioc.jpg.jpeg",
    "kwacaco-bible-macabo-huile-rouge": "ekomba-gateau-mais-arachides.jpg.jpeg",
    "kwacaco-macabo-feuilles-plantain": "ekomba-gateau-mais-arachides.jpg.jpeg",
    "mbanga-soup": "okok-water-leaf.jpg",
    "riz-jollof-facon-buea": "amuse-bouche.jpg",
    "corn-tchap-corn-chaff-komtchap-sw": "Haricot sauté.jpg",
    
    # ═══ EST ═══
    "mets-pistache-gateau-courge": "mets-pistache-ngonda-mukon.jpg.jpeg",
    "mbol-sauce-noix": "okok-water-leaf.jpg",
    "ndegue-viande-brousse-epicee": "bouillon-pattes-boeuf.jpg",
    
    # ═══ NORD ═══
    "sauce-folere-oseille-guinee": "legumes-sautes-poisson-plantain.jpg",
    "couscous-mil-sorgho-sauce-gombo": "sauce-gombo.jpg.jpeg",
    "bocko-feuilles-baobab": "legumes-sautes-poisson-plantain.jpg",
    "gouboudo-galette-mil": "beignets-haricots-accra.jpg.jpeg",
    "soya-brochettes-viande-epicees": "Shawamar.jpeg",
    "tasba-puree-niebe-haricot": "Haricot sauté.jpg",
    "boule-mil": "fufu-corn.jpg.jpeg",
    
    # ═══ EXTRÊME-NORD ═══
    "lalo-sauce-feuilles-baobab": "legumes-sautes-poisson-plantain.jpg",
    "baskodje-galette-mais": "beignets-haricots-accra.jpg.jpeg",
    "ndjackanjaka-sauce-epicee-nord": "sauce-gombo.jpg.jpeg",
    "chiliki-viande-sechee-epicee": "Shawamar.jpeg",
    "habirou-soupe-nordiste-mil": "Bouillon De Silure.jpg",
}

# Obtenir la section menus
section = db.query(Section).filter(Section.code == "menus_ingredients").first()
if not section:
    print("[MENUS IMAGES] Section menus_ingredients introuvable!")
    sys.exit(1)

# Mettre à jour chaque produit
updated = 0
not_found_slugs = []
missing_images = []

for slug, filename in SLUG_TO_IMAGE.items():
    produit = db.query(Produit).filter(Produit.slug == slug).first()
    if not produit:
        not_found_slugs.append(slug)
        continue
    
    if filename not in image_files:
        missing_images.append(f"{slug} → {filename}")
        continue
    
    new_url = image_files[filename]
    if produit.image_url != new_url:
        produit.image_url = new_url
        updated += 1
        print(f"  ✅ {produit.nom} → {new_url}")

db.commit()

print(f"\n[MENUS IMAGES] {updated} produits mis à jour")
if not_found_slugs:
    print(f"[MENUS IMAGES] {len(not_found_slugs)} slugs non trouvés en DB: {not_found_slugs[:5]}...")
if missing_images:
    print(f"[MENUS IMAGES] {len(missing_images)} images manquantes: {missing_images[:5]}...")

db.close()
print("[MENUS IMAGES] Terminé!")
