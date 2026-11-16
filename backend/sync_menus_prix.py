"""sync_menus_prix.py — Resynchronise prix_base/prix_max de tous les menus.
Modèle : prix_base = Σ prix_defaut des ingrédients actifs (prix du menu par
défaut) ; prix_max = Σ prix_max des ingrédients actifs. Sûr à rejouer : les
valeurs sont dérivées, jamais saisies à la main."""
from app.core.database import SessionLocal
from app.models.models import Produit
from app.api.routes import _sync_prix_menu

db = SessionLocal()
menus = db.query(Produit).filter(Produit.est_menu == True, Produit.deleted_at.is_(None)).all()
for m in menus:
    _sync_prix_menu(db, m.id)
db.commit()
print(f"{len(menus)} menus resynchronisés")
for m in menus[:5]:
    db.refresh(m)
    print(f"  {m.nom}: base {m.prix_base_fcfa} F / max {m.prix_max_fcfa} F")
