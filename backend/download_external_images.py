"""Telecharge les images externes (Unsplash etc.) des produits du catalogue
vers static/images/produits/<slug>.<ext> et ecrit data/external_images_map.json
(slug -> chemin /static/...) pour mise a jour des image_url.
Usage : python download_external_images.py [API_BASE]
"""
import os, sys, json, urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
API  = (sys.argv[1] if len(sys.argv) > 1 else "https://comebuy-api.onrender.com").rstrip("/")
OUT  = os.path.join(BASE, "static", "images", "produits")
MAP  = os.path.join(BASE, "data", "external_images_map.json")
os.makedirs(OUT, exist_ok=True)

EXT_BY_TYPE = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30)

# Tous les produits actifs de l'API
items, page = [], 1
while True:
    batch = json.loads(get(f"{API}/api/catalogue/produits?page={page}&limit=100").read())
    if not batch:
        break
    items += batch
    page += 1

mapping = {}
ok = fail = skip = 0
for p in items:
    url = p.get("image_url") or ""
    slug = p.get("slug") or str(p["id"])
    if not url.startswith("http"):
        continue
    existing = [f for f in os.listdir(OUT) if f.startswith(slug + ".")]
    if existing:
        mapping[slug] = f"/static/images/produits/{existing[0]}"
        skip += 1
        continue
    try:
        r = get(url)
        ext = EXT_BY_TYPE.get((r.headers.get("Content-Type") or "").split(";")[0].strip(), ".jpg")
        fname = slug + ext
        with open(os.path.join(OUT, fname), "wb") as f:
            f.write(r.read())
        mapping[slug] = f"/static/images/produits/{fname}"
        ok += 1
        print(f"OK  {fname}")
    except Exception as e:
        fail += 1
        print(f"ERR {slug}: {e}")

json.dump(mapping, open(MAP, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"\n{ok} telechargees, {skip} deja presentes, {fail} echecs -> {MAP}")
