# How to Run Espresso Tests

**Quick guide for running Espresso tests in Android Studio**

## ✅ Espresso is Already Set Up!

Espresso is already included in your project via:
- `androidx.test.espresso:espresso-core:3.5.1` in `build.gradle.kts`
- Example test file: `app/src/androidTest/java/com/scenicroutes/app/espresso/EspressoUITest.kt`

## 🚀 Running Espresso Tests

### Method 1: From Android Studio (Easiest)

#### Run All Espresso Tests

1. **Open Project View** in Android Studio
2. **Navigate to**: `app/src/androidTest/java/com/scenicroutes/app/espresso/`
3. **Right-click** on `EspressoUITest.kt`
4. **Select**: "Run 'EspressoUITest'"

#### Run Single Test Method

1. **Open** `EspressoUITest.kt` in editor
2. **Click** the green arrow ▶️ next to any `@Test` method
3. **Select**: "Run 'test_methodName'"

#### Run All Android Tests (Including Espresso)

1. **Right-click** on `app/src/androidTest` folder
2. **Select**: "Run 'Tests in 'androidTest''"

### Method 2: From Command Line

#### Prerequisites

1. **Connect device/emulator**:
   ```bash
   adb devices
   ```
   You should see your device listed:
   ```
   List of devices attached
   emulator-5554    device
   ```

2. **Build the app** (if not already built):
   ```bash
   cd android-native
   ./gradlew assembleDebug
   ```

#### Run All Espresso/Android Tests

```bash
# Run all Android tests (includes Espresso)
./gradlew connectedDebugAndroidTest

# Or run on managed device (no manual emulator needed)
./gradlew pixel5api33DebugAndroidTest
```

#### Run Specific Espresso Test Class

```bash
# Run only EspressoUITest
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.espresso.EspressoUITest"
```

#### Run Specific Test Method

```bash
# Run single test method
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.espresso.EspressoUITest.test_appLaunches"
```

### Method 3: Using Gradle Tasks

```bash
# Run all Android tests
./gradlew connectedDebugAndroidTest

# Run with coverage
./gradlew connectedDebugAndroidTest jacocoTestReport

# View test results
# HTML report: app/build/reports/androidTests/connected/index.html
```

## 📱 Device/Emulator Setup

### Option 1: Use Managed Device (Recommended)

The project is configured with a managed device. No manual setup needed:

```bash
./gradlew pixel5api33DebugAndroidTest
```

### Option 2: Use Physical Device

1. **Enable USB Debugging** on your Android device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect device** via USB

3. **Verify connection**:
   ```bash
   adb devices
   ```

4. **Run tests**:
   ```bash
   ./gradlew connectedDebugAndroidTest
   ```

### Option 3: Use Emulator

1. **Start emulator** from Android Studio:
   - Tools → Device Manager → Start emulator

2. **Verify connection**:
   ```bash
   adb devices
   ```

3. **Run tests**:
   ```bash
   ./gradlew connectedDebugAndroidTest
   ```

## 🔍 Viewing Test Results

### In Android Studio

After running tests, results appear in the **Run** window:
- ✅ Green = Passed
- ❌ Red = Failed
- Click on failed tests to see error details

### From Command Line

Test results are saved to:
```
app/build/reports/androidTests/connected/index.html
```

Open this file in a browser to see detailed results.

## 📝 Writing Espresso Tests

### Basic Espresso Test Structure

```kotlin
@RunWith(AndroidJUnit4::class)
class MyEspressoTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun test_example() {
        // Find view by ID
        onView(withId(R.id.button))
            .perform(click())
        
        // Verify view is displayed
        onView(withId(R.id.result))
            .check(matches(isDisplayed()))
    }
}
```

### Common Espresso Actions

```kotlin
// Click
onView(withId(R.id.button)).perform(click())

// Type text
onView(withId(R.id.editText))
    .perform(typeText("Hello"), closeSoftKeyboard())

// Scroll
onView(withId(R.id.scrollView))
    .perform(scrollTo())

// Swipe
onView(withId(R.id.view))
    .perform(swipeLeft())
```

### Common Espresso Assertions

```kotlin
// Check if displayed
onView(withId(R.id.view))
    .check(matches(isDisplayed()))

// Check text
onView(withId(R.id.textView))
    .check(matches(withText("Expected Text")))

// Check if enabled
onView(withId(R.id.button))
    .check(matches(isEnabled()))
```

## ⚠️ Important Notes

### Espresso vs Compose Testing

Since your app uses **Jetpack Compose**, you have two options:

1. **Compose Testing** (Recommended for Compose UI)
   - Location: `app/src/androidTest/java/com/scenicroutes/app/ui/screens/`
   - Files: `MapScreenTest.kt`, `ProfileScreenTest.kt`, etc.
   - Uses Compose Testing API (built on Espresso)

2. **Direct Espresso** (For traditional Views)
   - Location: `app/src/androidTest/java/com/scenicroutes/app/espresso/`
   - File: `EspressoUITest.kt`
   - Use only if you have traditional Android Views

**Recommendation**: Use Compose Testing for Compose UI, Espresso only for traditional Views.

## 🐛 Troubleshooting

### Issue: "No connected devices"

**Solution**:
```bash
# Check devices
adb devices

# Restart ADB if needed
adb kill-server
adb start-server

# Verify device is connected
adb devices
```

### Issue: "Test execution failed"

**Solution**:
- Ensure app is built: `./gradlew assembleDebug`
- Check device has enough storage
- Verify app is installed on device
- Check logcat for errors: `adb logcat`

### Issue: "Element not found"

**Solution**:
- Verify view IDs are correct
- Add waits if needed:
  ```kotlin
  onView(withId(R.id.view))
      .check(matches(isDisplayed()))
  ```
- Use `uiautomatorviewer` to inspect UI:
  ```bash
  uiautomatorviewer
  ```

### Issue: Tests run but nothing happens

**Solution**:
- Check that test methods are annotated with `@Test`
- Verify `@RunWith(AndroidJUnit4::class)` is present
- Check test class is in `androidTest` folder (not `test`)

## 📚 Quick Reference

```bash
# Run all Android tests (includes Espresso)
./gradlew connectedDebugAndroidTest

# Run specific test class
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.espresso.EspressoUITest"

# Run with coverage
./gradlew connectedDebugAndroidTest jacocoTestReport

# View results
# Open: app/build/reports/androidTests/connected/index.html
```

## 🎯 Next Steps

1. **Run the example test**: Right-click `EspressoUITest.kt` → Run
2. **Write your own tests**: Add test methods to `EspressoUITest.kt`
3. **Use Compose Testing**: For Compose UI, use `MapScreenTest.kt` as reference

---

**Need Help?** See [ANDROID_TESTING_GUIDE.md](./ANDROID_TESTING_GUIDE.md) for complete documentation.











