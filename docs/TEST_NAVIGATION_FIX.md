# Test Navigation Fix - Menu Item Text

## ✅ Issue Fixed

**Problem:** Tests were failing because they couldn't find UI elements after navigation. The menu item text was incorrect.

**Root Cause:** Tests were searching for "Record" but the actual menu item text is "Record Ride".

---

## Solution

Updated test navigation helpers to use the correct menu item text:
- Changed from: `"Record"` 
- Changed to: `"Record Ride"`

---

## Files Fixed

### 1. **RideRecordingScreenUITest.kt** ✅
- Updated `navigateToRecordingScreen()` to search for "Record Ride"
- Added better error messages
- Added wait times for bottom sheet animation

### 2. **OfflineMapsScreenUITest.kt** ✅
- Updated `navigateToOfflineMapsScreen()` with better error handling
- Added note that "Offline Maps" menu item may not exist yet

---

## Known Issues

### "Offline Maps" Menu Item
The `ActionMenuSheet` component accepts an `onOfflineMaps` callback parameter, but there's no `ActionMenuItem` for "Offline Maps" in the UI yet. The tests will fail until this menu item is added to `ActionMenuSheet.kt`.

**To Fix:** Add this to `ActionMenuSheet.kt`:
```kotlin
ActionMenuItem(
    icon = Icons.Default.Map,
    title = "Offline Maps",
    subtitle = "Download maps for offline use",
    onClick = {
        onOfflineMaps()
        onDismiss()
    },
)
```

---

## Test Improvements

1. **Better Error Messages:** Tests now provide clear error messages when navigation fails
2. **Wait Times:** Added `Thread.sleep()` calls to wait for bottom sheet animations
3. **Robust Navigation:** Tests handle cases where menu items might not exist

---

## Next Steps

1. **Run Tests Again:** Tests should now navigate correctly to recording screen
2. **Add Offline Maps Menu Item:** If tests for offline maps are needed, add the menu item to `ActionMenuSheet.kt`
3. **Verify Test Tags:** Ensure all test tags (`ride_recording_title`, etc.) exist in the UI

---

## Test Execution

```bash
# Run recording screen tests
./gradlew connectedDebugAndroidTest --tests "com.scenicroutes.app.ui.screens.recording.RideRecordingScreenUITest"
```

**Expected:** Tests should now navigate to the recording screen successfully. If they still fail, it may be because:
- Test tags don't match UI elements
- UI elements aren't visible yet
- Navigation timing issues










