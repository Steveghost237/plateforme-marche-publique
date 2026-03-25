# 📱 Marché en Ligne - Application Mobile Flutter

Application mobile Flutter pour la plateforme de marché en ligne camerounaise avec backend FastAPI.

## ✨ Fonctionnalités

### 👤 Client
- ✅ Authentification (connexion/inscription)
- 🛒 Catalogue de produits avec recherche et filtres par section
- 🛍️ Panier d'achat avec gestion des quantités
- 💳 Passage de commande avec choix du créneau de livraison
- 📦 Suivi des commandes en temps réel
- 📞 **Contact direct avec le livreur** (appel/SMS) une fois assigné
- 👤 Profil utilisateur

### 🚴 Livreur
- 📋 Liste des commandes disponibles
- ✅ Acceptation de commandes
- 📱 **Affichage du contact client** (nom, téléphone, adresse)
- 📞 **Appel/SMS direct au client**
- 🔄 Mise à jour du statut de livraison (Au marché → En route → Livré)
- 📊 Historique des livraisons

## 🏗️ Architecture

```
mobile/
├── lib/
│   ├── config/          # Configuration API
│   ├── models/          # Modèles de données (User, Produit, Commande)
│   ├── providers/       # State management (Auth, Cart)
│   ├── screens/         # Écrans de l'application
│   │   ├── splash_screen.dart
│   │   ├── login_screen.dart
│   │   ├── register_screen.dart
│   │   ├── home_screen.dart
│   │   ├── catalogue_screen.dart
│   │   ├── cart_screen.dart
│   │   ├── checkout_screen.dart
│   │   ├── orders_screen.dart
│   │   ├── order_detail_screen.dart
│   │   ├── profile_screen.dart
│   │   └── livreur_screen.dart
│   ├── services/        # Services API
│   └── main.dart
└── android/             # Configuration Android
```

## 🔧 Configuration

### Backend API
Modifiez l'URL du backend dans `lib/config/api_config.dart` :

```dart
static const String baseUrl = 'http://10.0.2.2:8000/api';  // Android Emulator
// ou
static const String baseUrl = 'http://192.168.x.x:8000/api';  // Device physique
```

### Comptes de test
- **Client** : `+237611111111` / `Admin@2026!`
- **Livreur** : `+237622222222` / `Admin@2026!`
- **Admin** : `+237600000000` / `Admin@2026!`

## 📦 Installation

### Prérequis
- Flutter SDK 3.24.2 ou supérieur
- Android Studio / Xcode
- Un émulateur Android ou iOS / Device physique

### Étapes

1. **Installer les dépendances**
```bash
cd mobile
flutter pub get
```

2. **Lancer l'application**
```bash
# Sur émulateur/device Android
flutter run

# Sur émulateur/device iOS
flutter run
```

## 🔨 Génération APK/IPA

### Android APK

**⚠️ Important** : Le projet contient des caractères non-ASCII dans le chemin. Assurez-vous que `android/gradle.properties` contient :
```properties
android.overridePathCheck=true
```

**Option 1 : APK standard**
```bash
flutter build apk --release
```

**Option 2 : APK split par ABI (taille réduite)**
```bash
flutter build apk --split-per-abi --release
```

L'APK sera généré dans : `build/app/outputs/flutter-apk/app-release.apk`

### iOS IPA

**Prérequis** : macOS avec Xcode installé

```bash
flutter build ios --release
```

Ensuite, ouvrez le projet dans Xcode et archivez pour générer l'IPA :
```bash
open ios/Runner.xcworkspace
```

## 🐛 Résolution des problèmes

### Erreur Gradle "flutter property not found"

Si vous rencontrez cette erreur lors du build Android, mettez à jour Flutter :
```bash
flutter upgrade
flutter clean
flutter pub get
flutter build apk --release
```

### Erreur "Non-ASCII characters in path"

Ajoutez dans `android/gradle.properties` :
```properties
android.overridePathCheck=true
```

### Problèmes de connexion au backend

1. Vérifiez que le backend est lancé sur `http://127.0.0.1:8000`
2. Pour Android Emulator, utilisez `10.0.2.2` au lieu de `localhost`
3. Pour device physique, utilisez l'IP locale de votre machine
4. Assurez-vous que `android:usesCleartextTraffic="true"` est dans AndroidManifest.xml

## 📱 Permissions Android

L'application demande les permissions suivantes :
- `INTERNET` - Connexion au backend
- `ACCESS_NETWORK_STATE` - Vérification de la connectivité
- `ACCESS_FINE_LOCATION` - Localisation pour la livraison
- `ACCESS_COARSE_LOCATION` - Localisation approximative
- `CALL_PHONE` - Appel direct au livreur/client

## 🎨 Thème

Couleurs principales :
- **Primary (Navy)** : `#0D2137`
- **Secondary (Amber)** : `#FBBF24`
- **Background** : `#F5EFE6`

## 📚 Dépendances principales

- `provider` - State management
- `http` - Requêtes API
- `shared_preferences` - Stockage local
- `cached_network_image` - Cache d'images
- `url_launcher` - Appels téléphoniques et SMS
- `intl` - Formatage des dates
- `geolocator` - Géolocalisation
- `google_maps_flutter` - Cartes (optionnel)

## 🚀 Prochaines étapes

- [ ] Implémenter la géolocalisation en temps réel
- [ ] Ajouter les notifications push
- [ ] Intégrer Google Maps pour le suivi
- [ ] Ajouter le paiement mobile money
- [ ] Implémenter le mode hors ligne

## 📄 Licence

Ce projet fait partie de la plateforme Marché en Ligne.
