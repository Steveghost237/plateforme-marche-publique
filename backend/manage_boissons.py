"""
Script pour gérer les produits Boissons :
1. Lister les produits existants
2. Supprimer les doublons
3. Ajouter les nouveaux produits depuis les images locales
"""
import requests
import re
from urllib.parse import quote

API_BASE = "https://comebuy-api.onrender.com/api"
ADMIN_PHONE = "+237600000000"
ADMIN_PASS = "Admin@2026!"

SECTION_ID = "abaec2d3-8e10-4f14-a142-521feb8ef7b5"  # Boissons

# Images locales dans static/images/boissons/
# Le nom du fichier (sans extension) = nom du produit
IMAGES = [
    "33 Export",
    "Baoba Naturel",
    "Bavaria",
    "Booster Cola",
    "Bullet",
    "Castel",
    "Chill",
    "Fanta Orange",
    "Guiness",
    "Heineken",
    "Jus de Bissap",
    "Malta Guiness",
    "Manyan",
    "Mutzig",
    "Orangina",
    "Reaktor",
    "Smirnoff Ice",
    "Vimto",
]

# Prix estimés pour chaque boisson (FCFA)
PRIX = {
    "33 Export":      {"base": 500, "max": 700, "desc": "Bière 33 Export, blonde légère et rafraîchissante. Une classique au Cameroun."},
    "Baoba Naturel":  {"base": 300, "max": 500, "desc": "Jus naturel de Baobab, boisson rafraîchissante et nutritive à base de fruit de baobab."},
    "Bavaria":        {"base": 500, "max": 800, "desc": "Bière Bavaria importée des Pays-Bas, blonde premium au goût délicat."},
    "Booster Cola":   {"base": 300, "max": 500, "desc": "Boisson gazeuse Booster Cola, une alternative locale au cola classique."},
    "Bullet":         {"base": 500, "max": 700, "desc": "Boisson énergisante Bullet, populaire au Cameroun pour ses effets dynamisant."},
    "Castel":         {"base": 500, "max": 700, "desc": "Bière Castel, marque phare au Cameroun. Blonde douce et légère."},
    "Chill":          {"base": 300, "max": 500, "desc": "Boisson gazeuse Chill, rafraîchissante avec un goût fruité pétillant."},
    "Fanta Orange":   {"base": 300, "max": 500, "desc": "Fanta Orange, soda fruité à l'orange. Incontournable au Cameroun."},
    "Guiness":        {"base": 600, "max": 900, "desc": "Guinness Foreign Extra Stout, bière brune corsée et amère. Très appréciée au Cameroun."},
    "Heineken":       {"base": 600, "max": 900, "desc": "Bière Heineken premium importée. Blonde au goût houblonné et raffiné."},
    "Jus de Bissap":  {"base": 300, "max": 500, "desc": "Jus de Bissap (hibiscus), boisson traditionnelle camerounaise. Rafraîchissante et riche en vitamines."},
    "Malta Guiness":  {"base": 400, "max": 600, "desc": "Malta Guinness, boisson maltée non alcoolisée. Sucrée et nutritive, populaire chez les enfants et adultes."},
    "Manyan":         {"base": 500, "max": 700, "desc": "Bière Manyan, marque camerounaise populaire. Blonde légère au goût houblonné."},
    "Mutzig":         {"base": 500, "max": 700, "desc": "Bière Mutzig, une des bières préférées des camerounais. Blonde forte et savoureuse."},
    "Orangina":       {"base": 400, "max": 600, "desc": "Orangina, boisson gazeuse à la pulpe d'orange. Pétillante et naturelle."},
    "Reaktor":        {"base": 500, "max": 700, "desc": "Boisson énergisante Reaktor, boost d'énergie avec caféine et taurine."},
    "Smirnoff Ice":   {"base": 700, "max": 1000, "desc": "Smirnoff Ice, boisson aromatisée à base de vodka. Légère et pétillante."},
    "Vimto":          {"base": 300, "max": 500, "desc": "Vimto, boisson fruitée à base de raisin, framboise et cassis. Populaire en Afrique."},
}


def slugify(name):
    """Convertir un nom en slug URL-friendly"""
    s = name.lower().strip()
    s = re.sub(r'[àáâãäå]', 'a', s)
    s = re.sub(r'[èéêë]', 'e', s)
    s = re.sub(r'[ìíîï]', 'i', s)
    s = re.sub(r'[òóôõö]', 'o', s)
    s = re.sub(r'[ùúûü]', 'u', s)
    s = re.sub(r'[ýÿ]', 'y', s)
    s = re.sub(r'[ç]', 'c', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s


def login():
    """Se connecter en tant qu'admin"""
    r = requests.post(f"{API_BASE}/auth/connexion", json={
        "telephone": ADMIN_PHONE,
        "mot_de_passe": ADMIN_PASS,
    })
    if r.status_code != 200:
        print(f"ERREUR login: {r.status_code} {r.text}")
        return None
    data = r.json()
    print(f"✅ Connecté en tant que {data['user']['nom_complet']}")
    return data["access_token"]


def get_boissons(token):
    """Lister tous les produits Boissons existants"""
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{API_BASE}/catalogue/produits?section=boissons&limit=100", headers=headers)
    if r.status_code != 200:
        print(f"ERREUR liste: {r.status_code}")
        return []
    return r.json()


def delete_product(token, product_id, nom):
    """Supprimer un produit (soft delete)"""
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.delete(f"{API_BASE}/catalogue/produits/{product_id}", headers=headers)
    if r.status_code == 200:
        print(f"  🗑️  Supprimé: {nom} ({product_id})")
    else:
        print(f"  ❌ Erreur suppression {nom}: {r.status_code} {r.text}")


def create_product(token, name, info):
    """Créer un nouveau produit"""
    headers = {"Authorization": f"Bearer {token}"}
    slug = slugify(name)
    image_url = f"/static/images/boissons/{quote(name)}.jpeg"
    
    payload = {
        "section_id": SECTION_ID,
        "nom": name,
        "slug": slug,
        "description": info["desc"],
        "prix_base_fcfa": info["base"],
        "prix_max_fcfa": info["max"],
        "image_url": image_url,
        "est_menu": False,
        "est_populaire": False,
        "est_nouveau": True,
        "stock_dispo": True,
    }
    
    r = requests.post(f"{API_BASE}/catalogue/produits", json=payload, headers=headers)
    if r.status_code == 200:
        print(f"  ✅ Créé: {name} → {image_url}")
    elif r.status_code == 409:
        print(f"  ⚠️  Slug déjà existant pour: {name} ({slug}), tentative avec suffixe...")
        payload["slug"] = slug + "-boisson"
        r2 = requests.post(f"{API_BASE}/catalogue/produits", json=payload, headers=headers)
        if r2.status_code == 200:
            print(f"  ✅ Créé: {name} → {image_url} (slug: {slug}-boisson)")
        else:
            print(f"  ❌ Erreur création {name}: {r2.status_code} {r2.text}")
    else:
        print(f"  ❌ Erreur création {name}: {r.status_code} {r.text}")


def main():
    print("=" * 60)
    print("🥤 GESTION DES PRODUITS BOISSONS")
    print("=" * 60)
    
    # 1. Login
    print("\n📌 Connexion admin...")
    token = login()
    if not token:
        print("Impossible de se connecter. Arrêt.")
        return
    
    # 2. Lister les produits existants
    print("\n📌 Produits Boissons existants:")
    existants = get_boissons(token)
    print(f"   {len(existants)} produits trouvés")
    for p in existants:
        print(f"   - {p['nom']} (ID: {p['id'][:8]}..., image: {p['image_url'][:50] if p.get('image_url') else 'aucune'}...)")
    
    # 3. Trouver et supprimer les doublons (même nom normalisé)
    print("\n📌 Recherche de doublons...")
    seen = {}
    doublons = []
    for p in existants:
        nom_norm = p["nom"].lower().strip()
        if nom_norm in seen:
            doublons.append(p)
            print(f"   🔴 Doublon trouvé: {p['nom']} (premier: {seen[nom_norm]['nom']})")
        else:
            seen[nom_norm] = p
    
    if doublons:
        print(f"\n📌 Suppression de {len(doublons)} doublons...")
        for p in doublons:
            delete_product(token, p["id"], p["nom"])
    else:
        print("   Aucun doublon trouvé.")
    
    # 4. Supprimer TOUS les anciens produits boissons (ceux avec images unsplash)
    print("\n📌 Suppression des anciens produits avec images Unsplash...")
    for p in existants:
        if p.get("image_url") and "unsplash" in p["image_url"]:
            if p not in doublons:  # Ne pas supprimer 2 fois
                delete_product(token, p["id"], p["nom"])
    
    # 5. Créer les nouveaux produits
    print(f"\n📌 Ajout de {len(IMAGES)} nouveaux produits...")
    for name in IMAGES:
        info = PRIX.get(name, {"base": 500, "max": 700, "desc": f"Boisson {name}"})
        create_product(token, name, info)
    
    # 6. Vérification finale
    print("\n📌 Vérification finale...")
    final = get_boissons(token)
    print(f"   {len(final)} produits dans la section Boissons")
    for p in final:
        print(f"   ✅ {p['nom']} - {p['prix_base_fcfa']} F")
    
    print("\n" + "=" * 60)
    print("🎉 TERMINÉ !")
    print("=" * 60)


if __name__ == "__main__":
    main()
