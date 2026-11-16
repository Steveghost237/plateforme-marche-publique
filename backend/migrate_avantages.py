"""Migration : table fidelite_avantages — coupons issus des échanges de points.
Idempotent : ne crée la table que si absente."""
from app.core.database import engine
from app.models.models import FideliteAvantage


def run():
    FideliteAvantage.__table__.create(engine, checkfirst=True)
    print("table fidelite_avantages OK")


if __name__ == "__main__":
    run()
