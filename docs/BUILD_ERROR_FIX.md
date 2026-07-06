# Fixing Build File Lock Error

## Problem
```
FileSystemException: R.jar: The process cannot access the file because it is being used by another process
```

This is a common Windows issue, often caused by OneDrive syncing or file locks.

---

## Quick Fixes

### 1. Stop Gradle Daemons
```bash
./gradlew --stop
```

### 2. Clean Build
```bash
./gradlew clean
./gradlew build
```

### 3. Exclude Build Folder from OneDrive
**Important:** OneDrive may be syncing the `build` folder, causing file locks.

**Solution:**
1. Right-click `android-native/build` folder
2. Choose "Always keep on this device" or exclude from OneDrive sync
3. Or add to OneDrive exclusion list in OneDrive settings

### 4. Close Other Processes
- Close Android Studio/IntelliJ if open
- Close any file explorers with the build folder open
- Stop any antivirus scans temporarily

### 5. Delete Build Folder Manually
```bash
# In PowerShell
Remove-Item -Recurse -Force android-native\app\build
Remove-Item -Recurse -Force android-native\build
```

Then rebuild:
```bash
./gradlew clean build
```

---

## Recommended Solution

**Exclude build folders from OneDrive sync:**

1. Open OneDrive settings
2. Go to "Sync and backup" → "Advanced settings"
3. Add exclusion for:
   - `android-native/build`
   - `android-native/app/build`
   - `android-native/.gradle`

Or use `.onedriveignore` file in project root.

---

## After Fixing

Run:
```bash
./gradlew clean
./gradlew compileDebugKotlin compileDebugUnitTestKotlin
```

Expected: ✅ BUILD SUCCESSFUL










