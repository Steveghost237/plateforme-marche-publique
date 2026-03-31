# Migration du branding vers ComeBuy

## ✅ Modifications effectuées automatiquement

### Frontend Web

1. **Navbar** (`frontend/src/components/common/Navbar.jsx`)
   - Logo remplacé par `<img src="/logo-comebuy.png" alt="ComeBuy Logo" />`
   - Ancien logo SVG et texte "MARCHÉ.CM" supprimés

2. **Footer** (`frontend/src/components/common/Footer.jsx`)
   - Logo remplacé par l'image ComeBuy
   - Email mis à jour : `contact@comebuy.cm`
   - Copyright mis à jour : "© 2026 ComeBuy · Cameroun"

3. **index.html** (`frontend/index.html`)
   - Titre : "ComeBuy — Livraison de produits alimentaires à domicile au Cameroun"
   - Métadonnées SEO complètes ajoutées :
     - Description optimisée pour le référencement
     - Keywords : livraison à domicile Cameroun, courses en ligne, menus camerounais, etc.
     - Favicon pointant vers `/logo-comebuy.png`
   - Open Graph tags pour le partage sur réseaux sociaux
   - Twitter Card tags

### Application Mobile

4. **pubspec.yaml** (`mobile/pubspec.yaml`)
   - Nom du package : `comebuy_mobile`
   - Description : "ComeBuy - Livraison de produits alimentaires à domicile au Cameroun"
   - Assets ajoutés : `assets/images/logo-comebuy.png`

5. **AndroidManifest.xml** (`mobile/android/app/src/main/AndroidManifest.xml`)
   - Label de l'application : "ComeBuy"

6. **Tests** (`mobile/test/widget_test.dart`)
   - Import mis à jour : `package:comebuy_mobile/main.dart`

---

## ⏳ Actions manuelles requises

### 1. Sauvegarder le logo ComeBuy

Vous devez sauvegarder l'image du logo que vous avez fournie dans les emplacements suivants :

#### Pour le frontend web :
```
C:\Users\Albert WIB\Desktop\plate forme de marché publique\frontend\public\logo-comebuy.png
```

#### Pour l'application mobile :
```
C:\Users\Albert WIB\Desktop\plate forme de marché publique\mobile\assets\images\logo-comebuy.png
```

**Instructions :**
1. Sauvegardez l'image du logo (panier rouge avec "ComeBuy") depuis votre conversation
2. Renommez-la en `logo-comebuy.png`
3. Placez-la dans les deux dossiers mentionnés ci-dessus

### 2. Redémarrer les serveurs

Après avoir placé les logos, redémarrez les serveurs pour voir les changements :

#### Frontend :
```bash
cd frontend
npm run dev
```

#### Backend (si nécessaire) :
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 3. Vider le cache du navigateur

Pour voir les changements immédiatement :
- Appuyez sur **Ctrl + Shift + Delete**
- Cochez "Images et fichiers en cache"
- Cliquez sur "Effacer les données"
- Actualisez avec **Ctrl + Shift + R**

Ou ouvrez une fenêtre de navigation privée (Ctrl + Shift + N)

---

## 🔍 Optimisations SEO appliquées

### Métadonnées principales
- **Title** : ComeBuy — Livraison de produits alimentaires à domicile au Cameroun
- **Description** : Optimisée avec mots-clés pertinents (livraison, Yaoundé, Douala, menus camerounais)
- **Keywords** : livraison à domicile Cameroun, courses en ligne Yaoundé, produits alimentaires Douala, menus camerounais, fruits frais, épicerie en ligne, ComeBuy

### Open Graph (Facebook, LinkedIn, etc.)
- Titre, description et image configurés pour un partage optimal sur les réseaux sociaux

### Twitter Card
- Configuration pour affichage optimisé lors du partage sur Twitter

### Favicon
- Pointe vers le logo ComeBuy pour l'affichage dans l'onglet du navigateur

---

## 📱 Application Mobile

### Changements de nom
- Package : `marche_mobile` → `comebuy_mobile`
- Label Android : "Marché en Ligne" → "ComeBuy"

### Pour compiler l'application mobile après les changements :

```bash
cd mobile
flutter pub get
flutter build apk --release  # Pour Android
```

---

## 🎨 Emplacements du logo dans le code

Le logo est référencé dans les fichiers suivants :

1. **Frontend Navbar** : `/logo-comebuy.png`
2. **Frontend Footer** : `/logo-comebuy.png`
3. **Frontend index.html** : `/logo-comebuy.png` (favicon et Open Graph)
4. **Mobile** : `assets/images/logo-comebuy.png`

---

## ✨ Résultat attendu

Une fois les logos placés et les serveurs redémarrés, vous verrez :

- ✅ Le logo ComeBuy (panier rouge) dans la barre de navigation
- ✅ Le logo ComeBuy dans le footer
- ✅ Le nom "ComeBuy" dans l'onglet du navigateur
- ✅ Les métadonnées SEO optimisées pour le référencement Google
- ✅ L'application mobile nommée "ComeBuy"
- ✅ Partage optimisé sur les réseaux sociaux avec le logo

---

## 📝 Notes importantes

1. **Pas de modification du code backend** : Les modifications sont uniquement visuelles et SEO
2. **Compatibilité** : Toutes les fonctionnalités existantes restent intactes
3. **Responsive** : Le logo s'adapte automatiquement à toutes les tailles d'écran
4. **Performance** : Le logo est chargé de manière optimisée

---

Date de migration : 31 mars 2026
