# build-apk.ps1 — Сборка и подпись APK
param(
    [string]$KeystorePath = "my-release-key.jks",
    [string]$KeyAlias = "my-key-alias",
    [string]$ApkName = "inme-ai"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# Находим build-tools один раз
$BuildTools = Get-ChildItem "$env:ANDROID_HOME\build-tools" | Sort-Object Name -Descending | Select-Object -First 1
if (-not $BuildTools) {
    Write-Host "build-tools не найдены! Проверь ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Red
    exit 1
}
Write-Host "Используем build-tools: $($BuildTools.Name)" -ForegroundColor DarkGray

# --- Шаг 1 ---
Write-Host "`nШаг 1: Сборка веб-приложения..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Ошибка сборки!" -ForegroundColor Red; exit 1 }

# --- Шаг 2 ---
Write-Host "`nШаг 2: Синхронизация Capacitor..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "Ошибка синхронизации!" -ForegroundColor Red; exit 1 }

# --- Шаг 3 ---
Write-Host "`nШаг 3: Сборка APK через Gradle..." -ForegroundColor Cyan
Push-Location android
./gradlew assembleRelease
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { Write-Host "Ошибка Gradle!" -ForegroundColor Red; exit 1 }

$UnsignedApk = "android\app\build\outputs\apk\release\app-release-unsigned.apk"
$AlignedApk = "$ApkName-aligned.apk"
$SignedApk = "$ApkName-signed.apk"

if (-not (Test-Path $UnsignedApk)) {
    Write-Host "APK не найден: $UnsignedApk" -ForegroundColor Red
    exit 1
}

# --- Шаг 4 ---
Write-Host "`nШаг 4: Выравнивание (zipalign)..." -ForegroundColor Cyan
$zipalign = Join-Path $BuildTools.FullName "zipalign.exe"
& $zipalign -v -p 4 $UnsignedApk $AlignedApk
if ($LASTEXITCODE -ne 0) { Write-Host "Ошибка zipalign!" -ForegroundColor Red; exit 1 }

# --- Шаг 5 ---
Write-Host "`nШаг 5: Подпись APK (apksigner)..." -ForegroundColor Cyan
$apksigner = Join-Path $BuildTools.FullName "apksigner.bat"
& $apksigner sign --ks $KeystorePath --ks-key-alias $KeyAlias --out $SignedApk $AlignedApk
if ($LASTEXITCODE -ne 0) { Write-Host "Ошибка подписи!" -ForegroundColor Red; exit 1 }

# --- Готово ---
$apkSize = [math]::Round((Get-Item $SignedApk).Length / 1MB, 2)
Write-Host "`nГотово! Подписанный APK: $SignedApk" -ForegroundColor Green
Write-Host "Размер: $apkSize MB" -ForegroundColor Green
