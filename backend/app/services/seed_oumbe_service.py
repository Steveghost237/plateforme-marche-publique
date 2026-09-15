"""Import des produits Oumbemarket + sections supplémentaires.
Utilisé par seed_oumbe.py (CLI) et l'endpoint POST /api/admin/seed/oumbe."""
import os, json, re, html
from sqlalchemy.orm import Session
from app.models.models import Section, Produit

DATA_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "oumbe_products.json",
)

SECTIONS = [
    dict(code="epicerie",   nom="Épicerie & Alimentaire",
         description="Produits alimentaires et épicerie du quotidien",
         icone="🛒", couleur_hex="#7a3e10", ordre=6),
    dict(code="entretien",  nom="Entretien & Maison",
         description="Produits d'entretien, lessive et hygiène de la maison",
         icone="🧹", couleur_hex="#0e7490", ordre=7),
    dict(code="cosmetique", nom="Cosmétique & Hygiène",
         description="Produits cosmétiques et d'hygiène corporelle",
         icone="🧴", couleur_hex="#a21caf", ordre=8),
    dict(code="ma_liste",   nom="Ma Liste de Marché",
         description="Composez votre liste librement : décrivez vos articles même s'ils ne sont pas au catalogue",
         icone="📝", couleur_hex="#0D2137", ordre=9),
]

CAT_TO_SECTION = {
    "alimentaire": "epicerie",
    "boissons":    "boissons",
    "entretien":   "entretien",
    "cosmetique":  "cosmetique",
}


def clean_name(name: str) -> str:
    n = name.strip().lower()
    n = re.sub(r"\b\w", lambda m: m.group(0).upper(), n)
    n = re.sub(r"(\d[.,]?\d*)\s*l\b",  r"\1 L",  n, flags=re.IGNORECASE)
    n = re.sub(r"(\d[.,]?\d*)\s*cl\b", r"\1 cl", n, flags=re.IGNORECASE)
    n = re.sub(r"(\d[.,]?\d*)\s*ml\b", r"\1 ml", n, flags=re.IGNORECASE)
    n = re.sub(r"(\d[.,]?\d*)\s*kg\b", r"\1 kg", n, flags=re.IGNORECASE)
    n = re.sub(r"(\d[.,]?\d*)\s*g\b",  r"\1 g",  n, flags=re.IGNORECASE)
    return n[:120]


def clean_desc(raw: str) -> str:
    txt = re.sub(r"<[^>]+>", " ", raw or "")
    txt = html.unescape(re.sub(r"\s+", " ", txt)).strip()
    return txt[:500]


def run_import(db: Session) -> dict:
    """Importe sections + produits de façon idempotente. Retourne un récap."""
    secs = {}
    created_sections = []
    for s in SECTIONS:
        obj = db.query(Section).filter(Section.code == s["code"]).first()
        if not obj:
            obj = Section(**s)
            db.add(obj); db.flush()
            created_sections.append(s["nom"])
        secs[s["code"]] = obj

    boissons = db.query(Section).filter(Section.code == "boissons").first()
    if not boissons:
        boissons = Section(code="boissons", nom="Boissons",
                           description="Boissons fraîches et traditionnelles",
                           icone="🥤", couleur_hex="#1B4A8A", ordre=3)
        db.add(boissons); db.flush()
        created_sections.append("Boissons")
    secs["boissons"] = boissons

    # Produit sentinelle pour la liste personnalisée
    custom = db.query(Produit).filter(Produit.slug == "article-personnalise").first()
    if not custom:
        db.add(Produit(
            section_id=secs["ma_liste"].id,
            nom="Article personnalisé",
            slug="article-personnalise",
            description="Article saisi librement par le client. Le prix est estimatif et sera confirmé au marché.",
            prix_base_fcfa=0, prix_max_fcfa=None,
            image_url=None, est_menu=False,
            est_actif=True, est_populaire=False, est_nouveau=False,
        ))
        db.flush()

    data = json.load(open(DATA_FILE, encoding="utf-8"))
    created = updated = skipped = 0
    for i, p in enumerate(data):
        sec_code = CAT_TO_SECTION.get(p["cat"])
        if not sec_code or not p.get("price"):
            skipped += 1
            continue
        slug = f"oumbe-{p['slug']}"[:150]
        prix = int(p["price"])
        image = p.get("img")
        desc = clean_desc(p.get("desc"))

        obj = db.query(Produit).filter(Produit.slug == slug).first()
        if obj:
            obj.prix_base_fcfa = prix
            if image: obj.image_url = image
            if desc:  obj.description = desc
            obj.est_actif = True
            updated += 1
        else:
            db.add(Produit(
                section_id=secs[sec_code].id,
                nom=clean_name(p["name"]), slug=slug, description=desc,
                prix_base_fcfa=prix, prix_max_fcfa=None,
                image_url=image, est_menu=False,
                est_actif=True, est_populaire=False, est_nouveau=True,
                ordre=i,
            ))
            created += 1

    db.commit()
    return {
        "sections_creees": created_sections,
        "produits_crees": created,
        "produits_mis_a_jour": updated,
        "ignores": skipped,
    }
