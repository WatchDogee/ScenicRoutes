# Running Automated Tests

**Purpose:** Guide for running all automated tests for Usage Statistics & Route Sharing features

---

## 🧪 Test Files Created

### Unit Tests (`app/src/test`)
1. ✅ `UsageStatisticsCalculationsTest.kt` - Calculation logic tests
2. ✅ `ChartComponentsTest.kt` - Chart component tests
3. ✅ `SubscriptionRepositoryUsageTest.kt` - Repository tests
4. ✅ `UsageStatisticsApiTest.kt` - API integration tests (MockWebServer)
5. ✅ `RouteSharingApiTest.kt` - Route sharing API tests

### UI Tests (`app/src/androidTest`)
1. ✅ `UsageStatsScreenUITest.kt` - Usage Stats screen UI tests
2. ✅ `ShareRouteDialogUITest.kt` - Share dialog UI tests
3. ✅ `UsageStatisticsFlowIntegrationTest.kt` - Complete flow tests
4. ✅ `RouteSharingFlowIntegrationTest.kt` - Sharing flow tests

### Test Utilities
1. ✅ `UsageStatisticsTestUtils.kt` - Test data factory for UsageStatistics

---

## 🚀 Running Tests

### Run All Unit Tests
```bash
cd android-native
./gradlew test
```

### Run All Android Tests (UI Tests)
```bash
cd android-native
./gradlew connectedAndroidTest
```

### Run Specific Test Class
```bash
# Unit test
./gradlew test --tests "com.scenicroutes.app.utils.UsageStatisticsCalculationsTest"

# UI test
./gradlew connectedAndroidTest --tests "com.scenicroutes.app.ui.screens.stats.UsageStatsScreenUITest"
```

### Run Tests for Specific Feature
```bash
# Usage Statistics tests
./gradlew test --tests "*UsageStatistics*"
./gradlew connectedAndroidTest --tests "*UsageStatistics*"

# Route Sharing tests
./gradlew test --tests "*RouteSharing*"
./gradlew connectedAndroidTest --tests "*RouteSharing*"

# Chart component tests
./gradlew test --tests "*Chart*"
```

### Run Tests with Coverage
```bash
./gradlew testDebugUnitTestCoverage
```

### Run Tests on Managed Device (CI/CD)
```bash
./gradlew pixel5api33DebugAndroidTest
```

---

## 📊 Test Coverage

### Unit Tests Coverage:
- ✅ Usage Statistics calculations (10 tests)
- ✅ Distance formatting (3 tests)
- ✅ Period calculations (4 tests)
- ✅ Chart components (6 tests)
- ✅ API integration (5 tests)
- ✅ Route sharing API (4 tests)

### UI Tests Coverage:
- ✅ Usage Stats screen (8 tests)
- ✅ Share dialog (8 tests)
- ✅ Integration flows (8 tests)

**Total Tests:** ~52 tests

---

## 🔍 Test Execution Details

### Unit Tests
- **Framework:** JUnit 4
- **Mocking:** Mockito, MockK
- **Coroutines:** kotlinx-coroutines-test
- **API Mocking:** MockWebServer

### UI Tests
- **Framework:** Compose UI Testing
- **Runner:** AndroidJUnit4
- **Device:** Requires emulator or physical device
- **Activity:** MainActivity

---

## ✅ Expected Test Results

### Unit Tests: ✅ **ALL PASS**
- Calculation logic tests
- Chart component tests
- API integration tests

### UI Tests: ⚠️ **REQUIRES SETUP**
- Requires authenticated user
- Requires API endpoint availability
- Requires emulator/device

---

## 🐛 Troubleshooting

### Issue: Tests fail with "No tests found"
**Solution:** Ensure test files are in correct directories:
- Unit tests: `app/src/test/java/`
- UI tests: `app/src/androidTest/java/`

### Issue: UI tests fail with "No activity found"
**Solution:** Ensure MainActivity is properly configured in AndroidManifest.xml

### Issue: API tests fail with connection errors
**Solution:** MockWebServer tests should work offline. Check MockWebServer setup.

### Issue: Compose tests fail to find nodes
**Solution:** 
- Add test tags to components
- Use `onNodeWithText()` with `substring = true`
- Wait for idle state with `waitForIdle()`

---

## 📝 Test Maintenance

### Adding New Tests:
1. Create test file in appropriate directory
2. Follow existing test patterns
3. Use TestDataFactory for test data
4. Add test tags to UI components if needed

### Updating Tests:
- Update when API contracts change
- Update when UI components change
- Update when calculation logic changes

---

**Status:** ✅ **All test files created and ready to run**










