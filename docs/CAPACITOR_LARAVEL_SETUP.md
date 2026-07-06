# Capacitor + Laravel + Inertia.js Setup Guide

**Date:** $(date)  
**Challenge:** Laravel + Inertia.js uses server-side rendering, but Capacitor needs static files

---

## ⚠️ **Important: Laravel + Inertia.js Consideration**

### **The Challenge:**
- **Laravel + Inertia.js** = Server-side rendering (needs PHP server)
- **Capacitor** = Needs static HTML/JS files (no PHP server)

### **Solutions:**

---

## 🎯 **Solution 1: API-Only Mode (RECOMMENDED)** ⭐

**Create a separate mobile entry point that uses API only (no Inertia.js)**

### **Step 1: Create Mobile Entry Point**

**Create `resources/js/mobile.jsx`:**
```jsx
import './bootstrap';
import '../css/app.css';
// ... other CSS imports
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './MobileApp'; // New mobile app component

const root = createRoot(document.getElementById('app'));
root.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
```

**Create `resources/js/MobileApp.jsx`:**
```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Map from './Pages/Map';
// Import other pages as needed

export default function MobileApp() {
    return (
        <Routes>
            <Route path="/" element={<Map />} />
            <Route path="/map" element={<Map />} />
            {/* Add other routes */}
        </Routes>
    );
}
```

### **Step 2: Update Vite Config**

**Add mobile entry to `vite.config.js`:**
```javascript
input: [
    'resources/js/app.jsx',      // Web (Inertia.js)
    'resources/js/mobile.jsx',   // Mobile (API-only)
    // ... other entries
],
```

### **Step 3: Create Mobile HTML**

**Create `public/mobile.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ScenicRoutes</title>
    @vite(['resources/js/mobile.jsx', "resources/css/app.css"])
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

### **Step 4: Update Capacitor Config**

**Update `capacitor.config.ts`:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.scenicroutes.app',
  appName: 'ScenicRoutes',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    // For production, point to your API
    // url: 'https://api.scenicroutes.live',
  },
};
```

### **Step 5: Update Components to Use API**

**Instead of Inertia.js:**
```javascript
// OLD (Inertia.js)
import { router } from '@inertiajs/react';
router.visit('/map');

// NEW (API)
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/map');
```

**For API calls:**
```javascript
// Your existing apiClient works!
import apiClient from '../utils/apiClient';

// Instead of Inertia forms
const response = await apiClient.post('/routes/calculate', data);
```

---

## 🎯 **Solution 2: Static Build with API Backend**

**Keep Inertia.js for web, use API for mobile**

### **Approach:**
1. **Web:** Keep Laravel + Inertia.js (current setup)
2. **Mobile:** Create static build that calls your Laravel API
3. **Backend:** Your Laravel API already exists (routes/api.php)

### **Benefits:**
- ✅ Reuse most React components
- ✅ Same API backend
- ✅ Separate web/mobile builds
- ✅ No major rewrite needed

---

## 🎯 **Solution 3: Hybrid Approach (EASIEST)**

**Use Capacitor with your existing setup, but configure it properly**

### **Step 1: Configure Capacitor for Laravel**

**Update `capacitor.config.ts`:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.scenicroutes.app',
  appName: 'ScenicRoutes',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    // Point to your Laravel backend
    url: 'https://your-domain.com', // Production
    // Or for development:
    // url: 'http://192.168.1.100:8000', // Your local IP
  },
};
```

### **Step 2: Build Process**

```bash
# Build web app
npm run build

# Sync to Android
npx cap sync android
```

### **Step 3: Handle Inertia.js in Mobile**

**Option A:** Keep Inertia.js (it works in WebView!)
- Inertia.js works in Capacitor WebView
- Your Laravel backend serves the app
- Mobile app loads from your server

**Option B:** Create API-only mode (better for offline)
- Separate mobile build
- Uses API only
- Better for offline support

---

## 📋 **Recommended Approach**

### **For MVP (Quick Launch):**
1. ✅ Use **Solution 3 (Hybrid)**
2. ✅ Keep Inertia.js
3. ✅ Point Capacitor to your Laravel server
4. ✅ Mobile app loads from server (like web)

**Pros:**
- ✅ Fastest to implement
- ✅ No code changes needed
- ✅ Works immediately

**Cons:**
- ❌ Requires internet connection
- ❌ Limited offline support
- ❌ Slower (loads from server)

### **For Production (Best Experience):**
1. ✅ Use **Solution 1 (API-Only Mode)**
2. ✅ Create mobile entry point
3. ✅ Use API for all data
4. ✅ Better offline support

**Pros:**
- ✅ Better offline support
- ✅ Faster (local files)
- ✅ Better user experience

**Cons:**
- ⚠️ Some code changes needed
- ⚠️ Need to convert Inertia.js to API calls

---

## 🚀 **Quick Setup (Hybrid - Easiest)**

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize
npx cap init
# App name: ScenicRoutes
# App ID: com.scenicroutes.app
# Web dir: public

# 3. Add Android
npx cap add android

# 4. Update capacitor.config.ts
# Set server.url to your Laravel backend URL

# 5. Build and sync
npm run build
npx cap sync android

# 6. Open in Android Studio
npx cap open android

# 7. Run
npx cap run android
```

**This works because:**
- ✅ Capacitor WebView can load from your server
- ✅ Inertia.js works in WebView
- ✅ Your Laravel backend serves the app
- ✅ API calls work normally

---

## 💡 **Key Points**

1. **You CAN use Inertia.js with Capacitor** - It works in WebView!
2. **For best experience, use API-only mode** - Better offline support
3. **For quick launch, use hybrid** - Point to your server
4. **Your existing API works** - No backend changes needed

---

## ✅ **Summary**

**Do you need Android Studio?**
- ✅ **Yes** - For building and running Android app

**Can you use Inertia.js?**
- ✅ **Yes** - Works in Capacitor WebView (loads from server)
- ⚠️ **Better:** API-only mode for offline support

**Development Workflow:**
1. Edit React code in VS Code
2. Build: `npm run build`
3. Sync: `npx cap sync android`
4. Run: `npx cap run android` (or Android Studio)
5. Debug: Chrome DevTools (`chrome://inspect`)

**Testing:**
- Physical device: Best (real GPS, performance)
- Emulator: Good (different Android versions)
- Chrome DevTools: Best for JavaScript debugging




