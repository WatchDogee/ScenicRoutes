# Fix: Old UI Still Showing

## Problem
You're seeing the old drawer-based UI instead of the new bottom sheet UI.

## Why This Happens
1. **Build not run** - Old files still in `public/build/`
2. **Cache** - Browser/Android caching old files
3. **Map component** - Still rendering old drawer internally

## ✅ Solution: Rebuild and Clear Cache

### Step 1: Clean Build
```bash
# Delete old build files
rm -rf public/build
# Or on Windows:
# rmdir /s /q public\build

# Rebuild
npm run build
```

### Step 2: Sync to Android
```bash
npx cap sync android
```

### Step 3: Clear Android App Data
**In Android Studio:**
1. Run → Edit Configurations
2. Before Launch → Add → Run External Tool
3. Or manually: Settings → Apps → ScenicRoutes → Clear Data

**Or uninstall and reinstall:**
- Uninstall app from device/emulator
- Run again from Android Studio

### Step 4: Hard Refresh (Browser Testing)
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) / `Cmd+Shift+R` (Mac)

---

## What New UI Should Look Like

### ✅ Correct (New UI):
- **No side drawer** - Drawer should NOT appear
- **Minimal header** - Just logo and search button
- **Full-screen map** - Map takes most of screen
- **Floating buttons** - Location (📍) and Actions (➕) buttons
- **Bottom navigation** - Always visible at bottom
- **Bottom sheets** - Slide up from bottom when needed

### ❌ Wrong (Old UI - What You're Seeing):
- **Side drawer** - Slides in from left (this is OLD)
- **Cluttered header** - Too many elements
- **Drawer menu** - White panel from left side

---

## Verify New UI is Loading

### Check Browser Console (F12)
Look for:
```
✅ Should see: "NewMobileMapScreen" in component tree
❌ Should NOT see: "MobileDrawer" or "MobileMapWrapper"
```

### Check Network Tab
Verify these files load:
- ✅ `mobile-new-ui.css`
- ✅ `NewMobileMapScreen.jsx` (in bundle)
- ❌ Should NOT load old drawer components

### Check CSS Classes
Inspect element - should see:
- ✅ `mobile-header-new`
- ✅ `mobile-bottom-nav-new`
- ✅ `mobile-map-container-new`
- ❌ Should NOT see `mobile-drawer`

---

## Force New UI (Temporary Fix)

If still seeing old UI, add this to `mobile-new-ui.css`:

```css
/* Force hide old drawer */
.mobile-drawer,
.mobile-drawer-overlay,
.mobile-drawer.open {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transform: translateX(-100%) !important;
}
```

---

## Complete Rebuild Process

```bash
# 1. Clean everything
rm -rf public/build
rm -rf node_modules/.vite

# 2. Rebuild
npm run build

# 3. Verify build
ls public/build/ | grep mobile-new-ui
# Should show: mobile-new-ui-[hash].css

# 4. Sync to Android
npx cap sync android

# 5. Open Android Studio
npx cap open android

# 6. Clean build in Android Studio
# Build → Clean Project
# Build → Rebuild Project

# 7. Run app
# Click Run button
```

---

## Still Not Working?

1. **Check route** - Make sure you're on `/map` route
2. **Check imports** - Verify `mobile-new-ui.css` is imported in `mobile.jsx`
3. **Check component** - Verify `NewMobileMapScreen` is used in `MobileApp.jsx`
4. **Check console** - Look for JavaScript errors
5. **Check build output** - Verify new CSS is in `public/build/`

---

## Expected Result

After rebuild, you should see:
- ✅ Clean, minimal header
- ✅ Full-screen map
- ✅ Floating action buttons (bottom-right)
- ✅ Bottom navigation (always visible)
- ✅ NO side drawer
- ✅ Bottom sheets slide up when needed

If you still see the old drawer, the build didn't include the new files. Rebuild and clear cache!








