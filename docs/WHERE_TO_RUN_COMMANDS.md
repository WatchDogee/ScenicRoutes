# Where to Run Commands - Step by Step

## 📍 Step 1: Open Terminal in Project Root

### Windows (PowerShell or Command Prompt)
1. Open **File Explorer**
2. Navigate to your project folder:
   ```
   C:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev
   ```
3. Right-click in the folder → **"Open in Terminal"** or **"Open PowerShell window here"**

### Alternative: Use VS Code
1. Open VS Code
2. File → Open Folder
3. Select: `ScenicRoutes_dev`
4. Press `` Ctrl+` `` (backtick) to open terminal
5. Terminal will be in the project root automatically

---

## 🚀 Step 2: Run Commands in Terminal

### In the Terminal (PowerShell/Command Prompt/VS Code Terminal):

```bash
# 1. Build the app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open Android Studio
npx cap open android
```

**Important:** Run these commands **one at a time**, wait for each to finish before running the next.

---

## 📱 Step 3: Android Studio Opens

After `npx cap open android`:
1. **Android Studio will open automatically**
2. Wait for it to load the project (may take a minute)
3. You'll see the Android Studio interface

---

## ▶️ Step 4: Click Run in Android Studio

### In Android Studio:

1. **Select Device/Emulator:**
   - Look at the top toolbar
   - Find the device dropdown (shows "No devices" or device name)
   - Click it → Select an emulator or connected device

2. **Click Run Button:**
   - Look for the green **▶️ Run** button in the toolbar
   - Or press `Shift + F10` (Windows) / `Ctrl + R` (Mac)

3. **Wait for Build:**
   - Android Studio will build the APK
   - First time may take a few minutes
   - You'll see progress in the bottom status bar

4. **App Launches:**
   - App will install and launch on your device/emulator
   - You'll see the new UI!

---

## 📂 Project Structure

Your project root should look like this:
```
ScenicRoutes_dev/
├── android/          ← Android project (created by Capacitor)
├── public/           ← Built files go here
├── resources/        ← Your source code
├── package.json      ← npm commands work here
├── capacitor.config.ts
└── ... other files
```

**All commands must be run from the `ScenicRoutes_dev` folder (where `package.json` is).**

---

## 🔍 How to Verify You're in the Right Place

### Check Current Directory:
```bash
# Windows PowerShell
pwd

# Windows CMD
cd

# Should show:
# C:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev
```

### Check if package.json exists:
```bash
# Windows PowerShell/CMD
dir package.json

# Should show: package.json
```

---

## ⚠️ Common Mistakes

### ❌ Wrong: Running in subfolder
```
❌ C:\Users\mairi\...\ScenicRoutes_dev\android>
```
**Fix:** Go back to project root:
```bash
cd ..
```

### ❌ Wrong: Running in wrong folder
```
❌ C:\Users\mairi>
```
**Fix:** Navigate to project:
```bash
cd "OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev"
```

### ✅ Correct: Running in project root
```
✅ C:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev>
```

---

## 🎯 Quick Checklist

Before running commands:
- [ ] Terminal is open
- [ ] You're in the project root folder
- [ ] You can see `package.json` in the folder
- [ ] Laravel server is running (for API): `php artisan serve`

Then run:
1. ✅ `npm run build` (in terminal)
2. ✅ `npx cap sync android` (in terminal)
3. ✅ `npx cap open android` (in terminal - opens Android Studio)
4. ✅ Click **Run** button in Android Studio

---

## 💡 Pro Tip: Use VS Code

**Easiest way:**
1. Open VS Code
2. File → Open Folder → Select `ScenicRoutes_dev`
3. Terminal → New Terminal (`` Ctrl+` ``)
4. Terminal is automatically in the right place!
5. Run all commands there

---

## 🆘 If Commands Don't Work

### "npm: command not found"
- Install Node.js: https://nodejs.org/
- Restart terminal after installing

### "npx: command not found"
- Comes with npm, reinstall Node.js

### "Cannot find module"
- Run: `npm install` first
- Then try `npm run build` again

### Android Studio doesn't open
- Install Android Studio: https://developer.android.com/studio
- Make sure it's in your PATH

---

## ✅ Success Indicators

### After `npm run build`:
- ✅ Should see "built in X seconds"
- ✅ No errors (warnings are OK)

### After `npx cap sync android`:
- ✅ Should see "Sync complete"
- ✅ Files copied to `android/app/src/main/assets/`

### After `npx cap open android`:
- ✅ Android Studio opens
- ✅ Project loads (may take a minute)

### After clicking Run:
- ✅ App builds
- ✅ App installs on device
- ✅ App launches with new UI!

---

You're all set! Run the commands in your terminal from the project root folder. 🚀








