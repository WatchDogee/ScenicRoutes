# How to Run All Android Tests

**Complete guide for running all 171+ tests**

## 🚀 Quick Start

### Run All Tests (Unit + UI)

```bash
cd android-native

# Run all unit tests
./gradlew testDebugUnitTest

# Run all UI tests (requires device/emulator)
./gradlew pixel5api33DebugAndroidTest

# Or with connected device
./gradlew connectedDebugAndroidTest
```

## 📋 Detailed Instructions

### Method 1: From Android Studio (Easiest)

#### Run All Unit Tests

1. **Open Project** in Android Studio
2. **Right-click** on `app/src/test` folder
3. **Select**: "Run 'Tests in 'test''"
4. **Wait** for all tests to complete
5. **View results** in the Run window

#### Run All UI Tests

1. **Connect device/emulator** or use managed device
2. **Right-click** on `app/src/androidTest` folder
3. **Select**: "Run 'Tests in 'androidTest''"
4. **Wait** for tests to complete
5. **View results** in the Run window

### Method 2: From Command Line

#### Prerequisites

1. **Navigate to project directory**:
   ```bash
   cd android-native
   ```

2. **For UI tests, ensure device/emulator is connected**:
   ```bash
   adb devices
   ```
   You should see your device listed.

#### Run All Unit Tests

```bash
# Run all unit tests
./gradlew testDebugUnitTest

# Run with verbose output
./gradlew testDebugUnitTest --info

# Run with stacktrace on failure
./gradlew testDebugUnitTest --stacktrace
```

#### Run All UI Tests

**Option A: Using Managed Device (Recommended - No manual emulator needed)**
```bash
# Uses automatically managed device (pixel5api33)
./gradlew pixel5api33DebugAndroidTest
```

**Option B: Using Connected Device/Emulator**
```bash
# First, ensure device is connected
adb devices

# Then run tests
./gradlew connectedDebugAndroidTest
```

#### Run All Tests with Coverage

```bash
# Run unit tests with coverage
./gradlew testWithCoverage

# View coverage report
# Open: app/build/reports/jacoco/jacocoTestReport/html/index.html
```

### Method 3: Run Specific Test Suites

#### Run Authentication Tests Only

```bash
# Unit tests
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.ui.viewmodel.AuthenticationFlowTest"

# UI tests
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.ui.flows.AuthenticationFlowUITest"
```

#### Run Route Planning Tests Only

```bash
# Unit tests
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.ui.viewmodel.RoutePlanningTest"

# UI tests
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.ui.flows.RoutePlanningFlowUITest"
```

#### Run All ViewModel Tests

```bash
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.ui.viewmodel.*"
```

#### Run All Repository Tests

```bash
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.data.repository.*"
```

#### Run All Flow Tests

```bash
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.ui.flows.*"
```

#### Run All Screen Tests

```bash
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.ui.screens.*"
```

## 📊 Test Execution Summary

### Complete Test Run

```bash
# Step 1: Run all unit tests (fast, ~2-5 minutes)
./gradlew testDebugUnitTest

# Step 2: Run all UI tests (slower, ~10-20 minutes)
./gradlew pixel5api33DebugAndroidTest

# Step 3: Generate coverage report
./gradlew testWithCoverage
```

### Quick Test Run (Unit Tests Only)

```bash
# Fast feedback - unit tests only (~2-5 minutes)
./gradlew testDebugUnitTest
```

## 🔍 Viewing Test Results

### In Android Studio

After running tests:
1. **Run window** shows test results
2. **Green checkmarks** = Passed tests
3. **Red X** = Failed tests
4. **Click on failed tests** to see error details
5. **Test output** shows logs and stack traces

### From Command Line

#### View Test Reports

**Unit Test Reports**:
```
app/build/reports/tests/testDebugUnitTest/index.html
```

**UI Test Reports**:
```
app/build/reports/androidTests/connected/index.html
```

**Coverage Report**:
```
app/build/reports/jacoco/jacocoTestReport/html/index.html
```

Open these HTML files in a browser to see detailed results.

#### View Test Output in Terminal

```bash
# Run with verbose output
./gradlew testDebugUnitTest --info

# Run with debug output
./gradlew testDebugUnitTest --debug
```

## 📱 Device Setup for UI Tests

### Option 1: Managed Device (Easiest)

No setup needed! The project is configured with a managed device:

```bash
./gradlew pixel5api33DebugAndroidTest
```

This automatically:
- Creates an emulator
- Runs tests
- Cleans up

### Option 2: Physical Device

1. **Enable USB Debugging**:
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

### Option 3: Emulator

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

## 🎯 Running Tests by Category

### Authentication Tests (37 tests)

```bash
# Unit tests
./gradlew testDebugUnitTest --tests "*Authentication*"

# UI tests
./gradlew connectedDebugAndroidTest --tests "*Authentication*"
```

### Route Planning Tests (26 tests)

```bash
# Unit tests
./gradlew testDebugUnitTest --tests "*Route*"

# UI tests
./gradlew connectedDebugAndroidTest --tests "*Route*"
```

### Social Features Tests (6 tests)

```bash
./gradlew testDebugUnitTest --tests "*Social*"
```

### Edge Cases Tests (10 tests)

```bash
./gradlew testDebugUnitTest --tests "*EdgeCases*"
```

### User Flow Tests (7 tests)

```bash
./gradlew connectedDebugAndroidTest --tests "*CompleteUserFlow*"
```

## ⚡ Performance Tips

### Run Tests in Parallel

```bash
# Run tests with parallel execution
./gradlew testDebugUnitTest --parallel
```

### Run Only Failed Tests

```bash
# After a test run, rerun only failed tests
./gradlew testDebugUnitTest --rerun-tasks
```

### Skip Tests (Build Only)

```bash
# Build without running tests
./gradlew assembleDebug -x test -x connectedDebugAndroidTest
```

## 🐛 Troubleshooting

### Issue: "No tests found"

**Solution**:
- Ensure test files are in correct directories (`test/` or `androidTest/`)
- Check that test methods are annotated with `@Test`
- Verify test class names end with `Test`

### Issue: "Device not found" (UI tests)

**Solution**:
```bash
# Check devices
adb devices

# Restart ADB
adb kill-server
adb start-server

# Verify again
adb devices
```

### Issue: Tests timeout

**Solution**:
- Increase timeout in `build.gradle.kts`:
  ```kotlin
  testOptions {
      unitTests {
          timeoutInMs = 60000 // 60 seconds
      }
  }
  ```

### Issue: Out of memory

**Solution**:
```bash
# Increase heap size
export GRADLE_OPTS="-Xmx2048m"
./gradlew testDebugUnitTest
```

## 📈 Test Execution Times

Expected execution times:
- **Unit Tests**: 2-5 minutes (102 tests)
- **UI Tests**: 10-20 minutes (69 tests)
- **All Tests**: 15-25 minutes (171 tests)

## ✅ Verification

After running tests, verify:

1. **All tests pass** (green checkmarks)
2. **Coverage report generated** (if using `testWithCoverage`)
3. **No compilation errors**
4. **Test reports available** in `app/build/reports/`

## 🎯 Quick Reference Commands

```bash
# Run everything
./gradlew testDebugUnitTest pixel5api33DebugAndroidTest

# Run with coverage
./gradlew testWithCoverage

# Run specific test class
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.ui.viewmodel.AuthenticationFlowTest"

# Run specific test method
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.ui.viewmodel.AuthenticationFlowTest.login_with_valid_credentials_succeeds"

# Clean and rebuild tests
./gradlew clean testDebugUnitTest

# View test results
# Open: app/build/reports/tests/testDebugUnitTest/index.html
```

## 📚 Related Documentation

- [ANDROID_TESTING_GUIDE.md](./ANDROID_TESTING_GUIDE.md) - Complete testing guide
- [TESTING_QUICK_START.md](./TESTING_QUICK_START.md) - Quick reference
- [ESPRESSO_RUNNING_GUIDE.md](./ESPRESSO_RUNNING_GUIDE.md) - Espresso guide
- [TEST_COUNT_SUMMARY.md](./TEST_COUNT_SUMMARY.md) - Test breakdown

---

**Last Updated**: December 15, 2025










