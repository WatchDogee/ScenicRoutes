# How to Run Tasks in Android Studio

## ✅ Gradle Wrapper is Now Set Up!

The `gradlew.bat` file has been created. You can now run tasks in multiple ways:

---

## 🎯 Method 1: Android Studio Gradle Panel (Easiest)

1. **Open Android Studio**
2. **Open the project** (`android-native` folder)
3. **Sync Gradle** (click the elephant icon in the toolbar)
4. **Open Gradle Panel** (right sidebar, or View → Tool Windows → Gradle)
5. **Navigate to**: `ScenicRoutes` → `app` → `Tasks` → `verification`
6. **Double-click** any task:
   - `checkAll` - Run everything
   - `checkFast` - Quick check
   - `testDebugUnitTest` - Run tests
   - `format` - Format code

---

## 🎯 Method 2: Terminal in Android Studio

1. **Open Terminal** in Android Studio (View → Tool Windows → Terminal)
2. **Navigate to project**:
   ```bash
   cd android-native
   ```
3. **Run tasks**:
   ```bash
   .\gradlew.bat checkAll
   .\gradlew.bat checkFast
   .\gradlew.bat format
   .\gradlew.bat testDebugUnitTest
   ```

---

## 🎯 Method 3: External Terminal/PowerShell

1. **Open PowerShell** or Command Prompt
2. **Navigate to project**:
   ```bash
   cd "C:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev\android-native"
   ```
3. **Run tasks**:
   ```bash
   .\gradlew.bat checkAll
   ```

---

## 📋 Available Tasks

### **Formatting**
- `.\gradlew.bat format` - Auto-format code
- `.\gradlew.bat ktlintFormat` - Format with ktlint
- `.\gradlew.bat ktlintCheck` - Check formatting

### **Testing**
- `.\gradlew.bat testDebugUnitTest` - Run unit tests
- `.\gradlew.bat testWithCoverage` - Tests + coverage
- `.\gradlew.bat uiTest` - UI tests on managed device

### **Comprehensive**
- `.\gradlew.bat checkAll` - Run everything (format, lint, tests, coverage)
- `.\gradlew.bat checkFast` - Quick check (format, lint, tests, no coverage)

### **Code Quality**
- `.\gradlew.bat detekt` - Run code quality checks
- `.\gradlew.bat lintDebug` - Run Android lint

---

## 🚀 Quick Start

**First time setup:**

1. Open Android Studio
2. Open `android-native` folder
3. Wait for Gradle sync to complete
4. Open Gradle panel (right sidebar)
5. Navigate to: `ScenicRoutes` → `app` → `Tasks` → `verification`
6. Double-click `checkAll`

**Or use terminal:**

```bash
cd android-native
.\gradlew.bat checkAll
```

---

## ✅ Verify Setup

To verify everything is working:

```bash
cd android-native
.\gradlew.bat tasks
```

This will show all available tasks. Look for:
- ✅ `checkAll` - under `verification` group
- ✅ `format` - under `formatting` group
- ✅ `testDebugUnitTest` - under `verification` group

---

## 🐛 Troubleshooting

### **"gradlew.bat not found"**
- Make sure you're in the `android-native` directory
- Check that `gradlew.bat` exists: `dir gradlew.bat`

### **"Gradle sync failed"**
- File → Invalidate Caches → Invalidate and Restart
- Then sync again

### **"Task not found"**
- Make sure Gradle sync completed successfully
- Check that `app/build.gradle.kts` exists and is valid

---

## 📚 More Info

- **Automation Guide**: `AUTOMATION_SETUP.md`
- **Quick Start**: `AUTOMATION_QUICK_START.md`
- **Testing Guide**: `ANDROID_TESTING_GUIDE.md`

---

**Ready to go!** Try running `.\gradlew.bat checkAll` now! 🚀



















