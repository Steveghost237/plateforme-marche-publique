import uuid
from datetime import datetime
from sqlalchemy import (Column, String, Boolean, Integer, SmallInteger, Text,
    DateTime, Date, Numeric, ForeignKey, Enum as SAEnum)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

# ── UTILISATEURS ──────────────────────────────────────────────
class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    telephone          = Column(String(20), unique=True, nullable=False)
    operateur          = Column(String(20))
    nom_complet        = Column(String(120), nullable=False, default="")
    email              = Column(String(200), unique=True)
    avatar_url         = Column(Text)
    mot_de_passe_hash  = Column(Text)
    biometrie_activee  = Column(Boolean, default=False)
    otp_code           = Column(String(10))
    otp_expire_at      = Column(DateTime(timezone=True))
    otp_tentatives     = Column(SmallInteger, default=0)
    role               = Column(String(20), default="client")
    statut             = Column(String(20), default="en_attente")
    fcm_token          = Column(Text)
    derniere_connexion = Column(DateTime(timezone=True))
    created_at         = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at         = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at         = Column(DateTime(timezone=True))

    adresses        = relationship("Adresse", back_populates="utilisateur", cascade="all, delete-orphan")
    commandes       = relationship("Commande", back_populates="client", foreign_keys="Commande.client_id")
    fidelite        = relationship("FideliteCompte", back_populates="utilisateur", uselist=False)
    livreur_profil  = relationship("Livreur", back_populates="utilisateur", uselist=False)
    notifications   = relationship("Notification", back_populates="destinataire", cascade="all, delete-orphan")
    listes          = relationship("ListeFavorite", back_populates="utilisateur", cascade="all, delete-orphan")

# ── ADRESSES ──────────────────────────────────────────────────
class Adresse(Base):
    __tablename__ = "adresses"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False)
    libelle        = Column(String(60), default="Domicile")
    quartier       = Column(String(120), nullable=False)
    ville          = Column(String(80), default="Yaoundé")
    rue            = Column(String(200))
    porte          = Column(String(50))
    complement     = Column(Text)
    latitude       = Column(Numeric(9,6))
    longitude      = Column(Numeric(9,6))
    est_par_defaut = Column(Boolean, default=False)
    created_at     = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at     = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    utilisateur    = relationship("Utilisateur", back_populates="adresses")

# ── ZONES ──────────────────────────────────────────────────────
class ZoneLivraison(Base):
    __tablename__ = "zones_livraison"
    id                    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom                   = Column(String(100), nullable=False)
    ville                 = Column(String(80), default="Yaoundé")
    distance_min_km       = Column(Numeric(8, 2), default=0)
    distance_max_km       = Column(Numeric(8, 2))
    frais_base_fcfa        = Column(Integer, default=200)      # frais fixes de prise en charge
    prix_par_km_fcfa      = Column(Numeric(8, 2), default=50)  # tarif par km
    prix_par_kg_fcfa      = Column(Numeric(8, 2), default=100) # tarif par kg
    majoration_pointe_pct = Column(SmallInteger, default=20)   # % majoration Lun-Ven
    # Champ legacy conservé pour compatibilité
    frais_fcfa            = Column(Integer, default=500)
    delai_min             = Column(Integer, default=30)
    delai_max             = Column(Integer, default=60)
    actif                 = Column(Boolean, default=True)
    couleur_hex           = Column(String(7), default="#6B7280")
    ordre                 = Column(SmallInteger, default=0)
    created_at            = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at            = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

# ── SECTIONS ──────────────────────────────────────────────────
class Section(Base):
    __tablename__ = "sections"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code        = Column(String(50), unique=True, nullable=False)
    nom         = Column(String(80), nullable=False)
    description = Column(Text)
    icone       = Column(String(10))
    couleur_hex = Column(String(7))
    ordre       = Column(SmallInteger, default=0)
    actif       = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    produits    = relationship("Produit", back_populates="section")

# ── PRODUITS ──────────────────────────────────────────────────
class Produit(Base):
    __tablename__ = "produits"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id      = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False)
    nom             = Column(String(120), nullable=False)
    slug            = Column(String(150), unique=True, nullable=False)
    description     = Column(Text)
    prix_base_fcfa  = Column(Integer, default=0)
    prix_max_fcfa   = Column(Integer)
    image_url       = Column(Text)
    est_menu        = Column(Boolean, default=False)
    est_actif       = Column(Boolean, default=True)
    est_populaire   = Column(Boolean, default=False)
    est_nouveau     = Column(Boolean, default=False)
    stock_dispo     = Column(Boolean, default=True)
    ordre           = Column(SmallInteger, default=0)
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at      = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at      = Column(DateTime(timezone=True))
    section         = relationship("Section", back_populates="produits")
    ingredients     = relationship("Ingredient", back_populates="produit", cascade="all, delete-orphan")

# ── INGRÉDIENTS ───────────────────────────────────────────────
class Ingredient(Base):
    __tablename__ = "ingredients"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    produit_id       = Column(UUID(as_uuid=True), ForeignKey("produits.id", ondelete="CASCADE"), nullable=False)
    nom              = Column(String(120), nullable=False)
    description      = Column(String(300))
    est_obligatoire  = Column(Boolean, default=False)
    type_saisie      = Column(String(20), default="quantite")
    unite            = Column(String(20), default="unite")
    quantite_defaut  = Column(Numeric(8,2), default=1)
    quantite_min     = Column(Numeric(8,2), default=0)
    quantite_max     = Column(Numeric(8,2))
    prix_min_fcfa    = Column(Integer, default=0)
    prix_max_fcfa    = Column(Integer)
    prix_defaut_fcfa = Column(Integer, default=0)
    ordre            = Column(SmallInteger, default=0)
    actif            = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)
    produit          = relationship("Produit", back_populates="ingredients")

# ── LISTES FAVORITES ──────────────────────────────────────────
class ListeFavorite(Base):
    __tablename__ = "listes_favorites"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False)
    nom            = Column(String(100), default="Ma liste")
    created_at     = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at     = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    utilisateur    = relationship("Utilisateur", back_populates="listes")
    lignes         = relationship("ListeFavoriteLigne", back_populates="liste", cascade="all, delete-orphan")

class ListeFavoriteLigne(Base):
    __tablename__ = "listes_favorites_lignes"
    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    liste_id           = Column(UUID(as_uuid=True), ForeignKey("listes_favorites.id", ondelete="CASCADE"), nullable=False)
    produit_id         = Column(UUID(as_uuid=True), ForeignKey("produits.id"), nullable=False)
    quantite           = Column(Integer, default=1)
    configuration_json = Column(JSONB)
    created_at         = Column(DateTime(timezone=True), default=datetime.utcnow)
    liste              = relationship("ListeFavorite", back_populates="lignes")
    produit            = relationship("Produit")

# ── LIVREURS ──────────────────────────────────────────────────
class Livreur(Base):
    __tablename__ = "livreurs"
    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id     = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), unique=True, nullable=False)
    type_vehicule      = Column(String(50), default="moto")
    plaque             = Column(String(30))
    numero_permis      = Column(String(50))
    cni_url            = Column(Text)
    statut             = Column(String(20), default="hors_ligne")
    latitude_actuelle  = Column(Numeric(9,6))
    longitude_actuelle = Column(Numeric(9,6))
    localisation_at    = Column(DateTime(timezone=True))
    zone_couverte      = Column(String(100))
    niveau             = Column(String(20), default="junior")
    note_moyenne       = Column(Numeric(3,2), default=0.00)
    total_livraisons   = Column(Integer, default=0)
    total_gains_fcfa   = Column(Integer, default=0)
    est_verifie        = Column(Boolean, default=False)
    verifie_at         = Column(DateTime(timezone=True))
    created_at         = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at         = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    utilisateur        = relationship("Utilisateur", back_populates="livreur_profil")
    commandes          = relationship("Commande", back_populates="livreur", foreign_keys="Commande.livreur_id")
    evaluations        = relationship("Evaluation", back_populates="livreur")

# ── LIVREUR NIVEAUX CONFIG ────────────────────────────────────
class LivreurNiveauConfig(Base):
    __tablename__ = "livreur_niveaux_config"
    niveau               = Column(String(20), primary_key=True)
    livraisons_requises  = Column(Integer, nullable=False)
    note_minimale        = Column(Numeric(3,2), default=4.0)
    bonus_atteinte_fcfa  = Column(Integer, default=0)
    commission_pct       = Column(Numeric(5,2), default=10.00)
    description          = Column(Text)

# ── COMMANDES ─────────────────────────────────────────────────
class Commande(Base):
    __tablename__ = "commandes"
    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero              = Column(String(20), unique=True, nullable=False, default="")
    client_id           = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=False)
    livreur_id          = Column(UUID(as_uuid=True), ForeignKey("livreurs.id"))
    adresse_id          = Column(UUID(as_uuid=True), ForeignKey("adresses.id"))
    statut              = Column(String(30), default="brouillon")
    creneau             = Column(String(30))
    date_livraison      = Column(Date)
    sous_total_fcfa     = Column(Integer, default=0)
    frais_livraison     = Column(Integer, default=500)
    reduction_points    = Column(Integer, default=0)
    total_fcfa          = Column(Integer, default=0)
    points_gagnes       = Column(Integer, default=0)
    payee_at            = Column(DateTime(timezone=True))
    assignee_at         = Column(DateTime(timezone=True))
    marche_at           = Column(DateTime(timezone=True))
    en_livraison_at     = Column(DateTime(timezone=True))
    livree_at           = Column(DateTime(timezone=True))
    annulee_at          = Column(DateTime(timezone=True))
    photo_livraison_url = Column(Text)
    signature_url       = Column(Text)
    note_client         = Column(Text)
    created_at          = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at          = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    client   = relationship("Utilisateur", back_populates="commandes", foreign_keys=[client_id])
    livreur  = relationship("Livreur", back_populates="commandes", foreign_keys=[livreur_id])
    adresse  = relationship("Adresse")
    lignes   = relationship("CommandeLigne", back_populates="commande", cascade="all, delete-orphan")
    paiements = relationship("Paiement", back_populates="commande")
    evaluation = relationship("Evaluation", back_populates="commande", uselist=False)

# ── LIGNES COMMANDE ───────────────────────────────────────────
class CommandeLigne(Base):
    __tablename__ = "commandes_lignes"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commande_id   = Column(UUID(as_uuid=True), ForeignKey("commandes.id", ondelete="CASCADE"), nullable=False)
    produit_id    = Column(UUID(as_uuid=True), ForeignKey("produits.id"), nullable=False)
    section_id    = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False)
    quantite      = Column(Integer, default=1)
    prix_unitaire = Column(Integer, nullable=False)
    prix_total    = Column(Integer, nullable=False)
    note_ligne    = Column(Text)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)
    commande      = relationship("Commande", back_populates="lignes")
    produit       = relationship("Produit")
    section       = relationship("Section")
    ingredients_cmd = relationship("CommandeIngredient", back_populates="ligne", cascade="all, delete-orphan")

# ── COMMANDES INGRÉDIENTS ─────────────────────────────────────
class CommandeIngredient(Base):
    __tablename__ = "commandes_ingredients"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ligne_id      = Column(UUID(as_uuid=True), ForeignKey("commandes_lignes.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False)
    quantite      = Column(Numeric(8,2), default=1)
    unite         = Column(String(20), default="unite")
    prix_choisi   = Column(Integer, default=0)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)
    ligne         = relationship("CommandeLigne", back_populates="ingredients_cmd")
    ingredient    = relationship("Ingredient")

# ── PAIEMENTS ─────────────────────────────────────────────────
class Paiement(Base):
    __tablename__ = "paiements"
    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commande_id         = Column(UUID(as_uuid=True), ForeignKey("commandes.id"), nullable=False)
    mode                = Column(String(30), nullable=False)
    montant_fcfa        = Column(Integer, nullable=False)
    statut              = Column(String(20), default="initie")
    operateur           = Column(String(20))
    telephone_paiement  = Column(String(20))
    reference_externe   = Column(String(100))
    reponse_json        = Column(JSONB)
    initie_at           = Column(DateTime(timezone=True), default=datetime.utcnow)
    confirme_at         = Column(DateTime(timezone=True))
    echoue_at           = Column(DateTime(timezone=True))
    created_at          = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at          = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    commande            = relationship("Commande", back_populates="paiements")

# ── FIDÉLITÉ COMPTES ──────────────────────────────────────────
class FideliteCompte(Base):
    __tablename__ = "fidelite_comptes"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), unique=True, nullable=False)
    points_actuels = Column(Integer, default=0)
    points_totaux  = Column(Integer, default=0)
    niveau         = Column(String(20), default="bronze")
    created_at     = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at     = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    utilisateur    = relationship("Utilisateur", back_populates="fidelite")
    transactions   = relationship("FideliteTransaction", back_populates="compte")

class FideliteTransaction(Base):
    __tablename__ = "fidelite_transactions"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    compte_id   = Column(UUID(as_uuid=True), ForeignKey("fidelite_comptes.id", ondelete="CASCADE"), nullable=False)
    type        = Column(String(40), nullable=False)
    points      = Column(Integer, nullable=False)
    solde_apres = Column(Integer, nullable=False)
    commande_id = Column(UUID(as_uuid=True), ForeignKey("commandes.id"))
    description = Column(String(200))
    expire_at   = Column(DateTime(timezone=True))
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    compte      = relationship("FideliteCompte", back_populates="transactions")

class FideliteRecompense(Base):
    __tablename__ = "fidelite_recompenses"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom             = Column(String(120), nullable=False)
    description     = Column(Text)
    cout_points     = Column(Integer, nullable=False)
    niveau_requis   = Column(String(20), default="bronze")
    type_avantage   = Column(String(50), nullable=False)
    valeur_avantage = Column(Numeric(8,2))
    icone           = Column(String(10))
    actif           = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

# ── ÉVALUATIONS ───────────────────────────────────────────────
class Evaluation(Base):
    __tablename__ = "evaluations"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commande_id = Column(UUID(as_uuid=True), ForeignKey("commandes.id"), unique=True, nullable=False)
    client_id   = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=False)
    livreur_id  = Column(UUID(as_uuid=True), ForeignKey("livreurs.id"), nullable=False)
    note        = Column(SmallInteger, nullable=False)
    commentaire = Column(Text)
    signale     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    commande    = relationship("Commande", back_populates="evaluation")
    livreur     = relationship("Livreur", back_populates="evaluations")

# ── NOTIFICATIONS ─────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    destinataire_id = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False)
    type            = Column(String(50), nullable=False)
    canal           = Column(String(20), default="in_app")
    titre           = Column(String(150), nullable=False)
    corps           = Column(Text)
    donnees_json    = Column(JSONB)
    lue             = Column(Boolean, default=False)
    envoyee         = Column(Boolean, default=False)
    envoyee_at      = Column(DateTime(timezone=True))
    lue_at          = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)
    destinataire    = relationship("Utilisateur", back_populates="notifications")

# ── PARAMÈTRES ────────────────────────────────────────────────
class Parametre(Base):
    __tablename__ = "parametres"
    cle              = Column(String(100), primary_key=True)
    valeur           = Column(Text, nullable=False)
    type_valeur      = Column(String(20), default="string")
    description      = Column(String(300))
    modifiable_admin = Column(Boolean, default=True)
    updated_at       = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

# ── SUGGESTIONS PRODUITS ───────────────────────────────────────
class SuggestionProduit(Base):
    __tablename__ = "suggestions_produits"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id        = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False)
    section_id       = Column(UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False)
    nom              = Column(String(120), nullable=False)
    description      = Column(Text)
    prix_suggere_fcfa= Column(Integer)
    image_url        = Column(Text)
    statut           = Column(String(20), default="en_attente")  # en_attente, approuvee, rejetee
    note_admin       = Column(Text)
    produit_cree_id  = Column(UUID(as_uuid=True), ForeignKey("produits.id"), nullable=True)
    votes            = Column(Integer, default=1)
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at       = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    client           = relationship("Utilisateur")
    section          = relationship("Section")

# ── VOTES SUGGESTIONS ─────────────────────────────────────────
class VoteSuggestion(Base):
    __tablename__ = "votes_suggestions"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    suggestion_id = Column(UUID(as_uuid=True), ForeignKey("suggestions_produits.id", ondelete="CASCADE"), nullable=False)
    client_id     = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)

# ── HISTORIQUE PRIX ────────────────────────────────────────────
class HistoriquePrix(Base):
    __tablename__ = "historique_prix"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    produit_id   = Column(UUID(as_uuid=True), ForeignKey("produits.id", ondelete="CASCADE"), nullable=False)
    admin_id     = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=True)
    ancien_prix  = Column(Integer, nullable=False)
    nouveau_prix = Column(Integer, nullable=False)
    variation_pct= Column(Numeric(6, 2))
    raison       = Column(String(200))
    created_at   = Column(DateTime(timezone=True), default=datetime.utcnow)
    produit      = relationship("Produit")
