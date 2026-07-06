# Android Development & Testing Guide - Capacitor

**Date:** $(date)  
**Question:** How do we develop and test for Android? Do we need Android Studio?

---

## 🎯 **Short Answer**

**Yes, you need Android Studio**, but only for:
- ✅ Building the Android app
- ✅ Running Android emulator (optional - can use physical device)
- ✅ Debugging native code (if needed)
- ✅ Publishing to Play Store

**You DON'T need Android Studio for:**
- ❌ Writing React code (use your existing editor)
- ❌ Most development (can use physical device)
- ❌ API development (Laravel backend)

---

## 📋 **What You Need**

### **Required:**
1. ✅ **Android Studio** - For building and testing
2. ✅ **Java JDK** - Usually comes with Android Studio
3. ✅ **Android SDK** - Comes with Android Studio
4. ✅ **Physical Android Device** (recommended) OR **Android Emulator**

### **Optional:**
- Android Studio IDE (you can use VS Code + command line)
- Android Emulator (if you don't have a physical device)

---

## 🚀 **Setup Steps**

### **Step 1: Install Android Studio**

1. **Download Android Studio:**
   - Go to: https://developer.android.com/studio
   - Download for Windows
   - Install (includes JDK and Android SDK)

2. **During Installation:**
   - ✅ Install Android SDK
   - ✅ Install Android SDK Platform
   - ✅ Install Android Virtual Device (AVD) - optional
   - ✅ Install Android SDK Build-Tools

3. **Set Environment Variables:**
   ```powershell
   # Add to PATH (Android Studio usually does this automatically)
   ANDROID_HOME = C:\Users\YourName\AppData\Local\Android\Sdk
   JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
   ```

---

### **Step 2: Install Capacitor**

```bash
# In your project root
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android

# Initialize Capacitor
npx cap init

# Add Android platform
npx cap add android
```

**Questions it will ask:**
- App name: `ScenicRoutes`
- App ID: `com.scenicroutes.app` (or your domain)
- Web dir: `public` (or wherever your built files are)

---

### **Step 3: Configure Capacitor**

**Create `capacitor.config.ts` in project root:**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scenicroutes.app',
  appName: 'ScenicRoutes',
  webDir: 'public', // Laravel public directory (where Vite builds)
  server: {
    androidScheme: 'https',
    // For development, you can use your local server
    // url: 'http://10.0.2.2:8000', // Android emulator localhost
    // url: 'http://192.168.1.X:8000', // Your local IP for physical device
  },
  plugins: {
    Geolocation: {
      permissions: {
        location: {
          description: 'Required for route planning and navigation',
        },
      },
    },
  },
};

export default config;
```

**Note:** Since you're using Laravel + Inertia.js, your build files go to `public/build/`. Capacitor will use the `public` directory as the web root.

---

### **Step 4: Build Your Web App**

```bash
# Build your React app
npm run build

# Sync to Android (copies built files to Android project)
npx cap sync android
```

**What `npx cap sync` does:**
- Copies your built web files from `public/` to `android/app/src/main/assets/public`
- Updates native dependencies
- Syncs plugin configurations
- **Note:** For Laravel, you need to build first: `npm run build` (creates files in `public/build/`)

---

### **Step 5: Open in Android Studio**

```bash
# Open Android project in Android Studio
npx cap open android
```

**Or manually:**
- Open Android Studio
- File → Open → Select `android` folder in your project

---

## 🧪 **Testing Options**

### **Option 1: Physical Android Device (RECOMMENDED)** ⭐

**Why Recommended:**
- ✅ Real device performance
- ✅ Real GPS testing
- ✅ Real sensors
- ✅ Faster than emulator
- ✅ Better battery testing

**Setup:**
1. **Enable Developer Options on your Android phone:**
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect Phone:**
   - Connect via USB
   - Allow USB debugging on phone
   - Verify connection: `adb devices`

3. **Run App:**
   ```bash
   # In Android Studio
   Click "Run" button (green play icon)
   # Or from command line:
   npx cap run android
   ```

**For Development (Live Reload):**
```bash
# Terminal 1: Run your Laravel backend
php artisan serve --host=0.0.0.0
# Runs on http://0.0.0.0:8000 (accessible from network)

# Terminal 2: Run Vite dev server (already configured)
npm run dev
# Runs on http://localhost:5173

# Terminal 3: Run Capacitor with live reload
# Find your local IP first: ipconfig (look for IPv4 Address)
npx cap run android --livereload --external --url=http://YOUR_IP:5173
# Example: npx cap run android --livereload --external --url=http://192.168.1.100:5173

# For emulator, use special IP:
npx cap run android --livereload --external --url=http://10.0.2.2:5173
```

---

### **Option 2: Android Emulator**

**Why Use:**
- ✅ No physical device needed
- ✅ Test different Android versions
- ✅ Test different screen sizes
- ❌ Slower than physical device
- ❌ GPS simulation (not real)

**Setup:**
1. **Open Android Studio**
2. **Tools → Device Manager**
3. **Create Virtual Device:**
   - Choose device (e.g., Pixel 5)
   - Choose system image (e.g., Android 13)
   - Finish

4. **Run Emulator:**
   - Start emulator from Device Manager
   - Run app: `npx cap run android`

**Note:** For localhost access, use `10.0.2.2` instead of `localhost`:
```typescript
// capacitor.config.ts
server: {
  url: 'http://10.0.2.2:8000', // Android emulator localhost
}
```

---

## 🔄 **Development Workflow**

### **Daily Development:**

```bash
# 1. Make changes to React code (in VS Code/your editor)
# Edit files in resources/js/

# 2. Build web app (Laravel + Inertia.js)
npm run build
# This builds to public/build/ (handled by Laravel Vite plugin)

# 3. Sync to Android
npx cap sync android
# Copies public/ to android/app/src/main/assets/public

# 4. Run on device/emulator
npx cap run android
# Or open Android Studio and click Run
```

**Note:** Since you're using Laravel + Inertia.js, the build process is:
- `npm run build` → Builds React/JS to `public/build/`
- Laravel serves from `public/` directory
- Capacitor syncs `public/` to Android

### **With Live Reload (Faster):**

```bash
# Terminal 1: Laravel backend
php artisan serve
# Runs on http://localhost:8000

# Terminal 2: Vite dev server (already configured)
npm run dev
# Runs on http://localhost:5173

# Terminal 3: Capacitor with live reload
# Find your local IP first (ipconfig)
npx cap run android --livereload --external --url=http://YOUR_IP:5173
# Example: npx cap run android --livereload --external --url=http://192.168.1.100:5173

# Now changes to React code auto-reload!
```

**Important Notes:**
- ✅ Live reload requires phone/emulator on same network
- ✅ Use your computer's local IP (not localhost)
- ✅ Vite dev server must be accessible from device
- ✅ Laravel backend must be accessible (use `php artisan serve --host=0.0.0.0`)

**For Emulator:**
```bash
# Emulator uses special IP: 10.0.2.2 (maps to host localhost)
npx cap run android --livereload --external --url=http://10.0.2.2:5173
```

---

## 🛠️ **Development Tools**

### **VS Code (Your Current Editor)**
- ✅ Write React code
- ✅ Write TypeScript/JavaScript
- ✅ Git management
- ✅ Terminal for commands

### **Android Studio**
- ✅ Build Android app
- ✅ Run on device/emulator
- ✅ Debug native code (if needed)
- ✅ View logs
- ✅ Performance profiling

### **Chrome DevTools (For WebView Debugging)**
- ✅ Debug JavaScript
- ✅ Inspect elements
- ✅ Network monitoring
- ✅ Console logs

**How to Use:**
1. Run app on device/emulator
2. Open Chrome: `chrome://inspect`
3. Find your app → Click "Inspect"
4. Full DevTools access!

---

## 📱 **Testing Checklist**

### **Basic Testing:**
- [ ] App installs and opens
- [ ] Map displays correctly
- [ ] Location permission requested
- [ ] GPS location works
- [ ] API calls work (check network)
- [ ] Offline maps work
- [ ] Camera works (if using)
- [ ] File sharing works (GPX export)

### **Advanced Testing:**
- [ ] Background location (navigation)
- [ ] Push notifications
- [ ] Offline mode
- [ ] Performance (smooth scrolling, fast map)
- [ ] Battery usage
- [ ] Different Android versions
- [ ] Different screen sizes

---

## 🐛 **Debugging**

### **1. JavaScript/React Debugging:**
```javascript
// Use console.log (shows in Chrome DevTools)
console.log('Debug message');

// Use Capacitor logger
import { Capacitor } from '@capacitor/core';
Capacitor.getPlatform(); // 'android'
```

### **2. View Logs:**
```bash
# Android Studio
View → Tool Windows → Logcat

# Or command line
adb logcat | grep -i "capacitor\|scenicroutes"
```

### **3. Chrome DevTools:**
- Open `chrome://inspect` in Chrome
- Find your app
- Click "Inspect"
- Full debugging!

### **4. Network Debugging:**
- Use Chrome DevTools Network tab
- Check API calls
- Verify requests/responses

---

## 🔧 **Common Issues & Solutions**

### **Issue 1: "Command not found: adb"**
**Solution:**
```powershell
# Add to PATH
$env:Path += ";C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools"
```

### **Issue 2: "Device not found"**
**Solution:**
```bash
# Check devices
adb devices

# If empty, check:
# - USB debugging enabled?
# - USB cable connected?
# - Drivers installed?
```

### **Issue 3: "Cannot connect to localhost"**
**Solution:**
```typescript
// For emulator
server: { url: 'http://10.0.2.2:8000' }

// For physical device (use your computer's IP)
server: { url: 'http://192.168.1.100:8000' }
```

### **Issue 4: "Build failed"**
**Solution:**
```bash
# Clean build
cd android
./gradlew clean
cd ..

# Rebuild
npx cap sync android
```

---

## 📦 **Project Structure After Setup**

```
ScenicRoutes_dev/
├── resources/
│   └── js/              # Your React code (edit here)
│   └── views/
│       └── app.blade.php  # Laravel Inertia entry point
├── public/              # Laravel public directory
│   └── build/          # Built web files (from npm run build)
├── android/             # Android project (generated by Capacitor)
│   ├── app/
│   │   └── src/
│   │       └── main/
│   │           ├── assets/
│   │           │   └── public/  # Your built web files (synced from public/)
│   │           └── java/        # Native Android code (if needed)
│   └── build.gradle
├── capacitor.config.ts  # Capacitor configuration
└── package.json
```

**Key Points:**
- ✅ Edit React code in `resources/js/`
- ✅ Build outputs to `public/build/` (Laravel Vite plugin)
- ✅ Laravel serves from `public/` directory
- ✅ Capacitor syncs `public/` to `android/app/src/main/assets/public/`
- ✅ Android Studio builds `android/` folder
- ⚠️ **Important:** For Capacitor, you need to ensure Laravel's `public/index.php` is accessible

---

## 🚀 **Quick Start Commands**

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor
npx cap init
# App name: ScenicRoutes
# App ID: com.scenicroutes.app (or your domain)
# Web dir: public

# 3. Add Android platform
npx cap add android

# 4. Build web app (Laravel + Inertia.js)
npm run build
# This builds React/JS to public/build/

# 5. Sync to Android
npx cap sync android
# Copies public/ to android/app/src/main/assets/public

# 6. Open in Android Studio
npx cap open android

# 7. Run on device/emulator
# (Click Run in Android Studio, or)
npx cap run android
```

**Note for Laravel + Inertia.js:**
- Your app uses server-side rendering with Inertia.js
- For Capacitor, you may need to create a static build or use API-only mode
- Consider creating a separate entry point for mobile (API-only, no Inertia)

---

## 💡 **Development Tips**

### **1. Use Physical Device for Testing**
- Faster than emulator
- Real GPS
- Real performance
- Real battery usage

### **2. Use Live Reload During Development**
```bash
npx cap run android --livereload --external
```
- Changes auto-reload
- Faster iteration
- No need to rebuild

### **3. Use Chrome DevTools**
- `chrome://inspect` for debugging
- Full JavaScript debugging
- Network monitoring
- Element inspection

### **4. Test on Multiple Devices**
- Different Android versions
- Different screen sizes
- Different manufacturers (Samsung, Pixel, etc.)

### **5. Use Android Studio Logcat**
- View native logs
- Filter by tag
- Debug native issues

---

## 📋 **Do You Need Android Studio?**

### **Yes, You Need:**
- ✅ **Android SDK** (comes with Android Studio)
- ✅ **Build Tools** (comes with Android Studio)
- ✅ **Emulator** (optional, but useful)
- ✅ **Gradle** (build system, comes with Android Studio)

### **You Can Use:**
- ✅ **VS Code** for React code (your current editor)
- ✅ **Command line** for most operations
- ✅ **Chrome DevTools** for debugging

### **Android Studio is Used For:**
- ✅ Building the Android app
- ✅ Running on device/emulator
- ✅ Debugging native code (if needed)
- ✅ Publishing to Play Store

---

## 🎯 **Recommended Setup**

### **For Development:**
1. **VS Code** - Write React code
2. **Android Studio** - Build and run
3. **Physical Android Device** - Test (recommended)
4. **Chrome DevTools** - Debug JavaScript

### **Workflow:**
```
1. Edit React code in VS Code
2. Build: npm run build
3. Sync: npx cap sync android
4. Run: npx cap run android (or Android Studio)
5. Debug: Chrome DevTools (chrome://inspect)
```

---

## ✅ **Summary**

**Do you need Android Studio?**
- ✅ **Yes** - For building and running Android app
- ✅ **But** - You can use VS Code for React code
- ✅ **And** - You can use command line for most operations

**Development Setup:**
1. Install Android Studio (get SDK and tools)
2. Install Capacitor in your project
3. Build web app → Sync to Android
4. Run on physical device (recommended) or emulator
5. Debug with Chrome DevTools

**Testing:**
- Physical device: Best for real testing
- Emulator: Good for different Android versions
- Chrome DevTools: Best for JavaScript debugging

**Bottom Line:**
- ✅ Install Android Studio (for SDK and build tools)
- ✅ Use VS Code for React code (your current editor)
- ✅ Use physical device for testing (faster, real GPS)
- ✅ Use Chrome DevTools for debugging

---

## 🚀 **Next Steps**

1. **Install Android Studio**
2. **Install Capacitor** (`npm install @capacitor/android`)
3. **Initialize Capacitor** (`npx cap init`)
4. **Add Android platform** (`npx cap add android`)
5. **Build and test** (`npm run build && npx cap sync android`)

**Ready to start?** I can help you set up Capacitor step-by-step!


