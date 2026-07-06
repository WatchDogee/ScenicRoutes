# Android Testing Guide

**Last Updated**: December 15, 2025  
**Status**: Comprehensive guide for automated testing in Android Studio

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Types](#test-types)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide covers automated testing for the ScenicRoutes Android app. The project includes:

- **Unit Tests**: Test individual components (ViewModels, Repositories, Utils)
- **UI Tests**: Test user interface and interactions
- **Integration Tests**: Test component interactions (when applicable)

### Test Framework Stack

- **JUnit 4**: Test framework
- **Mockito**: Mocking framework
- **Turbine**: Flow testing
- **Espresso**: UI testing (already included, used by Compose Testing)
- **Compose Testing**: Jetpack Compose UI testing (built on Espresso)
- **Appium**: Cross-platform E2E testing (optional, for real device testing)
- **MockWebServer**: API mocking

---

## 📁 Test Structure

### Directory Layout

```
app/src/
├── test/                          # Unit tests (run on JVM)
│   └── java/com/scenicroutes/app/
│       ├── data/
│       │   └── repository/
│       │       ├── AuthRepositoryTest.kt
│       │       ├── RouteRepositoryTest.kt
│       │       └── ...
│       ├── ui/
│       │   └── viewmodel/
│       │       ├── MapViewModelTest.kt
│       │       ├── ProfileViewModelTest.kt
│       │       ├── TripsViewModelTest.kt
│       │       └── ...
│       └── utils/
│           ├── TestDataFactory.kt
│           └── TestHelpers.kt
│
└── androidTest/                    # UI/Instrumentation tests (run on device/emulator)
    └── java/com/scenicroutes/app/
        └── ui/
            └── screens/
                ├── MapScreenTest.kt
                ├── MapScreenUITest.kt
                ├── ProfileScreenTest.kt
                ├── TripsScreenTest.kt
                └── ...
```

### Test Utilities

#### TestDataFactory
Located at `app/src/test/java/com/scenicroutes/app/utils/TestDataFactory.kt`

Provides factory methods for creating test data:
- `createRoute()` - Create test Route objects
- `createSavedRoad()` - Create test SavedRoad objects
- `createUser()` - Create test User objects
- `createPOI()` - Create test POI objects
- `createCollection()` - Create test Collection objects
- `createWeather()` - Create test Weather objects

**Usage Example:**
```kotlin
val testRoute = TestDataFactory.createRoute(
    distance = 100.0,
    time = 3600000L
)
```

#### TestHelpers
Located at `app/src/test/java/com/scenicroutes/app/utils/TestHelpers.kt`

Provides helper functions for testing:
- `Flow<T>.getValue()` - Get first value from Flow
- `Flow<T>.collectValues()` - Collect all Flow values
- `waitForCondition()` - Wait for async conditions

---

## 🚀 Running Tests

### Running All Tests

#### From Command Line

```bash
# Run all unit tests
./gradlew testDebugUnitTest

# Run all UI tests (requires emulator/device)
./gradlew connectedDebugAndroidTest

# Run UI tests on managed device (automated, no manual emulator)
./gradlew pixel5api33DebugAndroidTest

# Run all tests with coverage
./gradlew testWithCoverage
```

#### From Android Studio

1. **Run All Unit Tests**:
   - Right-click on `app/src/test` folder
   - Select "Run 'Tests in 'test''"

2. **Run All UI Tests**:
   - Right-click on `app/src/androidTest` folder
   - Select "Run 'Tests in 'androidTest''"

3. **Run Specific Test Class**:
   - Right-click on a test file (e.g., `MapViewModelTest.kt`)
   - Select "Run 'MapViewModelTest'"

4. **Run Single Test Method**:
   - Click the green arrow next to a test method
   - Select "Run 'testMethodName'"

### Running Tests with Coverage

```bash
# Generate coverage report
./gradlew testWithCoverage

# View coverage report
# HTML report: app/build/reports/jacoco/jacocoTestReport/html/index.html
```

### Running Tests in CI/CD

The project includes managed devices for automated testing:

```bash
# Run UI tests on managed device (no manual emulator needed)
./gradlew pixel5api33DebugAndroidTest
```

---

## ✍️ Writing Tests

### Unit Test Example

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class MapViewModelTest {

    private lateinit var viewModel: MapViewModel
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        viewModel = MapViewModel()
    }

    @Test
    fun `initial routeState is Idle`() = runTest(testDispatcher) {
        // When
        val initialState = viewModel.routeState.first()

        // Then
        assertTrue(initialState is RouteState.Idle)
    }

    @Test
    fun `clearRoute resets routeState to Idle`() = runTest(testDispatcher) {
        // When
        viewModel.clearRoute()

        // Then
        viewModel.routeState.test {
            val state = awaitItem()
            assertTrue(state is RouteState.Idle)
        }
    }
}
```

### UI Test Example

```kotlin
@RunWith(AndroidJUnit4::class)
class MapScreenTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun mapScreen_displaysSearchBar() {
        // Given
        composeTestRule.setContent {
            MapScreen(navController = rememberNavController())
        }

        // Then
        composeTestRule.onNodeWithText("Search location")
            .assertIsDisplayed()
    }

    @Test
    fun mapScreen_searchBar_performsSearch() {
        // Given
        composeTestRule.setContent {
            MapScreen(navController = rememberNavController())
        }

        // When
        composeTestRule.onNodeWithText("Search location")
            .performTextInput("Riga")

        // Then
        composeTestRule.onNodeWithText("Riga")
            .assertIsDisplayed()
    }
}
```

### Testing Flows with Turbine

```kotlin
@Test
fun `viewModel state updates correctly`() = runTest {
    viewModel.someState.test {
        // Initial state
        assertEquals(State.Initial, awaitItem())
        
        // Trigger action
        viewModel.performAction()
        
        // Verify state changes
        assertEquals(State.Loading, awaitItem())
        assertEquals(State.Success(data), awaitItem())
    }
}
```

### Mocking with Mockito

```kotlin
@Test
fun `repository returns success on valid request`() = runTest {
    // Given
    val mockRepository = mock<RouteRepository>()
    val expectedRoute = TestDataFactory.createRoute()
    
    whenever(mockRepository.calculateRoute(any()))
        .thenReturn(Result.success(RouteCalculationResponse(route = expectedRoute)))
    
    // When
    val result = mockRepository.calculateRoute(request)
    
    // Then
    assertTrue(result.isSuccess)
    assertEquals(expectedRoute, result.getOrNull()?.route)
}
```

---

## 🧪 Test Types

### 1. Unit Tests (`test/`)

**Location**: `app/src/test/`

**Purpose**: Test individual components in isolation

**Examples**:
- ViewModel state management
- Repository data operations
- Utility functions
- Business logic

**Characteristics**:
- Run on JVM (fast)
- No Android framework dependencies
- Use mocks for dependencies

**Running**:
```bash
./gradlew testDebugUnitTest
```

### 2. UI Tests (`androidTest/`)

**Location**: `app/src/androidTest/`

**Purpose**: Test user interface and interactions

**Examples**:
- Screen display
- User interactions (clicks, text input)
- Navigation flows
- UI state changes

**Characteristics**:
- Run on device/emulator
- Use Android framework
- Test real UI components

**Running**:
```bash
./gradlew connectedDebugAndroidTest
# Or on managed device:
./gradlew pixel5api33DebugAndroidTest
```

#### UI Testing Options

##### A. Compose Testing (Recommended for this app)
- **Location**: `app/src/androidTest/java/com/scenicroutes/app/ui/screens/`
- **Framework**: Jetpack Compose Testing (built on Espresso)
- **Use For**: Testing Compose UI components
- **Example**: `MapScreenTest.kt`, `ProfileScreenTest.kt`

##### B. Espresso (For traditional Views)
- **Location**: `app/src/androidTest/java/com/scenicroutes/app/espresso/`
- **Framework**: Espresso (already included)
- **Use For**: Testing traditional Android Views (if any)
- **Example**: `EspressoUITest.kt`

##### C. Appium (E2E Testing)
- **Location**: `app/src/androidTest/java/com/scenicroutes/app/e2e/`
- **Framework**: Appium
- **Use For**: 
  - Testing on real devices
  - Cross-platform testing (Android + iOS)
  - Integration testing with backend
  - Complex end-to-end flows
- **Example**: `AppiumE2ETest.kt`
- **Setup Required**: See [Appium Setup](#appium-setup)

### 3. Integration Tests (Future)

**Purpose**: Test component interactions

**Examples**:
- ViewModel + Repository integration
- Navigation flows
- API integration

---

## ✅ Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

```kotlin
// ✅ Good
@Test
fun `login with valid credentials updates authentication state`()

@Test
fun `calculateRoute with API error returns failure`()

// ❌ Bad
@Test
fun test1()

@Test
fun loginTest()
```

### 2. Test Structure (AAA Pattern)

Follow Arrange-Act-Assert pattern:

```kotlin
@Test
fun `example test`() = runTest {
    // Arrange (Given)
    val input = "test"
    val expectedOutput = "TEST"
    
    // Act (When)
    val result = functionUnderTest(input)
    
    // Assert (Then)
    assertEquals(expectedOutput, result)
}
```

### 3. Use Test Data Factory

Always use `TestDataFactory` for creating test data:

```kotlin
// ✅ Good
val route = TestDataFactory.createRoute(distance = 100.0)

// ❌ Bad
val route = Route(
    distance = 100.0,
    time = 3600000L,
    geometry = emptyList(),
    // ... many more parameters
)
```

### 4. Test One Thing Per Test

Each test should verify one specific behavior:

```kotlin
// ✅ Good
@Test
fun `login with valid credentials succeeds`()

@Test
fun `login with invalid credentials fails`()

// ❌ Bad
@Test
fun `login tests`() {
    // Testing multiple scenarios in one test
}
```

### 5. Use Descriptive Assertions

Provide clear failure messages:

```kotlin
// ✅ Good
assertEquals("Expected user name", actualUser.name, "User name should match")

// ❌ Bad
assertTrue(actualUser.name == "Expected user name")
```

### 6. Mock External Dependencies

Mock repositories, API services, and other external dependencies:

```kotlin
@Test
fun `viewModel loads data from repository`() = runTest {
    // Given
    val mockRepository = mock<DataRepository>()
    whenever(mockRepository.getData()).thenReturn(flowOf(testData))
    
    // When
    val viewModel = MyViewModel(mockRepository)
    
    // Then
    assertEquals(testData, viewModel.data.first())
}
```

### 7. Test Error Cases

Don't just test happy paths - test error scenarios:

```kotlin
@Test
fun `repository handles network errors gracefully`() = runTest {
    // Given
    val networkError = IOException("Network error")
    whenever(mockRepository.getData()).thenThrow(networkError)
    
    // When
    val result = repository.getData()
    
    // Then
    assertTrue(result.isFailure)
    assertEquals("Network error", result.exceptionOrNull()?.message)
}
```

### 8. Clean Up After Tests

Use `@Before` and `@After` for setup and cleanup:

```kotlin
@Before
fun setup() {
    // Initialize test dependencies
    viewModel = MapViewModel()
}

@After
fun tearDown() {
    // Clean up if needed
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Tests Not Running

**Problem**: Tests don't execute or show as "Not run"

**Solutions**:
- Ensure test methods are annotated with `@Test`
- Check that test class is in correct package
- Verify Gradle sync completed successfully
- Clean and rebuild: `./gradlew clean build`

#### 2. Mockito Mocking Not Working

**Problem**: `whenever()` doesn't work or mocks return null

**Solutions**:
- Ensure you're using `mockito-kotlin` for Kotlin support
- Use `mock()` from `org.mockito.kotlin.mock`
- Check that method signatures match exactly

#### 3. Flow Tests Not Completing

**Problem**: Flow tests hang or timeout

**Solutions**:
- Use `runTest` with `StandardTestDispatcher`
- Use Turbine's `test { }` block for Flow testing
- Ensure coroutines complete: `advanceUntilIdle()`

#### 4. UI Tests Fail on Device

**Problem**: UI tests fail with timeout or element not found

**Solutions**:
- Increase timeout: `composeTestRule.waitForIdle(timeoutMillis = 5000)`
- Use `assertExists()` instead of `assertIsDisplayed()` for off-screen elements
- Check that test device has proper API level
- Ensure animations are disabled in test options

#### 5. Coverage Report Not Generated

**Problem**: Coverage report is empty or missing

**Solutions**:
- Run `./gradlew testWithCoverage` (not just `test`)
- Check that `enableUnitTestCoverage = true` in `build.gradle.kts`
- Verify tests actually ran (check test results)

### Debugging Tips

1. **Add Logging**:
   ```kotlin
   android.util.Log.d("Test", "Current state: ${viewModel.state.value}")
   ```

2. **Use Debugger**:
   - Set breakpoints in test code
   - Step through execution
   - Inspect variable values

3. **Print Test Output**:
   ```kotlin
   println("Test output: $value")
   ```

4. **Check Test Reports**:
   - View test results in Android Studio
   - Check HTML reports in `app/build/reports/`

---

## 📊 Test Coverage

### Current Coverage

- **ViewModels**: ~60% coverage
- **Repositories**: ~40% coverage (needs dependency injection refactoring)
- **UI Screens**: ~30% coverage (placeholder tests)

### Improving Coverage

1. **Add More Unit Tests**:
   - Complete ViewModel test coverage
   - Add Repository tests (after DI refactoring)
   - Test utility functions

2. **Add More UI Tests**:
   - Test all major user flows
   - Test error states in UI
   - Test navigation flows

3. **Add Integration Tests**:
   - Test ViewModel + Repository integration
   - Test API integration
   - Test end-to-end flows

---

## 🎯 Quick Reference

### Running Tests

```bash
# Unit tests
./gradlew testDebugUnitTest

# UI tests
./gradlew pixel5api33DebugAndroidTest

# With coverage
./gradlew testWithCoverage

# All checks (format, lint, tests, coverage)
./gradlew checkAll
```

### Test Annotations

- `@Test` - Marks a test method
- `@Before` - Runs before each test
- `@After` - Runs after each test
- `@Rule` - Defines test rules (e.g., `composeTestRule`)
- `@RunWith` - Specifies test runner

### Common Assertions

```kotlin
// Equality
assertEquals(expected, actual)
assertNotEquals(expected, actual)

// Boolean
assertTrue(condition)
assertFalse(condition)

// Null
assertNull(value)
assertNotNull(value)

// Collections
assertTrue(list.isEmpty())
assertEquals(expectedSize, list.size)
assertTrue(list.contains(item))
```

### Compose UI Testing

```kotlin
// Find elements
onNodeWithText("Text")
onNodeWithContentDescription("Description")
onAllNodesWithText("Text")

// Interactions
performClick()
performTextInput("text")
performScrollTo()

// Assertions
assertIsDisplayed()
assertExists()
assertIsEnabled()
assertTextEquals("Expected")
```

---

## 🔧 Appium Setup (Optional)

Appium is useful for end-to-end testing on real devices and cross-platform testing.

### Installation

1. **Install Node.js** (if not already installed):
   ```bash
   # Check if Node.js is installed
   node --version
   ```

2. **Install Appium**:
   ```bash
   npm install -g appium
   ```

3. **Install Appium drivers**:
   ```bash
   appium driver install uiautomator2
   ```

4. **Verify installation**:
   ```bash
   appium --version
   ```

### Running Appium Tests

1. **Build APK**:
   ```bash
   ./gradlew assembleDebug
   ```

2. **Start Appium server** (in separate terminal):
   ```bash
   appium
   ```

3. **Connect device/emulator**:
   ```bash
   adb devices
   ```

4. **Update test configuration**:
   - Edit `AppiumE2ETest.kt`
   - Update `APK_PATH` to point to your APK
   - Update `DEVICE_NAME` to match your device
   - Update `APPIUM_SERVER_URL` if needed

5. **Run tests**:
   ```bash
   ./gradlew connectedDebugAndroidTest
   ```

### Appium vs Espresso/Compose Testing

| Feature | Espresso/Compose Testing | Appium |
|---------|-------------------------|--------|
| **Speed** | Fast (runs on device) | Slower (network overhead) |
| **Setup** | Simple (already included) | Requires Appium server |
| **Platform** | Android only | Cross-platform (Android, iOS) |
| **Real Devices** | Yes (via ADB) | Yes (via Appium server) |
| **Compose Support** | Native support | Limited (uses accessibility) |
| **Best For** | Unit/UI tests, fast feedback | E2E tests, real device testing |
| **CI/CD** | Easy integration | Requires Appium server setup |

**Recommendation**: 
- Use **Compose Testing** (Espresso) for most UI tests
- Use **Appium** for:
  - Testing on real devices in CI/CD
  - Cross-platform testing (if you add iOS)
  - Complex E2E flows that need backend integration
  - Testing with actual network conditions

---

## 📚 Additional Resources

- [Android Testing Documentation](https://developer.android.com/training/testing)
- [JUnit 4 Documentation](https://junit.org/junit4/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [Turbine Documentation](https://github.com/cashapp/turbine)
- [Compose Testing Documentation](https://developer.android.com/jetpack/compose/testing)
- [Espresso Documentation](https://developer.android.com/training/testing/espresso)
- [Appium Documentation](https://appium.io/docs/en/latest/)

---

## 🆘 Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review test examples in the codebase
3. Check Android Studio test output for error messages
4. Review Gradle build output: `./gradlew testDebugUnitTest --stacktrace`

---

**Last Updated**: December 15, 2025  
**Maintained By**: Development Team











