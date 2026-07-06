# Testing Quick Start Guide

**Quick reference for running and writing tests in Android Studio**

## 🚀 Running Tests

### Run All Tests (171 tests)

**From Android Studio**:
1. **Unit Tests**: Right-click `app/src/test` → "Run 'Tests in 'test''"
2. **UI Tests**: Right-click `app/src/androidTest` → "Run 'Tests in 'androidTest''"

**From Command Line**:
```bash
# Run all unit tests (102 tests, ~2-5 minutes)
./gradlew testDebugUnitTest

# Run all UI tests (69 tests, ~10-20 minutes)
./gradlew pixel5api33DebugAndroidTest

# Run everything with coverage
./gradlew testWithCoverage

# View coverage report
# Open: app/build/reports/jacoco/jacocoTestReport/html/index.html
```

### Run Specific Test Suites

```bash
# Authentication tests (37 tests)
./gradlew testDebugUnitTest --tests "*Authentication*"
./gradlew connectedDebugAndroidTest --tests "*Authentication*"

# Route planning tests (26 tests)
./gradlew testDebugUnitTest --tests "*Route*"

# All ViewModel tests
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.ui.viewmodel.*"

# All UI flow tests
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.ui.flows.*"
```

### Run Single Test

**From Android Studio**:
- Click green arrow ▶️ next to test method

**From Command Line**:
```bash
./gradlew testDebugUnitTest --tests "com.scenicroutes.app.ui.viewmodel.AuthenticationFlowTest.login_with_valid_credentials_succeeds"
```

## 📝 Writing a New Test

### Unit Test Template

```kotlin
package com.scenicroutes.app.ui.viewmodel

import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

class MyViewModelTest {

    private lateinit var viewModel: MyViewModel

    @Before
    fun setup() {
        viewModel = MyViewModel()
    }

    @Test
    fun `test description here`() = runTest {
        // Given
        val input = "test"
        
        // When
        val result = viewModel.doSomething(input)
        
        // Then
        assertEquals("expected", result)
    }
}
```

### UI Test Template

```kotlin
package com.scenicroutes.app.ui.screens

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MyScreenTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun myScreen_displaysContent() {
        // Given
        composeTestRule.setContent {
            MyScreen()
        }

        // Then
        composeTestRule.onNodeWithText("Expected Text")
            .assertIsDisplayed()
    }
}
```

## 🧪 Common Test Patterns

### Testing StateFlow

```kotlin
@Test
fun `state updates correctly`() = runTest {
    viewModel.state.test {
        assertEquals(State.Initial, awaitItem())
        viewModel.performAction()
        assertEquals(State.Loading, awaitItem())
        assertEquals(State.Success(data), awaitItem())
    }
}
```

### Testing with Mocks

```kotlin
val mockRepository = mock<DataRepository>()
whenever(mockRepository.getData()).thenReturn(Result.success(testData))
```

### Testing User Interactions

```kotlin
composeTestRule.onNodeWithText("Button")
    .performClick()

composeTestRule.onNodeWithText("Input Field")
    .performTextInput("text")
```

## ✅ Test Checklist

- [ ] Test name describes what is being tested
- [ ] Uses AAA pattern (Arrange-Act-Assert)
- [ ] Uses `TestDataFactory` for test data
- [ ] Tests both success and error cases
- [ ] Uses descriptive assertions
- [ ] Mocks external dependencies

## 🔧 Testing Options

### Compose Testing (Recommended)
- Already set up and included
- Fast, native Compose support
- See: `MapScreenTest.kt`, `ProfileScreenTest.kt`

### Espresso
- Already included (used by Compose Testing)
- For traditional Android Views
- See: `EspressoUITest.kt`

### Appium (E2E Testing)
- Optional, for real device testing
- Cross-platform support
- See: `AppiumE2ETest.kt` and [APPIUM_SETUP.md](./APPIUM_SETUP.md)

## 📚 Full Documentation

- [ANDROID_TESTING_GUIDE.md](./ANDROID_TESTING_GUIDE.md) - Complete testing guide
- [ESPRESSO_RUNNING_GUIDE.md](./ESPRESSO_RUNNING_GUIDE.md) - How to run Espresso tests
- [APPIUM_SETUP.md](./APPIUM_SETUP.md) - Appium setup guide











