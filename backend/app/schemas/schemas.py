from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime, date
from uuid import UUID

# ── AUTH ──────────────────────────────────────
class DemandeOTPIn(BaseModel):
    telephone: str
    operateur: Optional[str] = None

class VerifOTPIn(BaseModel):
    telephone: str
    otp_code: str

class FinaliserInscriptionIn(BaseModel):
    telephone: str
    nom_complet: str
    mot_de_passe: str
    email: Optional[str] = None

class ConnexionIn(BaseModel):
    telephone: str
    mot_de_passe: str
    plateforme: Optional[str] = "web"  # "web" ou "mobile"

class RefreshIn(BaseModel):
    refresh_token: str

class UtilisateurOut(BaseModel):
    id: UUID
    telephone: str
    nom_complet: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    statut: str
    created_at: datetime
    class Config: from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UtilisateurOut

class UtilisateurUpdateIn(BaseModel):
    nom_complet: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None

# ── ADRESSES ──────────────────────────────────
class AdresseIn(BaseModel):
    libelle: str = "Domicile"
    quartier: str
    ville: str = "Yaoundé"
    rue: Optional[str] = None
    porte: Optional[str] = None
    complement: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    est_par_defaut: bool = False

class AdresseOut(AdresseIn):
    id: UUID
    created_at: datetime
    class Config: from_attributes = True

# ── CATALOGUE ─────────────────────────────────
class SectionOut(BaseModel):
    id: UUID
    code: str
    nom: str
    description: Optional[str] = None
    icone: Optional[str] = None
    couleur_hex: Optional[str] = None
    ordre: int
    class Config: from_attributes = True

class IngredientOut(BaseModel):
    id: UUID
    nom: str
    description: Optional[str] = None
    est_obligatoire: bool
    type_saisie: str
    unite: str
    quantite_defaut: float
    quantite_min: float
    quantite_max: Optional[float] = None
    prix_min_fcfa: int
    prix_max_fcfa: Optional[int] = None
    prix_defaut_fcfa: int
    ordre: int
    class Config: from_attributes = True

class ProduitListOut(BaseModel):
    id: UUID
    nom: str
    slug: str
    description: Optional[str] = None
    prix_base_fcfa: int
    prix_max_fcfa: Optional[int] = None
    image_url: Optional[str] = None
    est_menu: bool
    est_populaire: bool
    est_nouveau: bool
    stock_dispo: bool
    section: SectionOut
    class Config: from_attributes = True

class ProduitOut(ProduitListOut):
    ingredients: List[IngredientOut] = []

class ProduitCreateIn(BaseModel):
    section_id: UUID
    nom: str
    slug: str
    description: Optional[str] = None
    prix_base_fcfa: int = 0
    prix_max_fcfa: Optional[int] = None
    image_url: Optional[str] = None
    est_menu: bool = False
    est_populaire: bool = False

# ── COMMANDES ─────────────────────────────────
class IngredientCmdIn(BaseModel):
    ingredient_id: UUID
    quantite: float
    unite: str = "unite"
    prix_choisi: int

class LigneCmdIn(BaseModel):
    produit_id: UUID
    section_id: UUID
    quantite: int
    prix_unitaire: int
    ingredients: List[IngredientCmdIn] = []

class CommandeCreateIn(BaseModel):
    adresse_id: UUID
    creneau: str
    date_livraison: date
    mode_paiement: str
    telephone_paiement: Optional[str] = None
    lignes: List[LigneCmdIn]
    note_client: Optional[str] = None
    poids_estime_kg: Optional[float] = 0.0

class CommandeOut(BaseModel):
    id: UUID
    numero: str
    statut: str
    creneau: Optional[str] = None
    date_livraison: Optional[date] = None
    sous_total_fcfa: int
    frais_livraison: int
    reduction_points: int
    total_fcfa: int
    points_gagnes: int
    created_at: datetime
    livree_at: Optional[datetime] = None
    class Config: from_attributes = True

class EvaluationIn(BaseModel):
    commande_id: UUID
    note: int
    commentaire: Optional[str] = None
    @field_validator("note")
    @classmethod
    def check_note(cls, v):
        if not 1 <= v <= 5: raise ValueError("Note entre 1 et 5")
        return v

# ── PAIEMENT ──────────────────────────────────
class PaiementOut(BaseModel):
    id: UUID
    mode: str
    montant_fcfa: int
    statut: str
    reference_externe: Optional[str] = None
    confirme_at: Optional[datetime] = None
    class Config: from_attributes = True

# ── FIDÉLITÉ ──────────────────────────────────
class FideliteOut(BaseModel):
    id: UUID
    points_actuels: int
    points_totaux: int
    niveau: str
    class Config: from_attributes = True

class FideliteTxOut(BaseModel):
    id: UUID
    type: str
    points: int
    solde_apres: int
    description: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

# ── NOTIFICATIONS ─────────────────────────────
class NotifOut(BaseModel):
    id: UUID
    type: str
    titre: str
    corps: Optional[str] = None
    lue: bool
    created_at: datetime
    class Config: from_attributes = True

# ── ADMIN ─────────────────────────────────────
class DashboardOut(BaseModel):
    commandes_aujourd_hui: int
    en_cours_livraison: int
    livrees_aujourd_hui: int
    annulees_aujourd_hui: int
    ca_aujourd_hui: int
    ca_mois: int
