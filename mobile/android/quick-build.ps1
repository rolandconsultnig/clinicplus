# Quick Build Script for Clinic+ Patient App APK
# This script attempts to build the APK using available tools

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Clinic+ Patient App - APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$wrapperJar = "gradle\wrapper\gradle-wrapper.jar"

# Check if gradle wrapper exists
if (-not (Test-Path $wrapperJar)) {
    Write-Host "Gradle wrapper JAR not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download gradle-wrapper.jar manually:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://raw.githubusercontent.com/gradle/gradle/v8.3.0/gradle/wrapper/gradle-wrapper.jar" -ForegroundColor Cyan
    Write-Host "2. Save to: $PWD\$wrapperJar" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use one of these alternatives:" -ForegroundColor Yellow
    Write-Host "  - Use Android Studio to build" -ForegroundColor White
    Write-Host "  - Use: npx react-native run-android" -ForegroundColor White
    Write-Host "  - Install Gradle globally and run: gradle wrapper" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check Java
Write-Host "Checking Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✓ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Java not found. Please install JDK 17 or higher" -ForegroundColor Red
    exit 1
}

# Clean previous builds
Write-Host ""
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
.\gradlew.bat clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Clean failed" -ForegroundColor Red
    exit 1
}

# Build Debug APK
Write-Host ""
Write-Host "Building Debug APK (this may take several minutes)..." -ForegroundColor Yellow
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Check if APK was created
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ APK Build Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK Location: $PWD\$apkPath" -ForegroundColor Cyan
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

