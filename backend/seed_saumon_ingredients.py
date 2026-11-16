"""Seed : ingrédients du menu « saumon poêlée » (produit issu d'une suggestion
approuvée avant l'existence de l'éditeur d'ingrédients — publié sans aucun
ingrédient, la fiche affichait « Total estimé : 0 F »).

Le prix payé sur la fiche = Σ des prix_choisi des ingrédients (curseurs).
prix_base_fcfa est aligné sur la somme des défauts pour que le prix affiché
sur la carte catalogue corresponde à la composition par défaut.
Idempotent : supprime et recrée les ingrédients du produit à chaque run."""
from app.core.database import SessionLocal
from app.models.models import Produit, Ingredient

SLUG = "saumon-pole"

# (nom, description, obligatoire, unité, qte_def, qte_min, qte_max, prix_def, prix_min, prix_max)
INGREDIENTS = [
    ("Pavé de saumon frais",        "Pièce de saumon de la pêche du jour, poêlée au beurre",  True,  "g",       300, 150, 800, 4500, 2250, 12000),
    ("Riz parfumé",                 "Riz long grain parfumé, cuit vapeur",                   False, "portion", 1,   0,   3,   500,  0,    1500),
    ("Plantain mûr rôti",           "Rondelles de plantain bien mûr, dorées à la plancha",   False, "portion", 1,   0,   3,   750,  0,    2250),
    ("Légumes verts sautés",        "Haricots verts et brocoli revenus à l'ail",             False, "portion", 1,   0,   2,   750,  0,    1500),
    ("Sauce beurre blanc au citron", "Émulsion beurre-citron, câpres en option",              False, "portion", 1,   0,   2,   500,  0,    1000),
    ("Marinade citron-ail-herbes",  "Citron vert, ail, persil et huile d'olive",             False, "portion", 1,   0,   2,   300,  0,    600),
    ("Piment doux & épices Douala", "Mélange d'épices du marché, dosage au choix",           False, "portion", 1,   0,   3,   200,  0,    600),
]


def run():
    db = SessionLocal()
    prod = db.query(Produit).filter(Produit.slug == SLUG).first()
    if not prod:
        print(f"Produit '{SLUG}' introuvable"); return

    total_defauts = sum(x[7] for x in INGREDIENTS)
    prod.est_menu = True
    # Carte catalogue = somme des défauts (le prix réel reste celui des curseurs)
    prod.prix_base_fcfa = total_defauts

    db.query(Ingredient).filter(Ingredient.produit_id == prod.id).delete()
    db.flush()

    for i, (nom, desc, oblig, unite, qd, qmin, qmax, pd, pmin, pmax) in enumerate(INGREDIENTS):
        db.add(Ingredient(
            produit_id=prod.id, nom=nom, description=desc, est_obligatoire=oblig,
            type_saisie="quantite", unite=unite,
            quantite_defaut=qd, quantite_min=qmin, quantite_max=qmax,
            prix_defaut_fcfa=pd, prix_min_fcfa=pmin, prix_max_fcfa=pmax,
            ordre=i, actif=True,
        ))

    db.commit()
    print(f"{len(INGREDIENTS)} ingredients crees pour '{prod.nom}' - "
          f"somme defauts = {total_defauts:,} F -> prix_base_fcfa")


if __name__ == "__main__":
    run()
