# Quick Fix: Accept Missing Android SDK License

## The Problem
The build is failing because the license for **"AOSP ATD Intel x86 Atom System Image"** hasn't been accepted.

## ✅ Easiest Solution: Use Android Studio

1. **Open Android Studio**
2. **Click**: `Tools` → `SDK Manager` (or the SDK Manager icon in toolbar)
3. **Go to**: `SDK Tools` tab
4. **Check**: `Android SDK Build-Tools` (if not already checked)
5. **Scroll down** and look for system images
6. **Check**: Any "AOSP" or "ATD" system images
7. **Click**: `Apply`
8. **Accept the license** when prompted

## Alternative: Accept via Command Line

If you have `sdkmanager` available, run:

```powershell
# Navigate to SDK tools
cd C:\Users\mairi\AppData\Local\Android\Sdk

# Try to find and run sdkmanager
$sdkmanager = Get-ChildItem -Path . -Recurse -Filter "sdkmanager.bat" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($sdkmanager) {
    & $sdkmanager.FullName --licenses
    # Type 'y' for each license prompt
}
```

## Manual License File (If Above Doesn't Work)

If the above methods don't work, you can manually create the license file:

1. **Create file**: `C:\Users\mairi\AppData\Local\Android\Sdk\licenses\android-sdk-preview-license`
2. **Add this content**:
   ```
   601085b94cd77f0b54ff86406957099ebe79c4d6
   ```

3. **Create file**: `C:\Users\mairi\AppData\Local\Android\Sdk\licenses\intel-android-extra-license`
4. **Add this content**:
   ```
   d975f751698a77b662f1254ddbeed3901e976f5a
   ```

## Verify It Worked

After accepting licenses, run:
```bash
cd android-native
.\gradlew.bat checkAll
```

The license error should be gone!

---

**Note**: The easiest method is using Android Studio's GUI. It will automatically accept all necessary licenses when you install/update SDK components.



















