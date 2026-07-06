# Mock Location & Debug Button Implementation

## Summary

Added debug-mode mock location injection and playback features to enable testing navigation without physical movement.

---

## Features Implemented

### 1. **Mock Location Injection** (NavigationService.kt)
Direct injection of GPS locations for immediate testing:

```kotlin
fun injectMockLocation(latitude: Double, longitude: Double, speedMps: Float = 5f)
```

**Usage:**
- Injects a single location point
- Optionally sets speed (default 5 m/s = 18 km/h)
- Updates `currentLocation` and `currentSpeed` state flows
- Useful for unit testing or manual verification

---

### 2. **Mock Playback** (NavigationService.kt)
Auto-play locations along the route with configurable delay:

```kotlin
fun startMockPlayback(delayMs: Long = 500)
```

**Features:**
- Plays through entire route geometry automatically
- Interpolates speed based on distance between route points
- Stops automatically at route end
- Logs each point for debugging
- Can be stopped with `stopSimulation()`

**Parameters:**
- `delayMs`: Delay between location updates (default 500ms = 2 points/second)
- Adjust for slower/faster route playback

**Example Usage:**
```kotlin
// Start playback with 1 second between updates
navigationService.startMockPlayback(delayMs = 1000)

// Simulate fast movement (200ms per point)
navigationService.startMockPlayback(delayMs = 200)

// Stop anytime
navigationService.stopSimulation()
```

---

### 3. **Debug Button** (NavigationScreen.kt)
Visual button to control mock playback (only in debug builds):

**Visibility:**
- Only appears in userdebug/eng builds: `android.os.Build.TYPE == "userdebug" || "eng"`
- Only visible when navigation is active: `currentInstructionIndex > 0`
- Located in expandable menu with other controls

**Visual States:**
- **Inactive**: Gray icon (Videocam) on surface color
- **Playing**: White icon on tertiary (blue) color
- Toggles between "Start mock playback" and "Stop mock playback"

**Button Behavior:**
- Click to start: Begins route playback at 500ms/point (default)
- Shows toast: "Mock playback started - simulating route"
- Click again to stop: Halts playback and cleanup
- Shows toast: "Mock playback stopped"
- Auto-hides menu on activation

**Test Tag:** `navigation_debug_mock_button` (for automated UI testing)

---

## Implementation Details

### Files Modified

#### `NavigationService.kt`
- Added imports: `cos`, `sin`, `sqrt`, `atan2` from `kotlin.math`
- Added `injectMockLocation()` method
- Added `startMockPlayback()` method
- Added `calculateDistance()` helper (Haversine formula for lat/lon distance)

#### `NavigationScreen.kt`
- Added `isDebugMode` state check
- Added `isMockPlaybackRunning` state tracking
- Added debug button in expandable menu (conditional on `isDebugMode` && `currentInstructionIndex > 0`)
- Button uses `Videocam` icon from Material Icons

---

## Testing Guide

### Quick Test (Manual)
1. **Build debug app** on emulator or device
2. **Start navigation** by clicking "Start Navigation" button
3. **Open menu** (hamburger icon)
4. **Click "Videocam" button** (Debug: Mock Location)
5. **Observe:**
   - Distance to next turn decreases
   - Turn instructions change at correct points
   - Speed badge updates (if recording)
   - Map recenters on simulated location
   - Navigation completes at route end

### Slow Playback Test
```kotlin
navigationService.startMockPlayback(delayMs = 2000) // 0.5 points/sec
```
Good for verifying instruction timing and UI updates.

### Fast Playback Test
```kotlin
navigationService.startMockPlayback(delayMs = 100) // 10 points/sec
```
Good for stress testing and rapid navigation updates.

### Manual Injection Test
```kotlin
// Test specific location without full playback
navigationService.injectMockLocation(40.7128, -74.0060, speedMps = 10f)
navigationService.injectMockLocation(40.7159, -74.0051, speedMps = 15f)
navigationService.injectMockLocation(40.7190, -74.0042, speedMps = 5f)
```

---

## Debug Build Detection

The button only appears in debug builds because of this check:

```kotlin
val isDebugMode = android.os.Build.TYPE == "userdebug" || android.os.Build.TYPE == "eng"
```

**Build Types:**
- `userdebug`: Standard debug build
- `eng`: Engineering build
- `user`: Release build (button hidden)

To test on a release build, temporarily change to:
```kotlin
val isDebugMode = true  // For testing
```

---

## Integration with Existing Features

### Recording
Mock playback integrates seamlessly:
- Recording continues during mock playback
- Distances and durations recorded are based on simulated locations
- Perfect for testing recording without actual movement

### Navigation State
- Updates all navigation states: `currentLocation`, `currentSpeed`, `currentBearing`
- Triggers instruction changes
- Updates distance to next turn
- May trigger reroute logic (if implemented)

### Camera
- Map recenters on mock locations
- Bearing updates (if compass bearing calculation works)
- Zoom adjusts based on mock speed changes

---

## Logging Output

When playback runs, watch logcat for debug logs:

```
D/NavigationService: Starting mock playback along route with 487 points (500ms per point)
D/NavigationService: Mock: point 1/487 at 40.7128, -74.0060
D/NavigationService: Mock: point 2/487 at 40.7159, -74.0051
...
D/NavigationService: Mock playback completed
```

Each point shows in logcat for debugging route progression.

---

## Future Enhancements

1. **Playback Speed Control:**
   - Add slider to adjust delay in UI
   - Pause/resume without stopping
   - Rewind to route start

2. **GPX File Import:**
   - Load custom routes as GPX files
   - Play external routes for testing

3. **Network Simulation:**
   - Simulate offline/online transitions
   - Test offline mode detection

4. **Bearing Simulation:**
   - Calculate bearing from route direction
   - Test map rotation behavior

---

## Known Limitations

1. **Build Type Detection:**
   - Only works on actual debug builds
   - Emulator always reports `userdebug` build type
   - Cannot be enabled on release APKs without rebuild

2. **Speed Calculation:**
   - Speed interpolated from route distance only
   - Does not account for elevation changes
   - Clamped to 2-25 m/s (7-90 km/h) range

3. **Bearing:**
   - Uses device compass, not route bearing
   - Mock playback doesn't simulate heading changes
   - Use `injectMockLocation()` manually to test bearing logic

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Button doesn't appear | Check build type (must be userdebug/eng), verify navigation is active |
| Playback doesn't start | Ensure route geometry is loaded (check logcat), verify navigation started |
| Wrong speed values | Speed calculated from distance; check route geometry spacing |
| Logcat empty | Check log filter: `adb logcat \| grep NavigationService` |

---

## Code Reference

### Method Signatures
```kotlin
// Direct injection
fun injectMockLocation(latitude: Double, longitude: Double, speedMps: Float = 5f)

// Auto-playback
fun startMockPlayback(delayMs: Long = 500)

// Stop playback
fun stopSimulation()

// Check status
fun isSimulating(): Boolean

// Helper
private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double
```

---

**Status:** ✅ Build Successful | Ready for Testing
