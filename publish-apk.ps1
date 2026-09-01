# publish-apk.ps1 - Publie l'APK ComeBuy sur GitHub Releases
# Usage : .\publish-apk.ps1
#         .\publish-apk.ps1 -Notes "Correction paiement Orange Money"
param(
    [string]$Notes = ""
)

$APK_SRC = "C:\comebuy\build\app\outputs\flutter-apk\app-release.apk"
$PUBSPEC  = Join-Path $PSScriptRoot "mobile\pubspec.yaml"
$REPO     = "Steveghost237/plateforme-marche-publique"

# Verifications
if (-not (Test-Path $APK_SRC)) {
    Write-Host "ERREUR: APK introuvable : $APK_SRC" -ForegroundColor Red
    Write-Host "Lance d'abord depuis C:\comebuy : flutter build apk --release" -ForegroundColor Yellow
    exit 1
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "ERREUR: GitHub CLI (gh) non installe." -ForegroundColor Red
    exit 1
}

# Recuperer le token GitHub depuis le credential store de git
if (-not $env:GH_TOKEN) {
    try {
        $credInput  = "protocol=https`nhost=github.com`n`n"
        $credOutput = ($credInput | git credential fill 2>$null) -join "`n"
        $tokenLine  = ($credOutput -split "`n") | Where-Object { $_ -match "^password=" } | Select-Object -First 1
        if ($tokenLine -match "^password=(.+)") {
            $env:GH_TOKEN = $Matches[1].Trim()
            Write-Host "  Token GitHub recupere depuis git credentials." -ForegroundColor Green
        }
    } catch {}
}

if (-not $env:GH_TOKEN) {
    Write-Host ""
    Write-Host "Authentification requise. Connexion a GitHub..." -ForegroundColor Yellow
    gh auth login -h github.com -p https --web
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR: Authentification echouee." -ForegroundColor Red
        exit 1
    }
}

# Lire la version depuis pubspec.yaml
$versionLine = Get-Content $PUBSPEC | Where-Object { $_ -match "^version:" } | Select-Object -First 1
$version = "1.0.0+1"
if ($versionLine -match "version:\s*(.+)") {
    $version = $Matches[1].Trim()
}

$APK_SIZE_MB = [math]::Round((Get-Item $APK_SRC).Length / 1MB, 1)
$releaseDate = Get-Date -Format "dd/MM/yyyy HH:mm"

Write-Host ""
Write-Host "== Publication APK ComeBuy ==" -ForegroundColor Cyan
Write-Host "  Version : $version"
Write-Host "  APK     : $APK_SIZE_MB MB"
Write-Host "  Repo    : $REPO"
Write-Host ""

# Construire les notes de release
$installSteps = @"
## ComeBuy $version

Publie le $releaseDate

### Installation Android
1. Telechargez **app-release.apk** ci-dessous
2. Sur Android : Parametres > Securite > Sources inconnues (activer)
3. Ouvrez le fichier APK telecharge pour installer
"@

if ($Notes -ne "") {
    $installSteps = "## ComeBuy $version`n`nPublie le $releaseDate`n`n### Changements`n$Notes`n`n### Installation Android`n1. Telechargez **app-release.apk** ci-dessous`n2. Activez Sources inconnues sur Android`n3. Ouvrez le fichier APK pour installer"
}

# Supprimer l'ancienne release "latest" si elle existe
Write-Host "Suppression de l'ancienne release latest..." -ForegroundColor Yellow
gh release delete latest --repo $REPO --yes 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - ancienne release supprimee" -ForegroundColor Green
} else {
    Write-Host "  (aucune release precedente)" -ForegroundColor Gray
}

# Supprimer le tag distant s'il existe
git push origin ":refs/tags/latest" 2>$null

# Creer la nouvelle release
Write-Host ""
Write-Host "Creation de la release GitHub..." -ForegroundColor Yellow

$apkArg = $APK_SRC + "#app-release.apk"
gh release create latest $apkArg --repo $REPO --title "ComeBuy $version" --notes $installSteps --latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors de la creation de la release." -ForegroundColor Red
    exit 1
}

$dlUrl = "https://github.com/$REPO/releases/latest/download/app-release.apk"
Write-Host ""
Write-Host "== APK publie avec succes ! ==" -ForegroundColor Green
Write-Host ""
Write-Host "Lien de telechargement direct :" -ForegroundColor Cyan
Write-Host "  $dlUrl" -ForegroundColor White
Write-Host ""
Write-Host "Page Releases :" -ForegroundColor Cyan
Write-Host "  https://github.com/$REPO/releases/latest" -ForegroundColor White
Write-Host ""
