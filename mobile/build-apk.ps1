# PowerShell script to build Android APK for Clinic+ Patient App
# For Android 10 (API 29) and above

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clinic+ Patient App - APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the mobile directory
if (-not (Test-Path "android")) {
    Write-Host "Error: This script must be run from the mobile directory" -ForegroundColor Red
    exit 1
}

# Check for Java
Write-Host "Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✓ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Java not found. Please install JDK 17 or higher" -ForegroundColor Red
    exit 1
}

# Check for Android SDK
Write-Host "Checking Android SDK..." -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "✓ ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "✗ ANDROID_HOME not set. Please set it to your Android SDK path" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Build type selection
Write-Host ""
Write-Host "Select build type:" -ForegroundColor Cyan
Write-Host "1. Debug APK (for testing)"
Write-Host "2. Release APK (for production)"
$buildType = Read-Host "Enter choice (1 or 2)"

if ($buildType -eq "1") {
    $buildCommand = "assembleDebug"
    $apkPath = "android/app/build/outputs/apk/debug/app-debug.apk"
    Write-Host "Building Debug APK..." -ForegroundColor Yellow
} elseif ($buildType -eq "2") {
    $buildCommand = "assembleRelease"
    $apkPath = "android/app/build/outputs/apk/release/app-release.apk"
    Write-Host "Building Release APK..." -ForegroundColor Yellow
} else {
    Write-Host "Invalid choice. Building Debug APK..." -ForegroundColor Yellow
    $buildCommand = "assembleDebug"
    $apkPath = "android/app/build/outputs/apk/debug/app-debug.apk"
}

# Clean previous builds
Write-Host ""
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
cd android
./gradlew clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Clean failed" -ForegroundColor Red
    exit 1
}

# Build APK
Write-Host ""
Write-Host "Building APK (this may take several minutes)..." -ForegroundColor Yellow
./gradlew $buildCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

cd ..

# Check if APK was created
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ APK Build Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK Location: $apkPath" -ForegroundColor Cyan
    Write-Host "APK Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To install on device:" -ForegroundColor Yellow
    Write-Host "  adb install $apkPath" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ APK not found at expected location" -ForegroundColor Red
    Write-Host "Check build output for errors" -ForegroundColor Yellow
    exit 1
}

