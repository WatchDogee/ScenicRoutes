# Test Navigation Debugging Guide

## Current Issue

Tests are running but failing because UI elements aren't found after navigation. This suggests navigation might not be completing successfully.

---

## Test Failures

All 4 tests in `RideRecordingScreenUITest` are failing:
1. `rideRecordingScreen_displaysTitle` - Can't find `ride_recording_title`
2. `rideRecordingScreen_displaysStatusCard` - Can't find `ride_recording_status_card`
3. `rideRecordingScreen_displaysStartButtonWhenNotRecording` - Can't find start button or upgrade prompt
4. `rideRecordingScreen_backButtonNavigatesBack` - Can't find `ride_recording_back_button`

---

## Possible Causes

### 1. **Navigation Not Happening**
- Menu item click might not be triggering navigation
- Bottom sheet might be dismissing without navigation
- Navigation route might be incorrect

### 2. **Screen Not Loading**
- Screen might be loading but not visible
- FeatureGate might be blocking content
- Screen might be behind another overlay

### 3. **Timing Issues**
- Screen might need more time to load
- Compose recomposition might not be complete
- Navigation animation might not be finished

---

## Test Improvements Made

### Navigation Helper Updates:
1. ✅ Increased wait times (1500ms after click)
2. ✅ Added retry logic for finding title (10 retries)
3. ✅ Using `onAllNodesWithText` for menu item (handles scrolling)
4. ✅ Better error messages

### Test Updates:
1. ✅ Handle FeatureGate upgrade prompt in status card test
2. ✅ Handle FeatureGate upgrade prompt in start button test
3. ✅ Title test expects title to always be visible (TopAppBar is outside FeatureGate)

---

## Debugging Steps

### 1. Verify Navigation Route
Check that the navigation route "recording" exists in `AppNavigation.kt`:
```kotlin
composable("recording") {
    RideRecordingScreen(navController = navController)
}
```

### 2. Check Menu Item Click
The menu item "Record Ride" should trigger:
```kotlin
onRecordRide = {
    showActionMenu = false
    navController.navigate("recording") {
        launchSingleTop = true
    }
}
```

### 3. Verify Test Tags Exist
All test tags should be in `RideRecordingScreen.kt`:
- ✅ `ride_recording_title` - Line 73 (TopAppBar title)
- ✅ `ride_recording_back_button` - Line 75 (TopAppBar navigationIcon)
- ✅ `ride_recording_status_card` - Line 115 (inside FeatureGate content)
- ✅ `ride_recording_start_button` - Line 367 (inside FeatureGate content)

### 4. Check FeatureGate Behavior
- If user has premium: All test tags should be visible
- If user doesn't have premium: Only title and back button visible (TopAppBar), upgrade prompt shown instead of status card/buttons

---

## Manual Testing

To verify navigation works manually:

1. **Run the app**
2. **Click FAB button** (bottom right)
3. **Click "Record Ride"** in the menu
4. **Verify** you see "Ride Recording" title

If this works manually but tests fail, it's a test timing/navigation issue.

---

## Next Steps

1. **Run tests again** with improved navigation helper
2. **Check logs** for any navigation-related errors
3. **Verify manually** that navigation works in the app
4. **If still failing**, consider:
   - Adding more wait time
   - Using `performScrollToNode` if menu item needs scrolling
   - Checking if bottom sheet is blocking navigation
   - Verifying navigation route is correct

---

## Expected Behavior

After clicking "Record Ride":
- Bottom sheet should dismiss
- Navigation should happen to "recording" route
- "Ride Recording" title should appear in TopAppBar
- Status card OR upgrade prompt should appear
- Back button should be visible

If any of these don't happen, navigation isn't working correctly.










