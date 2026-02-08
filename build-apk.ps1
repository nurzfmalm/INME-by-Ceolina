# build-apk.ps1 - Build and sign APK
param(
    [string]$KeystorePath = "my-release-key.jks",
    [string]$KeyAlias = "my-key-alias",
    [string]$ApkName = "inme-ai"
)

# Find build-tools
$BuildTools = Get-ChildItem "$env:ANDROID_HOME\build-tools" | Sort-Object Name -Descending | Select-Object -First 1
if (-not $BuildTools) {
    Write-Host "ERROR: build-tools not found! Check ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Red
    exit 1
}
Write-Host "Using build-tools: $($BuildTools.Name)" -ForegroundColor DarkGray

# --- Step 1 ---
Write-Host "`nStep 1: Building web app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Build failed!" -ForegroundColor Red; exit 1 }

# --- Step 2 ---
Write-Host "`nStep 2: Syncing Capacitor..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Sync failed!" -ForegroundColor Red; exit 1 }

# --- Step 3 ---
Write-Host "`nStep 3: Building APK via Gradle..." -ForegroundColor Cyan
Push-Location android
./gradlew assembleRelease
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { Write-Host "ERROR: Gradle build failed!" -ForegroundColor Red; exit 1 }

$UnsignedApk = "android\app\build\outputs\apk\release\app-release-unsigned.apk"
$AlignedApk = "$ApkName-aligned.apk"
$SignedApk = "$ApkName-signed.apk"

if (-not (Test-Path $UnsignedApk)) {
    Write-Host "ERROR: APK not found: $UnsignedApk" -ForegroundColor Red
    exit 1
}

# --- Step 4 ---
Write-Host "`nStep 4: Aligning (zipalign)..." -ForegroundColor Cyan
$zipalign = Join-Path $BuildTools.FullName "zipalign.exe"
& $zipalign -v -p 4 $UnsignedApk $AlignedApk
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: zipalign failed!" -ForegroundColor Red; exit 1 }

# --- Step 5 ---
Write-Host "`nStep 5: Signing APK (apksigner)..." -ForegroundColor Cyan
$apksigner = Join-Path $BuildTools.FullName "apksigner.bat"
& $apksigner sign --ks $KeystorePath --ks-key-alias $KeyAlias --out $SignedApk $AlignedApk
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Signing failed!" -ForegroundColor Red; exit 1 }

# --- Done ---
$apkSize = [math]::Round((Get-Item $SignedApk).Length / 1MB, 2)
Write-Host "`nDONE! Signed APK: $SignedApk" -ForegroundColor Green
Write-Host "Size: $apkSize MB" -ForegroundColor Green
