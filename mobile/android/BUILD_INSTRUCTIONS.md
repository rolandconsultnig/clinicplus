# Building APK - Manual Setup Instructions

Due to network issues downloading the Gradle wrapper, please follow these steps:

## Option 1: Download Gradle Wrapper Manually

1. Download `gradle-wrapper.jar` from one of these sources:
   - Direct: https://raw.githubusercontent.com/gradle/gradle/v8.3.0/gradle/wrapper/gradle-wrapper.jar
   - Or from: https://github.com/gradle/gradle/releases/tag/v8.3.0

2. Save the file to: `mobile/android/gradle/wrapper/gradle-wrapper.jar`

3. Then run:
   ```powershell
   cd mobile/android
   .\gradlew.bat assembleDebug
   ```

## Option 2: Use React Native CLI

```powershell
cd mobile
npx react-native run-android --mode=release
```

## Option 3: Use Android Studio

1. Open Android Studio
2. Open the `mobile/android` folder
3. Wait for Gradle sync
4. Go to Build > Build Bundle(s) / APK(s) > Build APK(s)
5. Select "debug" or "release"

## Option 4: Initialize Gradle Wrapper

If you have Gradle installed globally:

```powershell
cd mobile/android
gradle wrapper --gradle-version 8.3
.\gradlew.bat assembleDebug
```

## After Setup

Once the gradle-wrapper.jar is in place, build the APK:

```powershell
cd mobile/android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

The APK will be at: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

