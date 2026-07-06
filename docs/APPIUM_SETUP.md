# Appium Setup Guide

**Guide for setting up Appium for end-to-end testing**

## 🎯 What is Appium?

Appium is a cross-platform mobile testing framework that allows you to:
- Test on real Android and iOS devices
- Write tests in multiple languages (Java, Kotlin, Python, JavaScript, etc.)
- Test across platforms with similar APIs
- Perform end-to-end testing with backend integration

## 📋 Prerequisites

1. **Node.js** (v14 or higher)
   ```bash
   node --version
   ```

2. **Android SDK** (already installed with Android Studio)

3. **Java/Kotlin** (already set up for Android development)

## 🚀 Installation

### Step 1: Install Appium

```bash
npm install -g appium
```

### Step 2: Install Appium Drivers

For Android:
```bash
appium driver install uiautomator2
```

For iOS (if needed):
```bash
appium driver install xcuitest
```

### Step 3: Verify Installation

```bash
appium --version
appium driver list
```

You should see `uiautomator2` in the list.

## ⚙️ Configuration

### 1. Build Your APK

```bash
cd android-native
./gradlew assembleDebug
```

The APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### 2. Connect Device/Emulator

```bash
# List connected devices
adb devices

# Example output:
# List of devices attached
# emulator-5554    device
```

### 3. Update Test Configuration

Edit `app/src/androidTest/java/com/scenicroutes/app/e2e/AppiumE2ETest.kt`:

```kotlin
companion object {
    private const val APPIUM_SERVER_URL = "http://localhost:4723"
    private const val APK_PATH = "app/build/outputs/apk/debug/app-debug.apk"
    private const val DEVICE_NAME = "emulator-5554" // From adb devices
    private const val APP_PACKAGE = "com.scenicroutes.app.debug"
    private const val APP_ACTIVITY = "com.scenicroutes.app.MainActivity"
}
```

## 🧪 Running Tests

### Step 1: Start Appium Server

In a separate terminal:
```bash
appium
```

You should see:
```
[Appium] Welcome to Appium v2.x.x
[Appium] Appium REST http interface listener started on 0.0.0.0:4723
```

### Step 2: Run Tests

In another terminal:
```bash
cd android-native
./gradlew connectedDebugAndroidTest
```

Or run specific test class:
```bash
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.e2e.AppiumE2ETest"
```

## 📝 Writing Appium Tests

### Basic Test Structure

```kotlin
class MyAppiumTest {
    private var driver: AppiumDriver? = null

    @Before
    fun setup() {
        val capabilities = DesiredCapabilities().apply {
            setCapability(MobileCapabilityType.PLATFORM_NAME, "Android")
            setCapability(MobileCapabilityType.DEVICE_NAME, "emulator-5554")
            setCapability(MobileCapabilityType.APP, "path/to/app.apk")
            setCapability(MobileCapabilityType.AUTOMATION_NAME, "UiAutomator2")
        }
        driver = AndroidDriver(URL("http://localhost:4723"), capabilities)
    }

    @After
    fun tearDown() {
        driver?.quit()
    }

    @Test
    fun test_example() {
        // Your test code here
    }
}
```

### Finding Elements

```kotlin
// By ID
driver.findElementById("button_id")

// By Accessibility ID (recommended)
driver.findElementByAccessibilityId("button_description")

// By XPath
driver.findElementByXPath("//android.widget.Button[@text='Click']")

// By Class Name
driver.findElementByClassName("android.widget.Button")
```

### Performing Actions

```kotlin
// Click
driver.findElementById("button").click()

// Type text
driver.findElementById("editText").sendKeys("Hello")

// Swipe
val startX = 500
val startY = 1000
val endX = 500
val endY = 500
driver.swipe(startX, startY, endX, endY, 1000)

// Wait for element
driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS)
```

## 🔍 Debugging

### View UI Hierarchy

Use `uiautomatorviewer` to inspect UI elements:

```bash
# Located in Android SDK tools
uiautomatorviewer
```

### Appium Inspector

Use Appium Inspector for visual element inspection:

1. Start Appium server: `appium`
2. Open Appium Inspector (download from Appium website)
3. Connect to running server
4. Inspect elements visually

### Logs

Check Appium server logs for errors:
- Appium server terminal shows all requests/responses
- Use `adb logcat` for Android logs

## ⚠️ Common Issues

### Issue: "Cannot connect to Appium server"

**Solution**: 
- Ensure Appium server is running: `appium`
- Check server URL matches test configuration
- Verify firewall isn't blocking port 4723

### Issue: "Device not found"

**Solution**:
```bash
# List devices
adb devices

# Restart ADB if needed
adb kill-server
adb start-server
```

### Issue: "APK not found"

**Solution**:
- Build APK first: `./gradlew assembleDebug`
- Update `APK_PATH` in test to absolute path
- Ensure APK path is correct relative to project root

### Issue: "Element not found"

**Solution**:
- Use `uiautomatorviewer` to find correct selectors
- Add waits: `driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS)`
- Use Accessibility IDs instead of resource IDs when possible

## 🎯 When to Use Appium

**Use Appium when**:
- ✅ Testing on real devices in CI/CD
- ✅ Cross-platform testing (Android + iOS)
- ✅ Testing complex E2E flows with backend
- ✅ Testing with actual network conditions
- ✅ Testing device-specific features (camera, GPS, etc.)

**Use Compose Testing/Espresso when**:
- ✅ Fast unit/UI tests
- ✅ Testing Compose UI components
- ✅ Quick feedback during development
- ✅ Testing individual screens/components

## 📚 Resources

- [Appium Documentation](https://appium.io/docs/en/latest/)
- [Appium Java Client](https://github.com/appium/java-client)
- [UiAutomator2 Driver](https://github.com/appium/appium-uiautomator2-driver)
- [Appium Inspector](https://github.com/appium/appium-inspector)

---

**Last Updated**: December 15, 2025











