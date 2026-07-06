# API-Only Mobile Setup Guide

**Status:** ✅ **Setup Complete**

This guide explains how to develop and test the mobile app using API-only mode with Capacitor.

---

## 📋 **What Was Implemented**

### ✅ **1. Mobile Entry Point**
- **File:** `resources/js/mobile.jsx`
- **Purpose:** Entry point for mobile app (no Inertia.js)
- **Uses:** React Router for navigation

### ✅ **2. Mobile App Component**
- **File:** `resources/js/MobileApp.jsx`
- **Purpose:** Main app component with routing
- **Routes:**
  - `/` or `/map` - Main map page
  - `/subscription` - Subscription management
  - `/usage-stats` - Usage statistics
  - `/profile` - User profile

### ✅ **3. Mobile HTML**
- **File:** `public/index.html` (for Capacitor)
- **Purpose:** Standalone HTML file for mobile app
- **Note:** This is separate from Laravel's `index.php`

### ✅ **4. Capacitor Configuration**
- **File:** `capacitor.config.ts`
- **App ID:** `com.scenicroutes.app`
- **App Name:** `ScenicRoutes`
- **Web Dir:** `public`

### ✅ **5. Pages Converted to API-Only**
- ✅ `Map.jsx` - Already API-based (no changes needed)
- ✅ `Subscription.jsx` - Converted from Inertia.js to React Router
- ✅ `UsageStats.jsx` - Converted from Inertia.js to React Router
- ✅ `UserProfile.jsx` - Converted from Inertia.js to React Router

### ✅ **6. Android Platform Added**
- **Directory:** `android/`
- **Status:** Synced and ready

---

## 🚀 **Development Workflow**

### **1. Build the Mobile App**

```bash
npm run build
```

This builds both web and mobile bundles.

### **2. Sync to Android**

```bash
npx cap sync android
```

This copies the built files to the Android project.

### **3. Open in Android Studio**

```bash
npx cap open android
```

This opens the Android project in Android Studio.

### **4. Run on Device/Emulator**

In Android Studio:
1. Select your device/emulator
2. Click "Run" (▶️)

---

## 🔧 **Configuration**

### **API Base URL**

The mobile app needs to know where your Laravel API is located.

**For Development:**
1. Update `capacitor.config.ts`:
   ```typescript
   server: {
     androidScheme: 'https',
     url: 'http://192.168.1.100:8000', // Your local IP
   },
   ```

2. Or set environment variable:
   ```bash
   # .env
   VITE_API_URL=http://192.168.1.100:8000
   ```

**For Production:**
1. Update `capacitor.config.ts`:
   ```typescript
   server: {
     androidScheme: 'https',
     // url commented = uses VITE_API_URL or defaults to production
   },
   ```

2. Set environment variable:
   ```bash
   # .env
   VITE_API_URL=https://api.scenicroutes.live
   ```

### **Android Emulator**

For Android emulator, use:
```typescript
url: 'http://10.0.2.2:8000', // Android emulator localhost
```

---

## 📱 **Testing**

### **Option 1: Physical Device**

1. **Enable USB Debugging:**
   - Settings → Developer Options → USB Debugging

2. **Connect Device:**
   - Connect via USB
   - Run `npx cap open android`
   - Select your device in Android Studio
   - Click "Run"

3. **Network Setup:**
   - Ensure device and computer are on same network
   - Update `capacitor.config.ts` with your computer's IP

### **Option 2: Android Emulator**

1. **Create Emulator:**
   - Android Studio → AVD Manager
   - Create Virtual Device
   - Select device (e.g., Pixel 5)
   - Select system image (e.g., Android 13)

2. **Run Emulator:**
   - Start emulator
   - Run `npx cap open android`
   - Select emulator
   - Click "Run"

3. **Network Setup:**
   - Use `http://10.0.2.2:8000` for emulator
   - Update `capacitor.config.ts`

### **Option 3: Live Reload (Development)**

For live reload during development:

1. **Start Laravel Server:**
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```

2. **Start Vite Dev Server:**
   ```bash
   npm run dev -- --host
   ```

3. **Update Capacitor Config:**
   ```typescript
   server: {
     androidScheme: 'https',
     url: 'http://192.168.1.100:5173', // Vite dev server
   },
   ```

4. **Sync:**
   ```bash
   npx cap sync android
   ```

5. **Run in Android Studio**

**Note:** Live reload works, but you need to rebuild and sync for major changes.

---

## 🔐 **Authentication**

The mobile app uses **Bearer token authentication**:

1. **Login:**
   - User logs in via API
   - Token stored in `localStorage`
   - Token sent in `Authorization` header

2. **Token Management:**
   - `apiClient.js` handles token automatically
   - Token persisted in `localStorage`
   - Token cleared on logout

3. **API Endpoints:**
   - `/api/login` - Login
   - `/api/logout` - Logout
   - `/api/user` - Get current user

---

## 📦 **Build for Production**

### **1. Build Web Assets**

```bash
npm run build
```

### **2. Update API URL**

Set production API URL in `capacitor.config.ts` or `.env`:
```typescript
VITE_API_URL=https://api.scenicroutes.live
```

### **3. Sync to Android**

```bash
npx cap sync android
```

### **4. Build APK/AAB**

In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Follow wizard
3. Select release build type
4. Sign with your keystore

---

## 🐛 **Debugging**

### **1. Chrome DevTools**

1. Connect device/emulator
2. Open Chrome → `chrome://inspect`
3. Find your device
4. Click "Inspect"

### **2. Android Studio Logcat**

1. Open Android Studio
2. View → Tool Windows → Logcat
3. Filter by your app package: `com.scenicroutes.app`

### **3. Console Logs**

Add console logs in your React code:
```javascript
console.log('Debug info', data);
```

View in Chrome DevTools or Logcat.

---

## ⚠️ **Common Issues**

### **Issue: App shows blank screen**

**Solution:**
1. Check `public/index.html` exists
2. Run `npm run build`
3. Run `npx cap sync android`
4. Rebuild in Android Studio

### **Issue: API calls fail**

**Solution:**
1. Check API URL in `capacitor.config.ts`
2. Ensure Laravel server is running
3. Check CORS settings in Laravel
4. Verify network connectivity

### **Issue: Authentication not working**

**Solution:**
1. Check token in `localStorage`
2. Verify API endpoints return correct format
3. Check `Authorization` header in requests
4. Verify Laravel Sanctum is configured

### **Issue: Maps not loading**

**Solution:**
1. Check internet connection
2. Verify map tile URLs are accessible
3. Check CORS for map tiles
4. Verify Leaflet is loaded

---

## 📚 **File Structure**

```
ScenicRoutes_dev/
├── android/                    # Android project (generated)
│   └── app/
│       └── src/
│           └── main/
│               └── assets/
│                   └── public/  # Web assets copied here
├── resources/
│   └── js/
│       ├── mobile.jsx          # Mobile entry point
│       ├── MobileApp.jsx       # Mobile app component
│       └── Pages/
│           ├── Map.jsx         # ✅ Already API-based
│           ├── Subscription.jsx # ✅ Converted to API
│           ├── UsageStats.jsx  # ✅ Converted to API
│           └── UserProfile.jsx  # ✅ Converted to API
├── public/
│   ├── index.html              # Mobile HTML (for Capacitor)
│   └── build/                  # Built assets
├── capacitor.config.ts         # Capacitor configuration
└── vite.config.js              # Vite config (includes mobile.jsx)
```

---

## ✅ **Next Steps**

1. **Test on Device:**
   - Connect Android device
   - Run `npx cap open android`
   - Test all features

2. **Configure API URL:**
   - Set development API URL
   - Test API connectivity
   - Verify authentication

3. **Test Features:**
   - Map loading
   - Route planning
   - POI search
   - Offline maps
   - Authentication
   - Subscriptions

4. **Build for Production:**
   - Set production API URL
   - Build release APK/AAB
   - Test on device

---

## 🎯 **Summary**

✅ **Mobile entry point created** (`mobile.jsx`)  
✅ **Mobile app component created** (`MobileApp.jsx`)  
✅ **Pages converted to API-only** (Subscription, UsageStats, UserProfile)  
✅ **Capacitor configured** (`capacitor.config.ts`)  
✅ **Android platform added** (`android/`)  
✅ **Build system updated** (`vite.config.js`)  

**Ready for development and testing!** 🚀

---

## 📖 **Additional Resources**

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio)
- [React Router Documentation](https://reactrouter.com/)

---

**Questions?** Check the code or ask for help!




