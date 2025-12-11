#!/bin/bash

# Shell script to build Android APK for Clinic+ Patient App
# For Android 10 (API 29) and above

echo "========================================"
echo "Clinic+ Patient App - APK Builder"
echo "========================================"
echo ""

# Check if we're in the mobile directory
if [ ! -d "android" ]; then
    echo "Error: This script must be run from the mobile directory"
    exit 1
fi

# Check for Java
echo "Checking Java installation..."
if command -v java &> /dev/null; then
    java -version
    echo "✓ Java found"
else
    echo "✗ Java not found. Please install JDK 17 or higher"
    exit 1
fi

# Check for Android SDK
echo "Checking Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    echo "✗ ANDROID_HOME not set. Please set it to your Android SDK path"
    exit 1
else
    echo "✓ ANDROID_HOME: $ANDROID_HOME"
fi

# Install dependencies
echo ""
echo "Installing npm dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "✗ Failed to install dependencies"
    exit 1
fi
echo "✓ Dependencies installed"

# Build type selection
echo ""
echo "Select build type:"
echo "1. Debug APK (for testing)"
echo "2. Release APK (for production)"
read -p "Enter choice (1 or 2): " buildType

if [ "$buildType" = "1" ]; then
    buildCommand="assembleDebug"
    apkPath="android/app/build/outputs/apk/debug/app-debug.apk"
    echo "Building Debug APK..."
elif [ "$buildType" = "2" ]; then
    buildCommand="assembleRelease"
    apkPath="android/app/build/outputs/apk/release/app-release.apk"
    echo "Building Release APK..."
else
    echo "Invalid choice. Building Debug APK..."
    buildCommand="assembleDebug"
    apkPath="android/app/build/outputs/apk/debug/app-debug.apk"
fi

# Clean previous builds
echo ""
echo "Cleaning previous builds..."
cd android
./gradlew clean
if [ $? -ne 0 ]; then
    echo "✗ Clean failed"
    exit 1
fi

# Build APK
echo ""
echo "Building APK (this may take several minutes)..."
./gradlew $buildCommand
if [ $? -ne 0 ]; then
    echo "✗ Build failed"
    exit 1
fi

cd ..

# Check if APK was created
if [ -f "$apkPath" ]; then
    apkSize=$(du -h "$apkPath" | cut -f1)
    echo ""
    echo "========================================"
    echo "✓ APK Build Successful!"
    echo "========================================"
    echo ""
    echo "APK Location: $apkPath"
    echo "APK Size: $apkSize"
    echo ""
    echo "To install on device:"
    echo "  adb install $apkPath"
    echo ""
else
    echo ""
    echo "✗ APK not found at expected location"
    echo "Check build output for errors"
    exit 1
fi

