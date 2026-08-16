# ClassVision 2.0 — Mobile Client (React Native / Expo)

Native mobile application for **ClassVision 2.0**, designed for student 1-tap facial check-in on iOS and Android devices.

---

## 📱 Features
- **Front-facing Camera Burst Capture**: Automatically sends 2-frame bursts for server-side anti-spoofing analysis.
- **Hardware Device Binding**: Queries native device identifiers via `expo-application` and computes a cryptographic SHA-256 fingerprint.
- **GPS Proximity Transmission**: Obtains high-accuracy device coordinates for classroom geofence validation.
- **Rolling TOTP Code Input**: Allows students to enter the 6-digit rolling code displayed by the professor.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Configure Backend Endpoint
Open `src/api.ts` and set `BACKEND_URL` to your ClassVision backend server:
- Local LAN / Wi-Fi: `http://192.168.1.XX:8000`
- Android Emulator: `http://10.0.2.2:8000`
- Production Cloud: `https://api.yourdomain.com`

### 3. Run Locally with Expo
```bash
# Start development server & QR code
npm start

# Run on Android Emulator / Connected Device
npm run android

# Run on iOS Simulator (macOS)
npm run ios
```

---

## 📦 Building Production APK / Google Play Store Bundle

Using Expo Application Services (EAS):

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Build standalone Android APK (for direct sideloading)
eas build -p android --profile preview

# Build Android App Bundle (.aab) for Google Play Store
eas build -p android --profile production
```
