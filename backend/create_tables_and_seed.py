"""Script to create all tables and seed admin + profile accounts."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base, SessionLocal
from app.core.security import hash_password
from app.models.models import (
    Utilisateur, FideliteCompte, Livreur
)

# Create all tables
print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")

db = SessionLocal()

try:
    # ── 1. ADMIN (super_admin) ──────────────────────────────
    admin_phone = "+237600000000"
    admin = db.query(Utilisateur).filter(Utilisateur.telephone == admin_phone).first()
    if not admin:
        admin = Utilisateur(
            telephone=admin_phone,
            operateur="mtn",
            nom_complet="Administrateur Principal",
            email="admin@marche.cm",
            mot_de_passe_hash=hash_password("Admin@2026!"),
            role="super_admin",
            statut="actif",
        )
        db.add(admin)
        db.flush()
        db.add(FideliteCompte(utilisateur_id=admin.id))
        print(f"Admin created: {admin_phone} / Admin@2026!")
    else:
        admin.role = "super_admin"
        admin.statut = "actif"
        admin.mot_de_passe_hash = hash_password("Admin@2026!")
        print(f"Admin updated: {admin_phone} / Admin@2026!")

    # ── 2. CLIENT ───────────────────────────────────────────
    client_phone = "+237611111111"
    client = db.query(Utilisateur).filter(Utilisateur.telephone == client_phone).first()
    if not client:
        client = Utilisateur(
            telephone=client_phone,
            operateur="mtn",
            nom_complet="Client Test",
            email="client@marche.cm",
            mot_de_passe_hash=hash_password("Client@2026!"),
            role="client",
            statut="actif",
        )
        db.add(client)
        db.flush()
        db.add(FideliteCompte(utilisateur_id=client.id))
        print(f"Client created: {client_phone} / Client@2026!")
    else:
        print(f"Client already exists: {client_phone}")

    # ── 3. LIVREUR ──────────────────────────────────────────
    livreur_phone = "+237622222222"
    livreur_user = db.query(Utilisateur).filter(Utilisateur.telephone == livreur_phone).first()
    if not livreur_user:
        livreur_user = Utilisateur(
            telephone=livreur_phone,
            operateur="orange",
            nom_complet="Livreur Test",
            email="livreur@marche.cm",
            mot_de_passe_hash=hash_password("Livreur@2026!"),
            role="livreur",
            statut="actif",
        )
        db.add(livreur_user)
        db.flush()
        db.add(FideliteCompte(utilisateur_id=livreur_user.id))
        # Create livreur profile
        livreur_profil = Livreur(
            utilisateur_id=livreur_user.id,
            type_vehicule="moto",
            plaque="CE-1234-AB",
            statut="disponible",
            zone_couverte="Yaoundé Centre",
            niveau="junior",
            est_verifie=True,
        )
        db.add(livreur_profil)
        print(f"Livreur created: {livreur_phone} / Livreur@2026!")
    else:
        print(f"Livreur already exists: {livreur_phone}")

    db.commit()
    print("\n" + "="*60)
    print("COMPTES CRÉÉS AVEC SUCCÈS")
    print("="*60)
    print(f"\n{'Role':<15} {'Téléphone':<20} {'Mot de passe':<20}")
    print("-"*55)
    print(f"{'super_admin':<15} {'+237600000000':<20} {'Admin@2026!':<20}")
    print(f"{'client':<15} {'+237611111111':<20} {'Client@2026!':<20}")
    print(f"{'livreur':<15} {'+237622222222':<20} {'Livreur@2026!':<20}")
    print("="*60)

except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    db.close()
