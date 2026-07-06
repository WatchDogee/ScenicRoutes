# Clean Build Instructions

## Problem
The app is still trying to use Google Maps instead of OSMDroid because of cached build files.

## Solution: Clean Rebuild

### In Android Studio:

1. **Clean Project**
   - Go to `Build` → `Clean Project`
   - Wait for it to complete

2. **Invalidate Caches**
   - Go to `File` → `Invalidate Caches...`
   - Check "Clear file system cache and Local History"
   - Click "Invalidate and Restart"
   - Wait for Android Studio to restart

3. **Sync Gradle**
   - Click "Sync Project with Gradle Files" (elephant icon in toolbar)
   - Wait for sync to complete

4. **Rebuild**
   - Go to `Build` → `Rebuild Project`
   - Wait for build to complete

5. **Run**
   - Uninstall the old app from your device/emulator first
   - Then run the app again

### Alternative: Command Line

```bash
cd android-native
./gradlew clean
./gradlew build
```

Then rebuild and run from Android Studio.

## What Changed

- ✅ Removed Google Maps dependencies
- ✅ Added OSMDroid (OpenStreetMap)
- ✅ Updated MapScreen to use OSMDroid
- ✅ Added required OSMDroid permissions

## After Clean Build

The app should now:
- Use OpenStreetMap tiles (same as your web app)
- Not require Google Maps API key
- Work with your route/road functions
- Show the new UI design


































