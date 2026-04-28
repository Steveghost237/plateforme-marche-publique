"""
Script d'auto-association des images de menus.
Parcourt backend/static/images/menus/ et associe chaque image au produit
dont le slug correspond au nom de fichier (en ignorant les extensions multiples).
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.models.models import Produit

Base.metadata.create_all(bind=engine)
db = SessionLocal()

IMAGES_DIR = os.path.join(os.path.dirname(__file__), "static", "images", "menus")
URL_PREFIX = "/static/images/menus"

def extract_slug(filename):
    """Retire toutes les extensions (.jpg.jpeg → ''), et normalise."""
    name = filename
    # Retirer extensions multiples en cascade
    while True:
        base, ext = os.path.splitext(name)
        if ext.lower() in ('.jpg', '.jpeg', '.png', '.webp'):
            name = base
        else:
            break
    return name

if not os.path.isdir(IMAGES_DIR):
    print(f"[MENUS] Dossier introuvable: {IMAGES_DIR}")
    sys.exit(1)

# Scanner tous les fichiers
file_to_slug = {}
for fname in os.listdir(IMAGES_DIR):
    if not fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
        continue
    slug = extract_slug(fname)
    file_to_slug[fname] = slug

print(f"[MENUS] {len(file_to_slug)} images trouvées")

# Mapping manuel pour les images dont le nom ne correspond pas au slug exact
MANUAL_MAP = {
    "amuse-bouche.jpg": "riz-jollof-facon-buea",
    "banane-malaxee.jpg": None,  # déjà couvert par banane-malaxee-topsi-baana
    "bocko-feuilles-baobab.jpg": "bocko-feuilles-baobab",
    "Bouillon De Silure.jpg": "habirou-soupe-nordiste-mil",
    "bouillon-pattes-boeuf.jpg": "bouillon-patte-boeuf",
    "boule-mil.jpg": "boule-mil",
    "chiliki-viande-sechee-epicee.jpg": "chiliki-viande-sechee-epicee",
    "corn-tchap-corn-chaff-komtchap-sw.jpg": "corn-tchap-corn-chaff-komtchap-sw",
    "couscous-mais-legumes.jpg": "couscous-mais-legumes",
    "couscous-mil-sorgho-sauce-gombo.jpg": "couscous-mil-sorgho-sauce-gombo",
    "ekwang-ekwang-coco.jpg": "ekwang-ekwang-coco",
    "gouboudo-galette-mil.jpg": "gouboudo-galette-mil",
    "habirou-soupe-nordiste-mil.jpg": "habirou-soupe-nordiste-mil",
    "Haricot sauté.jpg": "side-plantain-saute-haricot",
    "Koki.jpeg": "koki-gateau-cornille",
    "kondre-ragout-royal-plantain.jpg": "kondre-ragout-royal-plantain",
    "kwacaco-bible-macabo-huile-rouge.jpg": "kwacaco-bible-macabo-huile-rouge",
    "kwakoukou-macabos-rapes-sauce-blanche.jpg": "kwakoukou-macabos-rapes-sauce-blanche",
    "lalo-sauce-feuilles-baobab.jpg": "lalo-sauce-feuilles-baobab",
    "legumes-sautes-poisson-plantain.jpg": "njapchieu-sauce-morelle-noire",
    "macabo-huile-rouge-legumes-amers.jpg": "macabo-huile-rouge-legumes-amers",
    "mbanga-soup.jpg": "mbanga-soup",
    "Mbol (Sauce des Noix).jpg": "mbol-sauce-noix",
    "mbongo-tchobi-complet.jpg": "mbongo-tchobi-sauce-ebene",
    "ndegue-viande-brousse-epicee.jpg": "ndegue-viande-brousse-epicee",
    "ndjackanjaka-sauce-epicee-nord.jpg": "ndjackanjaka-sauce-epicee-nord",
    "ndole-royal.jpg": "ndole-metet",
    "njapche-specialite-bamoun.jpg": "njapche-specialite-bamoun",
    "nkui-sauce-gluante-bamileke.jpg": "nkui-sauce-gluante-bamileke",
    "okok-water-leaf.jpg": "mbol-sauce-noix",
    "ovianga-viande-brousse-plantain.jpg": "ovianga-viande-brousse-plantain",
    "plantain-malaxe-betterleaf.jpg": "plantain-malaxe-betterleaf",
    "poisson-braise-four.jpg": None,
    "riz-jollof-facon-buea.jpg": "riz-jollof-facon-buea",
    "sauce-folere-oseille-guinee.jpg": "sauce-folere-oseille-guinee",
    "saute-boulettes-boeuf.jpg": None,
    "Shawamar.jpeg": "soya-brochettes-viande-epicees",
    "side-plantain-saute-haricot.jpg": "side-plantain-saute-haricot",
    "soya-brochettes-viande-epicees.jpg": "soya-brochettes-viande-epicees",
    "tac-tak-mais-pile-haricot.jpg": "tac-tak-mais-pile-haricot",
    "tasba-puree-niebe-haricot.jpg": "tasba-puree-niebe-haricot",
    "tenue-militaire-tack-gateau-mais.jpg": "tenue-militaire-tack-gateau-mais",
    "thieboudienne.jpg": None,
    "toukouri-pommes-terre-pilees-haricot.jpg": "toukouri-pommes-terre-pilees-haricot",
}

# Mapping additionnel pour créer des doublons (plusieurs menus → même image)
# Pour les menus sans image propre, on réutilise une image similaire
EXTRA_MAPPINGS = {
    "sanga-variante-sud": "sanga.jpg.jpeg",
    "ntoumba-plantain-pile-sauce-arachide": "banane-malaxee.jpg",
    "sauce-arachide-plantain-pile-ntouba": "banane-malaxee.jpg",
    "fiand-essouk-sauce-noix-palmiste": "okok-water-leaf.jpg",
    "poulet-dg-directeur-general": "poulet-dg.jpg.jpeg",
    "kati-kati-legumes-vapeur-poulet": "kati-kati-legumes-vapeur-poulet.jpg.jpeg",
    "komtchap-mais-haricot-melanges": "komtchap-mais-haricot-melanges.jpg.jpeg",
    "taro-sauce-jaune-achu-soup": "taro-sauce-jaune-achu-soup.jpg.jpeg",
    "banane-malaxee-topsi-baana": "banane-malaxee-topsi-baana.jpg.jpeg",
    "eru-water-fufu": "eru-okok.jpg.jpeg",
    "ekwang-ekwang-coco": "ekwang-ekwang-coco.jpg",
    "kwacaco-macabo-feuilles-plantain": "kwacaco-bible-macabo-huile-rouge.jpg",
    "mets-pistache-gateau-courge": "mets-pistache-ngonda-mukon.jpg.jpeg",
    "megande-pistache-oeufs-viande": "mets-pistache-ngonda-mukon.jpg.jpeg",
    "baskodje-galette-mais": "beignets-haricots-accra.jpg.jpeg",
}

# Build final slug → filename
final_map = {}
# 1) auto-detect: si nom fichier == slug produit exact
for fname, extracted_slug in file_to_slug.items():
    produit = db.query(Produit).filter(Produit.slug == extracted_slug).first()
    if produit:
        final_map[extracted_slug] = fname
# 2) manual overrides
for fname, slug in MANUAL_MAP.items():
    if slug and fname in file_to_slug:
        final_map[slug] = fname
# 3) extra mappings
for slug, fname in EXTRA_MAPPINGS.items():
    if fname in file_to_slug and slug not in final_map:
        final_map[slug] = fname

# Appliquer en DB
updated = 0
missing_produit = []
for slug, fname in final_map.items():
    produit = db.query(Produit).filter(Produit.slug == slug).first()
    if not produit:
        missing_produit.append(slug)
        continue
    url = f"{URL_PREFIX}/{fname}"
    if produit.image_url != url:
        produit.image_url = url
        updated += 1
        print(f"  ✅ {produit.nom[:45]:<45} → {fname}")

db.commit()

print(f"\n[MENUS] {updated} produits mis à jour")
if missing_produit:
    print(f"[MENUS] {len(missing_produit)} slugs sans produit en DB: {missing_produit[:5]}")

db.close()
print("[MENUS] Terminé!")
