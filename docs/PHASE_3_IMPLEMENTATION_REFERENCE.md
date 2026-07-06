# Phase 3 Implementation Details & Code Reference

## Quick Reference Guide

### Recording Pill Overlay
**Location in Code**: NavigationScreen.kt ~1250-1280  
**UI Component**: Card with Box + Row layout  
**State Variables Used**:
- `isBackgroundRecording` (collected from BackgroundRideRecordingManager)
- `isRecordingPaused` (collected from BackgroundRideRecordingManager)
- `backgroundElapsedTime` (collected from BackgroundRideRecordingManager)

**Styling**:
```kotlin
Card(
    colors = CardDefaults.cardColors(
        containerColor = if (isRecordingPaused) {
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.95f)
        } else {
            MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.95f)
        }
    ),
    shape = RoundedCornerShape(20.dp),
    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
)
```

**Conditions**:
```kotlin
if (isBackgroundRecording) {
    // Show pill
}
```

---

### Instruction Card Layout
**Location in Code**: NavigationScreen.kt ~1307-1540  
**Main Container**: Card with Column layout, fillMaxWidth(0.9f)

**Key Measurements** (Post-Reduction):
- Horizontal padding: 16.dp (was 20.dp)
- Vertical padding: 12.dp (was 16.dp)
- Spacing between elements: 3.dp (was 6.dp)
- Turn icon size: 56.dp (was 64.dp)
- Icon itself: 32.dp (was 36.dp)

**Typography Stack**:
```
1. Distance: headlineSmall (pulsing)
2. Maneuver: titleMedium, maxLines=1
3. Lane: labelMedium (conditional)
4. (Road name: REMOVED)
5. (Upcoming: COMMENTED OUT)
```

**Phase Indicator Banner**:
- APPROACHING_START: Flag icon + "Navigating to route start" + distance
- ON_ROUTE: Landscape icon + "Scenic Route" (32.dp height)

---

### Control Hierarchy
**File**: NavigationScreen.kt ~760-1080

**Layer 1 - Top-Right Controls** (Column with spacing 24.dp):
```
├─ Back Button (always visible)
├─ Menu Column (expandable)
│  ├─ Menu Toggle (always visible)
│  └─ Menu Items (animated expand/collapse):
│     ├─ Mute/Unmute
│     ├─ Reroute
│     ├─ Record Ride
│     └─ Simulate Location
└─ Start/Stop Button (always visible)
   ├─ Pause/Resume Button (only when currentInstructionIndex > 0)
   └─ Recenter Button (new, only when currentInstructionIndex > 0)
```

**Button Specifications**:
- Size: 56.dp (all FABs)
- Shape: CircleShape
- Elevation: 0.dp (flat design)
- Colors vary by function

**Pause/Resume Button**:
```kotlin
if (currentInstructionIndex > 0) {
    FloatingActionButton(
        onClick = {
            if (isNavigating) {
                navigationService.pauseNavigation()
            } else {
                navigationService.resumeNavigation()
            }
        },
        containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
        // ...
    )
}
```

**Recenter Button**:
```kotlin
if (currentInstructionIndex > 0) {
    FloatingActionButton(
        onClick = {
            mapViewRef?.let { mapView ->
                currentLocation?.let { location ->
                    mapView.controller.animateTo(location)
                    mapView.controller.setZoom(18.0)
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
        // ...
    ) {
        Icon(Icons.Default.MyLocation, contentDescription = "Recenter")
    }
}
```

---

### Camera System Updates

#### Tilt Reduction
**File**: OSMMapView.kt ~98-108

**Before**:
```kotlin
rotationX = 22f
```

**After**:
```kotlin
rotationX = 12f
```

**Related Parameters** (unchanged):
```kotlin
cameraDistance = 12f
transformOrigin = TransformOrigin(0.5f, 0.8f)
scaleX = 3.25f
scaleY = 3.25f
clip = false
```

#### Bearing Smoothing
**File**: NavigationScreen.kt ~684-709

**Implementation**:
```kotlin
var currentMapOrientation by remember { mutableStateOf(0f) }

LaunchedEffect(mapViewRef, currentBearing, isNavigating) {
    if (isNavigating && currentBearing != null) {
        mapViewRef?.let { mapView ->
            val targetOrientation = -currentBearing!!
            
            // Shortest path calculation (handles 360° wraparound)
            var delta = targetOrientation - currentMapOrientation
            if (delta > 180f) delta -= 360f
            if (delta < -180f) delta += 360f
            
            // Adaptive smoothing
            val step = when {
                kotlin.math.abs(delta) > 45f -> delta * 0.15f
                kotlin.math.abs(delta) > 2f -> delta * 0.25f
                else -> delta
            }
            
            currentMapOrientation += step
            mapView.mapOrientation = currentMapOrientation
            mapView.invalidate()
        }
    }
}
```

#### Dynamic Zoom Logic
**File**: NavigationScreen.kt ~653-667

**Current Implementation**:
```kotlin
val zoomLevel = when {
    speedKmh > 80 -> 16.5  // ~300m view
    speedKmh > 50 -> 17.0  // ~200m view
    speedKmh > 30 -> 17.5  // ~150m view
    else -> 18.0            // ~75m view
}
mapView.controller.setZoom(zoomLevel)
```

---

## State Flow Integration

### Recording State
**Source**: BackgroundRideRecordingManager  
**Collected As**:
```kotlin
val isBackgroundRecording by backgroundRecordingManager.isRecording.collectAsState()
val isRecordingPaused by backgroundRecordingManager.isPaused.collectAsState()
val backgroundElapsedTime by backgroundRecordingManager.elapsedTime.collectAsState()
```

### Navigation State
**Source**: NavigationService  
**Collected As**:
```kotlin
val currentInstruction by navigationService.currentInstruction.collectAsState()
val currentInstructionIndex by navigationService.currentInstructionIndex.collectAsState()
val currentLocation by navigationService.currentLocation.collectAsState()
val currentBearing by navigationService.currentBearing.collectAsState()
val speedKmh = (currentSpeed * 3.6).toInt()  // Computed from currentSpeed
val currentSpeedLimit by navigationService.currentSpeedLimit.collectAsState()
val isNavigating by navigationService.isNavigating.collectAsState()
```

---

## Utility Functions Used

### formatElapsedTime
**Location**: NavigationScreen.kt ~2293  
**Signature**: `fun formatElapsedTime(millis: Long): String`  
**Usage**: Converts milliseconds to "HH:MM:SS" format for recording pill  
**Example**: `3661000` ms → `"01:01:01"`

### DistanceFormatter.formatDistanceWithSettings
**Source**: DistanceFormatter utility  
**Usage**: Formats distances with user preference (km/m or mi/ft)  
**Used In**:
- Distance to next turn
- Distance to route start
- Speed badges
- Upcoming turns (commented out)

### getTurnIcon
**Location**: NavigationScreen.kt (helper function)  
**Purpose**: Maps instruction text to appropriate turn icon  
**Returns**: ImageVector (Icons.Default.*)

### extractRoadName
**Location**: NavigationScreen.kt (helper function)  
**Purpose**: Extracts road name from instruction text (REMOVED in Phase 3)

---

## Test Tags

All new/modified controls have testTag attributes:

```
"navigation_back_button"         // Back FAB
"navigation_menu_button"         // Menu toggle FAB
"navigation_unmute_button"       // Mute/unmute FAB (unmuted state)
"navigation_mute_button"         // Mute/unmute FAB (muted state)
"navigation_reroute_button"      // Reroute FAB
"navigation_record_button"       // Record ride FAB
"navigation_simulate_button"     // Simulate location FAB
"navigation_control_button"      // Start/stop navigation FAB
"navigation_pause_button"        // Pause FAB (when navigating)
"navigation_resume_button"       // Resume FAB (when paused)
"navigation_recenter_button"     // NEW: Recenter FAB
```

---

## Accessibility Considerations

### Content Descriptions
All Icons have proper contentDescription:
- "Back", "Menu", "Close menu", "Mute", "Unmute"
- "Reroute", "View Recording", "Record Ride"
- "Simulate Movement", "Start Navigation", "End Navigation"
- "Pause", "Resume", "Recenter"

### Color Contrast
- Recording pill: High contrast (error/errorContainer on surface)
- Distance text: Primary color on surface background
- Turn icon: Primary color on transparent
- Lane guidance: Secondary color on surface

### Touch Targets
All FABs: 56.dp size (Android minimum 48dp, plus padding)

---

## Performance Considerations

### Bearing Smoothing
- **Cost**: O(1) per frame (simple arithmetic)
- **Impact**: Minimal, runs in LaunchedEffect (controlled update frequency)
- **Optimization**: Could add debouncing if bearing updates > 30fps

### Zoom Updates
- **Cost**: O(1) per location update
- **Impact**: Uses existing mapView.controller.setZoom (OSMDroid optimized)
- **Optimization**: Consider throttling to 2-3 updates/second if needed

### Recording Pill
- **Cost**: O(1) recomposition when states change
- **Impact**: Minimal, small Card with simple structure
- **Optimization**: Could use remember + skipTrackingRecomposition if issues

---

## Known Gotchas

1. **MyLocation Icon**: Uses `Icons.Default.MyLocation` (not AutoMirrored version). Works fine but generates deprecation warning.

2. **Speed Computation**: Requires `currentSpeed` from NavigationService (in m/s). Must be multiplied by 3.6 for km/h conversion.

3. **MapView Reference**: Must be non-null for camera operations. Always check with `mapViewRef?.let { mapView -> ... }`.

4. **Bearing Wraparound**: The 360° wraparound math is critical. Without it, rotating from 350° to 10° would rotate the long way (340°).

5. **Recording Pill Z-Index**: Set to 21f to ensure it's above instruction card (15f) and speed badge (12f).

---

## Configuration Parameters

### Camera Tilt Angles (OSMMapView.kt)
```
Current: 12° (rotationX)
Previous: 22°
Adjustable Range: 0° (no tilt) to ~30° (very steep)
```

### Bearing Smoothing Thresholds (NavigationScreen.kt)
```
Large change (>45°):   0.15 interpolation factor
Medium change (>2°):   0.25 interpolation factor
Small change (≤2°):    Direct update (no smoothing)
```

### Zoom Levels (NavigationScreen.kt)
```
> 80 km/h:  16.5 (highway)
50-80:      17.0 (fast road)
30-50:      17.5 (town)
< 30:       18.0 (close-up)
```

### Spacing/Padding Values
```
Card width: fillMaxWidth(0.9f)
Horizontal padding: 16.dp
Vertical padding: 12.dp
Element spacing: 3.dp
FAB spacing: 24.dp
Corner radius: 14.dp (card), 20.dp (recording pill)
```

---

## Future Customization Points

### Bearing Smoothing
To adjust smoothing:
1. Edit thresholds in the `when` expression (45f, 2f)
2. Adjust interpolation factors (0.15, 0.25)
3. Add easing functions (currently linear)

### Zoom Thresholds
To adjust zoom levels:
1. Edit speed thresholds (80, 50, 30 km/h)
2. Edit zoom values (16.5, 17.0, 17.5, 18.0)

### Tilt Angle
To adjust camera tilt:
1. Edit `rotationX = 12f` in OSMMapView.kt
2. May need to adjust `scaleX`/`scaleY` for optimal overscan

### Control Visibility
To show more controls:
1. Remove the `if (currentInstructionIndex > 0)` conditions
2. Or create a separate mode for different navigation states

---

## Build & Compilation Info

**Kotlin Version**: 2.0.21  
**Gradle Version**: 8.13  
**Target API**: 34+  
**Min API**: 24

**Compile Command**:
```bash
./gradlew.bat compileDebugKotlin
```

**Build Time**: ~10s (with cache)  
**First Build**: ~15-20s (cache miss)

---

## File Size Changes

### NavigationScreen.kt
- **Before**: ~2,363 lines
- **After**: ~2,379 lines
- **Delta**: +16 lines
- **Reason**: Added recording pill + recenter button; removed road name + upcoming section (net positive due to pill)

### OSMMapView.kt
- **Before**: 323 lines
- **After**: 323 lines
- **Delta**: 0 lines (only parameter value changed)

---

## Debugging Tips

### Bearing Not Updating
- Check: Is `currentBearing` non-null and changing?
- Check: Is `isNavigating` true?
- Check: Is `mapViewRef` non-null?
- Debug: Add log statement to see `delta` calculation

### Recording Pill Not Showing
- Check: Is `isBackgroundRecording` true?
- Check: `Alignment.TopEnd` has space (might be hidden behind menu)
- Debug: Temporarily set z-index to 100f

### Zoom Not Changing
- Check: Is `speedKmh` computing correctly? (currentSpeed * 3.6)
- Check: Is location updating frequently enough?
- Debug: Add log: `Log.d("Zoom", "speedKmh=$speedKmh, zoomLevel=$zoomLevel")`

### Recenter Button Not Centering
- Check: Is `currentLocation` non-null?
- Check: Is `mapViewRef` non-null?
- Check: Is zoom level appropriate? (18.0 is close-up)
- Debug: Try `mapView.controller.setZoom(17.0)` for wider view

---

## Regression Testing Checklist

- [ ] Recording continues while pausing/resuming navigation
- [ ] Pause button appears only during active navigation
- [ ] Recenter button re-centers on tap
- [ ] Map bearing rotates smoothly (no jitter)
- [ ] Zoom adjusts based on speed in real-time
- [ ] Instruction card fits on small devices (5")
- [ ] Recording pill doesn't overlap with other UI
- [ ] Back button saves recording if active
- [ ] Menu items are accessible and functional
- [ ] Camera tilt at 12° doesn't cause disorientation

---

**Document Version**: 1.0  
**Last Updated**: Phase 3 Completion  
**Status**: Final Reference Documentation
