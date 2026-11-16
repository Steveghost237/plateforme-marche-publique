"""Migration : colonnes suggestions_produits.est_menu + ingredients_json.
Idempotent — répare aussi les produits déjà créés depuis des suggestions de
la section menus_ingredients (ils ont été publiés sans est_menu → le bouton
« Gérer les ingrédients » n'apparaissait pas dans Gestion des Prix)."""
from sqlalchemy import text
from app.core.database import engine, SessionLocal


def run():
    with engine.begin() as conn:
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(suggestions_produits)"))]
        if "est_menu" not in cols:
            conn.execute(text("ALTER TABLE suggestions_produits ADD COLUMN est_menu BOOLEAN DEFAULT 0"))
            print("colonne est_menu ajoutée")
        if "ingredients_json" not in cols:
            conn.execute(text("ALTER TABLE suggestions_produits ADD COLUMN ingredients_json JSON"))
            print("colonne ingredients_json ajoutée")

    db = SessionLocal()
    # Les suggestions déjà envoyées dans la section menus_ingredients sont des menus
    n_sugg = db.execute(text("""
        UPDATE suggestions_produits SET est_menu = 1
        WHERE section_id = (SELECT id FROM sections WHERE code = 'menus_ingredients')
          AND (est_menu IS NULL OR est_menu = 0)
    """)).rowcount
    # Les produits déjà publiés depuis ces suggestions doivent devenir des menus
    n_prod = db.execute(text("""
        UPDATE produits SET est_menu = 1
        WHERE id IN (
            SELECT produit_cree_id FROM suggestions_produits
            WHERE produit_cree_id IS NOT NULL
              AND section_id = (SELECT id FROM sections WHERE code = 'menus_ingredients')
        ) AND (est_menu IS NULL OR est_menu = 0)
    """)).rowcount
    db.commit()
    print(f"suggestions marquées menu : {n_sugg} · produits réparés : {n_prod}")


if __name__ == "__main__":
    run()
