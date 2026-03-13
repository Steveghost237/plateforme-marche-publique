# 🏪 Marché en Ligne — Cameroun

Plateforme de marché en ligne avec livraison à domicile.
**Backend** : Python 3.11 + FastAPI · **Frontend** : React 18 + Tailwind CSS · **DB** : PostgreSQL 15

---

## 🚀 Installation en 5 étapes

### 1. Base de données PostgreSQL
```bash
# Créer la base
psql -U postgres -c "CREATE DATABASE marche_db ENCODING 'UTF8';"

# Importer le schéma complet (28 tables + données initiales)
psql -U postgres -d marche_db -f marche_database_v2.sql
```

### 2. Backend Python (FastAPI)
```bash
cd backend

# Environnement virtuel
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Dépendances
pip install -r requirements.txt

# Configuration
cp .env.example .env
# Éditer .env → mettre DATABASE_URL, SECRET_KEY

# Démarrer
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend React
```bash
cd frontend

# Dépendances
npm install

# Démarrer
npm run dev
```

### 4. Accès
| Service      | URL                              |
|--------------|----------------------------------|
| Frontend     | http://localhost:5173            |
| API Swagger  | http://localhost:8000/docs       |
| API ReDoc    | http://localhost:8000/redoc      |
| Health check | http://localhost:8000/health     |

### 5. Compte admin par défaut
| Champ       | Valeur              |
|-------------|---------------------|
| Téléphone   | +237600000000       |
| Mot de passe| Admin@2026!         |

---

## 🏗️ Architecture du projet

```
marche/
├── marche_database_v2.sql    ← Schéma PostgreSQL complet
│
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── main.py           ← Point d'entrée FastAPI
│       ├── core/
│       │   ├── config.py     ← Configuration (env vars)
│       │   ├── database.py   ← Connexion SQLAlchemy
│       │   └── security.py   ← JWT + hachage mdp
│       ├── models/
│       │   └── models.py     ← 28 modèles SQLAlchemy
│       ├── schemas/
│       │   └── schemas.py    ← Schémas Pydantic (validation)
│       └── api/
│           ├── auth.py       ← /api/auth (OTP, JWT, profil)
│           └── routes.py     ← Toutes les autres routes
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx          ← Point d'entrée React
        ├── App.jsx           ← Router + routes protégées
        ├── styles/
        │   └── globals.css   ← Tailwind + composants CSS
        ├── utils/
        │   └── api.js        ← Axios + auto-refresh token
        ├── store/
        │   └── index.js      ← Zustand (auth + panier)
        ├── components/
        │   └── common/
        │       ├── Navbar.jsx
        │       └── Footer.jsx
        └── pages/
            ├── Accueil.jsx   ← Page d'accueil
            ├── Auth.jsx      ← Connexion + Inscription (3 étapes OTP)
            ├── Catalogue.jsx ← Liste produits + détail + recherche
            ├── Panier.jsx    ← Panier + Checkout (3 étapes)
            ├── Compte.jsx    ← Profil, Commandes, Fidélité, Notifs
            ├── Admin.jsx     ← Dashboard admin
            └── Livreur.jsx   ← Espace livreur
```

---

## 🔌 API Endpoints

### Authentification
```
POST /api/auth/inscription/otp       → Demander OTP
POST /api/auth/inscription/verifier  → Vérifier OTP
POST /api/auth/inscription/finaliser → Finaliser profil
POST /api/auth/connexion             → Connexion
POST /api/auth/refresh               → Refresh token
GET  /api/auth/me                    → Profil actuel
PUT  /api/auth/me                    → Modifier profil
```

### Catalogue
```
GET  /api/catalogue/sections         → 5 sections
GET  /api/catalogue/produits         → Liste (filtres: section, populaire, q)
GET  /api/catalogue/produits/{slug}  → Détail + ingrédients
POST /api/catalogue/produits         → Créer (admin)
PUT  /api/catalogue/produits/{id}    → Modifier (admin)
```

### Commandes
```
POST /api/commandes/                    → Créer commande
GET  /api/commandes/mes-commandes       → Mes commandes
GET  /api/commandes/{id}                → Détail commande
POST /api/commandes/{id}/payer          → Confirmer paiement
POST /api/commandes/{id}/annuler        → Annuler
POST /api/commandes/{id}/evaluer        → Évaluer livreur
GET  /api/commandes/livreur/disponibles → Commandes dispo (livreur)
POST /api/commandes/{id}/accepter       → Accepter (livreur)
POST /api/commandes/{id}/statut         → Changer statut (livreur)
```

### Fidélité
```
GET /api/fidelite/compte        → Solde & niveau
GET /api/fidelite/transactions  → Historique points
GET /api/fidelite/recompenses   → Catalogue récompenses
```

### Admin
```
GET /api/admin/dashboard              → KPIs du jour
GET /api/admin/commandes              → Toutes les commandes
GET /api/admin/livreurs               → Tous les livreurs
GET /api/admin/utilisateurs           → Tous les utilisateurs
GET /api/admin/stats                  → Stats produits
PUT /api/admin/commandes/{id}/assigner/{livreur_id}
GET /api/admin/parametres             → Config plateforme
PUT /api/admin/parametres/{cle}       → Modifier config
```

---

## 💡 Fonctionnalités

### Module Client
- ✅ Inscription avec OTP par SMS (3 étapes)
- ✅ Connexion sécurisée JWT (access + refresh tokens)
- ✅ Catalogue avec 5 sections et filtres
- ✅ Personnalisation des ingrédients (slider, quantité, toggle)
- ✅ Panier persistant (localStorage via Zustand)
- ✅ Commande en 3 étapes (adresse → créneau → paiement)
- ✅ MTN Mobile Money, Orange Money, Espèces
- ✅ Suivi des commandes en temps réel
- ✅ Programme fidélité Bronze/Argent/Or/VIP
- ✅ Notifications in-app
- ✅ Évaluation des livreurs (1-5 étoiles)

### Module Livreur
- ✅ Dashboard avec toggle disponible/hors ligne
- ✅ Liste des commandes disponibles
- ✅ Acceptation et suivi de commande
- ✅ Changement de statut (marché → livraison → livré)
- ✅ Historique des livraisons
- ✅ Progression Junior → Sénior → Expert → Élite

### Module Admin
- ✅ Dashboard KPIs temps réel
- ✅ Tableau des commandes récentes
- ✅ Gestion des livreurs
- ✅ Gestion des clients
- ✅ Statistiques produits
- ✅ Configuration de la plateforme

---

## 🛠️ Stack Technique

| Couche     | Technologie                        |
|------------|------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Zustand |
| Backend    | Python 3.11, FastAPI, SQLAlchemy   |
| Base de données | PostgreSQL 15                 |
| Auth       | JWT (python-jose) + bcrypt         |
| SMS OTP    | AfricasTalking (à configurer)      |
| Fonts      | Cormorant Garamond + Jost          |

---

## 📞 Contact
- Email : contact@marche.cm
- WhatsApp : +237 6XX XXX XXX
