# Building APK for Android 10 and Above

This guide will help you build an APK file for Android 10 (API 29) and above.

## Prerequisites

1. **Java Development Kit (JDK) 17 or higher**
   - Download from: https://adoptium.net/
   - Set JAVA_HOME environment variable

2. **Android Studio**
   - Download from: https://developer.android.com/studio
   - Install Android SDK Platform 29+ (Android 10+)
   - Install Android SDK Build-Tools 33.0.0 or higher

3. **Node.js and npm**
   - Node.js 16 or higher
   - npm 8 or higher

4. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Install Android Dependencies

For iOS (macOS only):
```bash
cd ios
pod install
cd ..
```

### 3. Configure Environment Variables

Create a `.env` file in the `mobile` directory:

```
API_BASE_URL=http://your-api-url.com/api
API_TIMEOUT=30000
```

### 4. Generate Debug Keystore (if not exists)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000
cd ../..
```

## Building the APK

### Option 1: Build Debug APK (Development)

```bash
cd mobile/android
./gradlew assembleDebug
```

The APK will be generated at:
`mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Build Release APK (Production)

#### Step 1: Create Release Keystore

```bash
cd mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -storepass YOUR_STORE_PASSWORD -alias clinicplus -keypass YOUR_KEY_PASSWORD -keyalg RSA -keysize 2048 -validity 10000
cd ../..
```

#### Step 2: Configure Release Signing

Create `mobile/android/gradle.properties` and add:

```properties
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=clinicplus
MYAPP_RELEASE_STORE_PASSWORD=YOUR_STORE_PASSWORD
MYAPP_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

#### Step 3: Build Release APK

```bash
cd mobile/android
./gradlew assembleRelease
```

The APK will be generated at:
`mobile/android/app/build/outputs/apk/release/app-release.apk`

### Option 3: Build Using Android Studio

1. Open Android Studio
2. Open the `mobile/android` folder
3. Wait for Gradle sync to complete
4. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. Select **release** or **debug** variant
6. Wait for build to complete
7. APK will be in `app/build/outputs/apk/`

## APK Specifications

- **Minimum SDK**: Android 10 (API 29)
- **Target SDK**: Android 14 (API 34)
- **Package Name**: `com.clinicplus.patient`
- **App Name**: Clinic+ Patient
- **Version**: 1.0.0

## Features Included

- ✅ Health data collection from smart watches
- ✅ Medical records viewing
- ✅ Appointment management
- ✅ Prescription tracking
- ✅ Lab results viewing
- ✅ Messaging with providers
- ✅ Profile management

## Testing the APK

### Install on Device

```bash
# Enable USB debugging on your Android device
# Connect device via USB
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Install via ADB

```bash
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Troubleshooting

### Build Errors

1. **Gradle sync failed**
   - Check internet connection
   - Clear Gradle cache: `cd android && ./gradlew clean`

2. **SDK not found**
   - Open Android Studio
   - Go to **Tools > SDK Manager**
   - Install Android SDK Platform 29+

3. **NDK not found**
   - Install NDK from Android Studio SDK Manager
   - Or set `ndkVersion` in `build.gradle`

### Common Issues

- **"SDK location not found"**: Set `ANDROID_HOME` environment variable
- **"Java version mismatch"**: Use JDK 17 or higher
- **"Metro bundler not starting"**: Run `npm start` in mobile directory

## Distribution

### Internal Testing

Upload APK to:
- Google Play Console (Internal Testing track)
- Firebase App Distribution
- Direct download link

### Production Release

1. Generate signed APK (see Option 2 above)
2. Upload to Google Play Console
3. Complete store listing
4. Submit for review

## Security Notes

- Never commit keystore files to version control
- Store release keystore securely
- Use different keystores for debug and release
- Enable ProGuard/R8 for release builds

