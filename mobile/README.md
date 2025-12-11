# Clinic+ Patient Mobile App

React Native mobile application for Clinic+ patients to access their medical records, appointments, prescriptions, and more.

## Features

- 🔐 Secure Authentication (JWT-based)
- 📋 View Medical Records
- 📅 Manage Appointments
- 💊 View Prescriptions
- 🧪 Lab Results
- 💬 Messaging with Providers
- 🔔 Notifications
- 📊 Health Dashboard
- 🏥 Facility Information

## Tech Stack

- **React Native** - Cross-platform mobile framework
- **React Navigation** - Navigation library
- **Axios** - HTTP client
- **AsyncStorage** - Local storage
- **React Native Paper** - UI components (or NativeBase/React Native Elements)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS - macOS only)

### Installation

```bash
# Install dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components
│   ├── components/       # Reusable components
│   ├── navigation/       # Navigation configuration
│   ├── services/         # API services
│   ├── utils/            # Utility functions
│   ├── store/            # State management (Redux/Context)
│   └── constants/        # App constants
├── android/              # Android native code
├── ios/                  # iOS native code
└── package.json
```

## API Integration

The mobile app connects to the Clinic+ backend API at:
- Development: `http://localhost:5000/api`
- Production: `https://api.clinicplus.com/api`

## Authentication

Uses JWT tokens stored securely in AsyncStorage. Tokens are automatically refreshed when expired.

## Environment Variables

Create a `.env` file:

```
API_BASE_URL=http://localhost:5000/api
API_TIMEOUT=30000
```

