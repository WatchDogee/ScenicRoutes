# ScenicRoutes Native Android App

A native Android app built with Kotlin, Jetpack Compose, and Material 3, designed to match Kurviger's UI style.

## 🚀 Setup Instructions

### 1. Open in Android Studio

1. Open **Android Studio** (Arctic Fox or later)
2. Click **File → Open**
3. Navigate to the `android-native` folder in this project
4. Click **OK**

### 2. Configure Google Maps API Key

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Open `app/src/main/AndroidManifest.xml`
3. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:
   ```xml
   <meta-data
       android:name="com.google.android.geo.API_KEY"
       android:value="YOUR_ACTUAL_API_KEY" />
   ```

### 3. Configure API Base URL

1. Open `app/src/main/java/com/scenicroutes/app/data/network/NetworkModule.kt`
2. Update the `BASE_URL` constant:
   - **For Android Emulator**: `http://10.0.2.2:8000/api/` (default)
   - **For Physical Device**: `http://YOUR_COMPUTER_IP:8000/api/`
     - Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
     - Make sure your phone and computer are on the same WiFi network

### 4. Sync Gradle

1. Android Studio should automatically prompt to sync Gradle
2. If not, click **File → Sync Project with Gradle Files**
3. Wait for dependencies to download

### 5. Run the App

1. Connect an Android device or start an emulator (API 26+)
2. Click the **Run** button (▶️) or press `Shift+F10`
3. The app should build and launch

## 📱 Features Implemented

- ✅ **Kurviger-style Map Screen**
  - Full-screen Google Maps
  - Floating top control card with:
    - Logo button
    - Search field
    - Origin field + distance/time chips
    - Curvature & Avoidances buttons
  - Right-side FAB column (layers, center, actions)
  - Bottom gradient banner
  - Bottom navigation bar

- ✅ **Navigation**
  - Map, Explore, Saved, Profile screens
  - Navigation Compose setup

- ✅ **API Integration**
  - Retrofit setup
  - Auth endpoints (login, register, logout, getUser)
  - Ready to connect to your Laravel backend

## 🔧 Project Structure

```
android-native/
├── app/
│   ├── src/main/
│   │   ├── java/com/scenicroutes/app/
│   │   │   ├── data/
│   │   │   │   ├── api/          # API service interfaces
│   │   │   │   ├── model/        # Data models
│   │   │   │   ├── network/      # Retrofit setup
│   │   │   │   └── repository/   # Data repositories
│   │   │   ├── ui/
│   │   │   │   ├── screens/      # Screen composables
│   │   │   │   ├── navigation/   # Navigation setup
│   │   │   │   └── theme/        # Material 3 theme
│   │   │   └── MainActivity.kt
│   │   └── res/                  # Resources
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

## 🎨 UI Design

The app follows Kurviger's design principles:
- **Full-screen map** as the primary interface
- **Floating top card** with all controls
- **Right-side FAB stack** for quick actions
- **Bottom navigation** for main tabs
- **Material 3** design system

## 📝 Next Steps

1. **Connect to Backend**: Update `NetworkModule.kt` with your API URL
2. **Add Map Features**: Implement route planning, road search, etc.
3. **Implement Auth**: Add login/register screens
4. **Add Other Screens**: Complete Explore, Saved, Profile screens
5. **Add Location Services**: Implement GPS tracking and location features

## 🐛 Troubleshooting

### Build Errors
- Make sure you're using Android Studio Arctic Fox or later
- Sync Gradle: **File → Sync Project with Gradle Files**
- Clean build: **Build → Clean Project**, then **Build → Rebuild Project**

### Maps Not Showing
- Verify your Google Maps API key is correct
- Check that the API key has Maps SDK for Android enabled
- Check Logcat for error messages

### API Connection Issues
- For emulator: Use `10.0.2.2:8000` (maps to `localhost:8000` on your computer)
- For physical device: Use your computer's IP address
- Make sure your Laravel backend is running and accessible
- Check that CORS is configured correctly on your backend

## 📚 Resources

- [Jetpack Compose Docs](https://developer.android.com/jetpack/compose)
- [Google Maps Compose](https://github.com/googlemaps/android-maps-compose)
- [Material 3 Design](https://m3.material.io/)
- [Navigation Compose](https://developer.android.com/jetpack/compose/navigation)

## 🤝 Contributing

This is a native Android implementation of ScenicRoutes. The UI is designed to match Kurviger's style while maintaining the functionality of the original web app.







