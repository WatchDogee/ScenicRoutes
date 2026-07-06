# Fixing Gradle Build File Lock Issues

## Problem
```
Cannot access output property 'resultsDir' of task ':app:connectedDebugAndroidTest'
Failed to create MD5 hash for file '...\utp.0.log.lck'
```

## Root Cause
This error typically occurs when:
1. **OneDrive is syncing the build directory** (most common)
2. Files are locked by another process
3. Gradle daemon has stale state

## Solutions (Try in Order)

### Solution 1: Exclude Build Directory from OneDrive Sync (RECOMMENDED)

OneDrive doesn't respect `.gitignore`, so you need to explicitly exclude the build directory:

1. Right-click on `android-native` folder in File Explorer
2. Select **Properties** → **OneDrive** tab (or **Location** tab)
3. Click **Choose folders** or **Exclude folders**
4. Add `build` and `app/build` to the exclusion list

Alternatively, use OneDrive settings:
1. Open OneDrive settings
2. Go to **Sync and backup** → **Advanced settings**
3. Click **Choose folders**
4. Uncheck `build` directories

### Solution 2: Stop Gradle Daemon and Clean

```powershell
cd android-native
./gradlew --stop
./gradlew clean
./gradlew connectedDebugAndroidTest
```

### Solution 3: Run Tests Without Daemon

```powershell
cd android-native
./gradlew connectedDebugAndroidTest --no-daemon
```

### Solution 4: Delete Lock Files Manually

```powershell
# Delete any .lck files
Get-ChildItem -Path "android-native" -Recurse -Filter "*.lck" | Remove-Item -Force

# Delete test results directory
Remove-Item -Path "android-native\app\build\outputs\androidTest-results" -Recurse -Force -ErrorAction SilentlyContinue
```

### Solution 5: Move Project Outside OneDrive

If the above solutions don't work, consider moving your project to a location outside OneDrive (e.g., `C:\Projects\ScenicRoutes`).

## Quick Fix Command

Run this command to clean everything and retry:

```powershell
cd android-native
./gradlew --stop
Remove-Item -Path "app\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
./gradlew clean
./gradlew connectedDebugAndroidTest --no-daemon
```

## Prevention

1. **Exclude build directories from OneDrive** (Solution 1)
2. Add to `.gitignore` (already done):
   ```
   /build
   app/build
   ```
3. Consider using a local project location outside OneDrive for development

## Additional Notes

- The `.gitignore` file already excludes `/build`, but OneDrive doesn't respect `.gitignore`
- File locks from OneDrive sync can cause Gradle to fail when accessing output directories
- Running with `--no-daemon` can help avoid stale daemon state issues










