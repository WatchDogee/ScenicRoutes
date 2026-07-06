# How to Accept Android SDK Licenses

The build failed because Android SDK licenses haven't been accepted. Here are **3 ways** to fix this:

## Method 1: Using Gradle (Easiest) ⭐

Run this command from the `android-native` directory:

```bash
cd android-native
.\gradlew.bat --stop
.\gradlew.bat checkAll --warning-mode all
```

When prompted, type `y` and press Enter for each license agreement.

**Note**: If this doesn't prompt you, use Method 2 or 3.

---

## Method 2: Using sdkmanager (Command Line)

### Step 1: Find sdkmanager
The `sdkmanager` tool is usually located at:
```
C:\Users\mairi\AppData\Local\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat
```

Or check if it's in:
```
C:\Users\mairi\AppData\Local\Android\Sdk\tools\bin\sdkmanager.bat
```

### Step 2: Accept all licenses
Open PowerShell or Command Prompt and run:

```powershell
cd C:\Users\mairi\AppData\Local\Android\Sdk\cmdline-tools\latest\bin
.\sdkmanager.bat --licenses
```

Or if it's in the tools directory:
```powershell
cd C:\Users\mairi\AppData\Local\Android\Sdk\tools\bin
.\sdkmanager.bat --licenses
```

**For each license prompt, type `y` and press Enter.**

---

## Method 3: Using Android Studio (GUI) 🖱️

1. **Open Android Studio**
2. **Go to**: `Tools` → `SDK Manager` (or click the SDK Manager icon in the toolbar)
3. **Click**: `SDK Tools` tab
4. **Check**: `Android SDK Build-Tools` and `Android SDK Platform-Tools`
5. **Click**: `Apply` or `OK`
6. **Accept licenses** when prompted in the dialog

Alternatively:
1. **Go to**: `File` → `Settings` (or `Android Studio` → `Preferences` on Mac)
2. **Navigate to**: `Appearance & Behavior` → `System Settings` → `Android SDK`
3. **Click**: `SDK Tools` tab
4. **Check the boxes** and click `Apply`
5. **Accept licenses** in the popup

---

## Verify Licenses Are Accepted

After accepting licenses, verify by running:

```bash
cd android-native
.\gradlew.bat checkAll
```

The license error should be gone!

---

## Troubleshooting

### "sdkmanager not found"
- Make sure Android SDK is installed
- Check if `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable is set
- Install SDK Command-line Tools from Android Studio SDK Manager

### "License not accepted" persists
- Try Method 3 (Android Studio GUI) - it's the most reliable
- Make sure you're running as Administrator (if needed)
- Check that licenses are in: `C:\Users\mairi\AppData\Local\Android\Sdk\licenses`

### Still having issues?
Run this to see what's missing:
```bash
cd android-native
.\gradlew.bat checkAll --stacktrace
```



















