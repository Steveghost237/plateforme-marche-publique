"""Migration : colonne produits.poids_kg + poids estimés par défaut par section.
Idempotent : n'écrase jamais une valeur déjà renseignée (édition admin)."""
import sys
from sqlalchemy import text
from app.core.database import engine, SessionLocal

# Poids moyen par unité vendue (kg) — estimation par catégorie, l'admin
# pourra affiner produit par produit via l'API /admin/produits.
POIDS_PAR_SECTION = {
    # Secours quand les ingrédients choisis sont inconnus — en usage normal le
    # poids d'un menu = somme des ingrédients bruts (g/cl/pcs), calculée au checkout
    "menus_ingredients": 2.0,
    "fruits":            0.25,  # un fruit / une portion
    "boissons":          0.6,   # une bouteille
    "boulangerie":       0.3,
    "epices":            0.1,   # sachets légers
    "epicerie":          0.8,   # paquet, boîte, bouteille d'huile…
    "entretien":         0.5,
    "cosmetique":        0.3,
    "ma_liste":          0.5,
}
POIDS_DEFAUT = 0.5


def run():
    with engine.connect() as c:
        cols = [r[1] for r in c.execute(text("PRAGMA table_info(produits)"))]
        if "poids_kg" not in cols:
            c.execute(text("ALTER TABLE produits ADD COLUMN poids_kg NUMERIC(6,2)"))
            c.commit()
            print("+ colonne produits.poids_kg ajoutée")
        else:
            print("colonne produits.poids_kg déjà présente")

    db = SessionLocal()
    try:
        total = 0
        for code, poids in POIDS_PAR_SECTION.items():
            n = db.execute(text("""
                UPDATE produits SET poids_kg = :p
                WHERE poids_kg IS NULL
                  AND section_id IN (SELECT id FROM sections WHERE code = :code)
            """), {"p": poids, "code": code}).rowcount
            total += n
            if n: print(f"  {code}: {n} produit(s) -> {poids} kg/unité")
        n = db.execute(text(
            "UPDATE produits SET poids_kg = :p WHERE poids_kg IS NULL"),
            {"p": POIDS_DEFAUT}).rowcount
        if n: print(f"  autres sections: {n} produit(s) -> {POIDS_DEFAUT} kg/unité")
        db.commit()
        print(f"OK — {total + n} produit(s) renseigné(s), aucune valeur existante écrasée")
    finally:
        db.close()


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"ERREUR migration poids produits: {e}", file=sys.stderr)
        sys.exit(1)
