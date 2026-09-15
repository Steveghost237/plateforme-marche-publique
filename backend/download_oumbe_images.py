"""Télécharge les images des produits Oumbemarket dans static/images/oumbe/.
Les fichiers sont nommés par slug produit : <slug>.<ext>
Usage : python download_oumbe_images.py
"""
import os, json, urllib.request, urllib.error

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data", "oumbe_products.json")
OUT  = os.path.join(BASE, "static", "images", "oumbe")
os.makedirs(OUT, exist_ok=True)

EXT_BY_TYPE = {
    "image/jpeg": ".jpg", "image/png": ".png",
    "image/webp": ".webp", "image/gif": ".gif",
}

def ext_from(url, content_type):
    ext = os.path.splitext(url.split("?")[0])[1].lower()
    if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        return ".jpg" if ext == ".jpeg" else ext
    return EXT_BY_TYPE.get((content_type or "").split(";")[0].strip(), ".jpg")

products = json.load(open(DATA, encoding="utf-8"))
ok = fail = skip = 0
for p in products:
    url = p.get("img")
    if not url:
        fail += 1
        continue
    slug = p["slug"]
    # Déjà téléchargée (peu importe l'extension) ?
    existing = [f for f in os.listdir(OUT) if f.startswith(slug + ".")]
    if existing:
        skip += 1
        continue
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        r = urllib.request.urlopen(req, timeout=30)
        data = r.read()
        fname = slug + ext_from(url, r.headers.get("Content-Type"))
        with open(os.path.join(OUT, fname), "wb") as f:
            f.write(data)
        ok += 1
        print(f"OK  {fname} ({len(data)//1024} Ko)")
    except Exception as e:
        fail += 1
        print(f"ERR {slug}: {e}")

print(f"\n{ok} téléchargées, {skip} déjà présentes, {fail} échecs")
