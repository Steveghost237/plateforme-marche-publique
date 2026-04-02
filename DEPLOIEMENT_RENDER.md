# 🚀 Guide de Déploiement sur Render.com

## 📋 Prérequis

- Compte GitHub avec le projet ComeBuy
- Compte Render.com (gratuit) : https://render.com
- Email : **comebuy237@gmail.com**

## 🎯 Étapes de Déploiement

### 1. Créer un compte Render.com

1. Aller sur https://render.com
2. Cliquer sur **"Get Started"**
3. S'inscrire avec **comebuy237@gmail.com**
4. Vérifier l'email de confirmation

### 2. Connecter GitHub à Render

1. Dans le dashboard Render, cliquer sur **"New +"**
2. Sélectionner **"Blueprint"**
3. Connecter votre compte GitHub
4. Autoriser Render à accéder à vos dépôts
5. Sélectionner le dépôt **"plateforme-marche-publique"**

### 3. Configuration Automatique

Render détectera automatiquement le fichier `render.yaml` et créera :

- ✅ **Service Web** : `comebuy-api` (Backend FastAPI)
- ✅ **Base de données** : `comebuy-db` (PostgreSQL gratuit)

### 4. Variables d'Environnement (automatiques)

Les variables suivantes seront configurées automatiquement :

```env
DATABASE_URL=postgresql://... (généré automatiquement)
SECRET_KEY=... (généré automatiquement)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=*
```

### 5. Déploiement

1. Cliquer sur **"Apply"** pour démarrer le déploiement
2. Attendre 5-10 minutes pour le premier déploiement
3. Render va :
   - Installer les dépendances Python
   - Créer la base de données PostgreSQL
   - Exécuter `create_tables_and_seed.py`
   - Démarrer le serveur Uvicorn

### 6. Récupérer l'URL de l'API

Une fois déployé, vous obtiendrez une URL comme :
```
https://comebuy-api.onrender.com
```

### 7. Mettre à jour l'application mobile

Modifier `mobile/lib/config/api_config.dart` :

```dart
class ApiConfig {
  static const String baseUrl = 'https://comebuy-api.onrender.com/api';
}
```

Puis reconstruire l'APK :
```bash
cd mobile
flutter build apk --release
```

## 🔧 Configuration Avancée (Optionnel)

### Ajouter des variables d'environnement supplémentaires

Dans le dashboard Render :
1. Aller dans **Environment**
2. Ajouter les variables nécessaires (ex: clés API Africa's Talking)

### Activer les logs

1. Aller dans **Logs** dans le dashboard
2. Voir les logs en temps réel

### Configurer un domaine personnalisé

1. Aller dans **Settings** > **Custom Domain**
2. Ajouter votre domaine (ex: api.comebuy.cm)

## 📊 Limites du Plan Gratuit

- ✅ 750 heures/mois (suffisant pour 1 service)
- ✅ PostgreSQL gratuit (256 MB RAM, 1 GB stockage)
- ✅ SSL automatique
- ⚠️ Le service s'endort après 15 min d'inactivité
- ⚠️ Premier démarrage après sommeil : ~30 secondes

## 🔄 Déploiements Automatiques

Chaque fois que vous pushez sur la branche `main`, Render redéploiera automatiquement l'application.

## 🆘 Dépannage

### Erreur de connexion à la base de données
- Vérifier que `DATABASE_URL` est bien configuré
- Vérifier les logs dans le dashboard Render

### Service qui ne démarre pas
- Vérifier les logs pour voir l'erreur
- S'assurer que `requirements.txt` est à jour

### Migrations de base de données
Si vous modifiez les modèles :
```bash
# Localement
alembic revision --autogenerate -m "description"
alembic upgrade head

# Puis push sur GitHub
git add .
git commit -m "Database migration"
git push
```

## 📞 Support

- Documentation Render : https://render.com/docs
- Email support : comebuy237@gmail.com

## ✅ Checklist de Déploiement

- [ ] Compte Render créé avec comebuy237@gmail.com
- [ ] Dépôt GitHub connecté à Render
- [ ] Blueprint déployé avec succès
- [ ] Base de données PostgreSQL créée
- [ ] URL de l'API récupérée
- [ ] Application mobile mise à jour avec la nouvelle URL
- [ ] APK reconstruit et testé
- [ ] Connexion au backend fonctionnelle

---

**Prêt à déployer ! 🚀**
