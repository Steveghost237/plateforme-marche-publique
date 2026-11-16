"""Migration : élargit les bornes quantite_min/quantite_max des ingrédients.
Important : le prix d'un ingrédient est proportionnel à la position de la
quantité dans [quantite_min, quantite_max] (calcPrixCurseur côté client).
On recalibre donc prix_max_fcfa pour CONSERVER le prix unitaire — élargir la
quantité sans toucher le prix rendrait les mêmes quantités moins chères.
Idempotent : un ingrédient déjà élargi (ou ajusté par l'admin au-delà du plancher)
n'est pas retouché."""
import sys
from app.core.database import SessionLocal
from app.models.models import Ingredient

# Plancher minimal du nouveau max, et plafond de sécurité
ELARGISSEMENT = {
    "g":   {"floor": 2000, "cap": 10000},  # jusqu'à 10 kg
    "cl":  {"floor": 150,  "cap": 500},    # jusqu'à 5 L
    "pcs": {"floor": 30,   "cap": 60},     # jusqu'à 60 pièces
}
FLOOR_DEFAUT, CAP_DEFAUT = 2000, 10000
FACTEUR = 4


def run():
    db = SessionLocal()
    elargis = 0
    try:
        for ing in db.query(Ingredient).all():
            cfg = ELARGISSEMENT.get(ing.unite, {"floor": FLOOR_DEFAUT, "cap": CAP_DEFAUT})
            qmin = float(ing.quantite_min or 0)
            qmax = float(ing.quantite_max or 0)
            if qmax >= cfg["floor"]:
                continue  # déjà large (élargi précédemment ou réglé par l'admin)
            new_qmax = min(max(qmax * FACTEUR, cfg["floor"]), cfg["cap"])

            # Conserver le prix unitaire : étendre prix_max dans la même pente
            pmin, pmax = ing.prix_min_fcfa or 0, ing.prix_max_fcfa or 0
            if pmax > pmin and qmax > qmin:
                pente = (pmax - pmin) / (qmax - qmin)
                ing.prix_max_fcfa = round(pmin + pente * (new_qmax - qmin))

            ing.quantite_max = new_qmax
            elargis += 1
        db.commit()
        print(f"OK — {elargis} ingrédient(s) élargi(s), prix unitaires conservés")
    except Exception as e:
        db.rollback()
        print(f"ERREUR migration bornes ingrédients: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run()
