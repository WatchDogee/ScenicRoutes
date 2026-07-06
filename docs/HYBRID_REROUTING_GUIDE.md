# Hybrid Rerouting Implementation & Testing Guide

## Overview

This guide explains the fully functional hybrid navigation system with intelligent rerouting. The system uses a **3-stage approach**:

- **Stage 1 (0–75m)**: Closest-point recovery (instant, offline)
- **Stage 2 (75–200m)**: Direct-path guidance (instant, offline)
- **Stage 3 (>500m)**: Full API reroute via GraphHopper (10–15s, online)

The system **keeps the original route intact** while calculating reroutes on-the-fly, supporting seamless route merging.

---

## Architecture

### Key Components

1. **RerouteManager.kt**
   - Off-route detection with hysteresis (4-5s sustained deviation)
   - Heading validation (bearing mismatch >60° for 2s)
   - Multi-stage reroute determination
   - Rate limiting (10s between API reroutes, 50m spacing)
   - Original route preservation

2. **RouteCalculator.kt**
   - GraphHopper API wrapper with retry logic (2 retries, 1s backoff)
   - Route caching (5-minute TTL)
   - Timeout handling (10s per request)
   - Supports approach routes and reroutes

3. **NavigationService.kt** (Updated)
   - Integrates RerouteManager
   - Merges reroute segments with original route
   - Manages UI state updates
   - Handles both online (Stage 3) and offline (Stages 1–2) scenarios

4. **NavigationScreen.kt** (Enhanced)
   - Displays reroute status and indicators
   - Shows reroute stage information
   - Visual feedback: direct path overlay, reroute banner

---

## How It Works

### Off-Route Detection Flow

```
1. GPS Update → currentLocation
   ↓
2. RerouteManager.checkOffRoute()
   ├─ Find closest point on route
   ├─ Calculate distance to route
   ├─ Calculate bearing mismatch (if sensors available)
   ├─ Check hysteresis timers (4–5s sustained)
   └─ Return OffRouteState
   ↓
3. Threshold Check:
   • distance > 75m → Mark off-route zone
   • sustained >4s + heading mismatch >60° → CONFIRMED off-route
   ↓
4. Stage Determination:
   • 75–200m → Stage 2 (direct path)
   • >500m → Stage 3 (API reroute)
```

### Reroute Execution Flow

```
Stage 1: Closest Point (0–75m)
├─ Snap user to nearest route point
├─ Continue following route from that point
└─ No API call, instant

Stage 2: Direct Path (75–200m)
├─ Draw direct line from current → closest point on route
├─ Show "Redirect to route" UI indicator
└─ Transitions to Stage 1 as user approaches

Stage 3: API Reroute (>500m)
├─ Rate-limited: ≥10s apart, ≥50m spacing
├─ Call RouteCalculator.calculateReroute()
│  ├─ Current location → nearest forward point on original route
│  ├─ GraphHopper computes optimal path
│  └─ Returns new geometry + instructions
├─ Merge reroute segment with remaining original route
├─ Update active route geometry
└─ Clear off-route state, resume normal navigation
```

### Route Merging (Keeping Original Intact)

```
Original Route: A ─→ B ─→ C ─→ D ─→ E (user was following)

User goes off-route at point B and is near C

Reroute Calculation:
  Current Position → Closest point on original (C)
  New Segment: Current ─→ C (computed by GraphHopper)

Merge Result:
  Active Route: A ─→ [New Segment] ─→ C ─→ D ─→ E
  
  Original stored in memory:
  - originalRouteGeometry: [A, B, C, D, E]
  - remainingGeometry: [C, D, E] (from join point onward)
```

---

## Implementation Details

### Key Thresholds & Tuning

**File**: `RerouteManager.kt` (companion object)

```kotlin
// Distance thresholds (meters)
const val STAGE_1_THRESHOLD = 75.0      // Switch from snap to direct path
const val STAGE_2_THRESHOLD = 200.0     // Switch from direct path to API
const val STAGE_3_THRESHOLD = 500.0     // Trigger API reroute

// Off-route detection timing (milliseconds)
const val OFF_ROUTE_DURATION_MS = 4000L        // 4s sustained = off-route
const val HEADING_MISMATCH_THRESHOLD = 60f     // degrees
const val HEADING_MISMATCH_DURATION_MS = 2000L // 2s heading check

// Rate limiting
const val REROUTE_RATE_LIMIT_MS = 10000L       // 10s between API calls
const val MIN_REROUTE_SPACING_M = 50.0         // 50m minimum between reroutes
```

### Off-Route State Machine

```
                    ┌─────────────┐
                    │   ON_ROUTE  │
                    └──────┬──────┘
                           │ distance > 75m
                           ↓
    ┌──────────────────────────────────────────┐
    │  OFF-ROUTE ZONE (pending confirmation)   │
    │  ├─ distance: 75–200m                    │
    │  ├─ timer: 0–4s                          │
    │  └─ heading check: starting              │
    └────────────┬─────────────────────────────┘
                 │ if 4s sustained + heading mismatch
                 ↓
    ┌──────────────────────────────────────────┐
    │    CONFIRMED OFF-ROUTE                   │
    │    Trigger reroute stage (1/2/3)         │
    └────────────┬─────────────────────────────┘
                 │ user moves back toward route
                 ↓
    ┌──────────────────────────────────────────┐
    │   ON_ROUTE (hysteresis reset)            │
    └──────────────────────────────────────────┘
```

---

## Testing

### Test 1: Normal Navigation (Baseline)

**Objective**: Verify normal route following without off-route triggers

**Steps**:
1. Load a scenic route in NavigationScreen
2. Start navigation (Phase 2: ON_ROUTE)
3. Simulate GPS points along the route (±10m lateral noise)
4. Verify:
   - No off-route state triggered
   - Route instructions play normally
   - No reroute calculations

**Expected Logcat Output**:
```
D/NavigationService: === STARTING PHASE 2: ON SCENIC ROUTE ===
D/NavigationScreen: Navigation started, listening for GPS updates
I/outes.app.debug: --> GET http://...api/route...
```

---

### Test 2: Stage 1 Reroute (0–75m, Closest Point Recovery)

**Objective**: Verify snapping to nearest route point

**Steps**:
1. Start navigation on a scenic route
2. Use the manual reroute panel or GPS simulator to jump user **50m off-route**
3. Wait 5 seconds for hysteresis to confirm
4. Verify:
   - `isOffRoute` becomes `true`
   - `rerouteStage` = `CLOSEST_POINT_RECOVERY`
   - No API call (offline Stage 1)
   - Next instruction updates to continue from closest point
5. Simulate moving back toward route (within 75m) and verify:
   - Off-route state clears
   - Navigation resumes normally

**Expected Logcat Output**:
```
D/RerouteManager: Off-route zone entered: 50m
D/RerouteManager: OFF-ROUTE CONFIRMED: distance=50m, heading_mismatch=45°, duration=4000ms
D/RerouteManager: Stage 1: Closest point recovery at index 23
D/NavigationService: Stage 1: Closest point recovery, snapping to route index 23
```

**Testing Code** (in NavigationScreen):
```kotlin
// Manual test: Tap "Test Stage 1" button
if (/* test button pressed */) {
    val currentLoc = navigationService.currentLocation.value
    if (currentLoc != null) {
        // Inject point 60m away (within Stage 1)
        val testLoc = GeoPoint(
            currentLoc.latitude + 0.0005,  // ~55m north
            currentLoc.longitude + 0.0003  // ~33m east
        )
        navigationService.injectMockLocation(testLoc)
    }
}
```

---

### Test 3: Stage 2 Reroute (75–200m, Direct Path)

**Objective**: Verify direct-path overlay to route

**Steps**:
1. Start navigation
2. Jump user **120m off-route** (beyond Stage 1 threshold)
3. Wait 5 seconds for confirmation
4. Verify:
   - `rerouteStage` = `DIRECT_PATH_GUIDANCE`
   - `directPathGeometry` is populated (2 points: current → closest)
   - Visual overlay shows line from current to closest point
   - No API call yet
5. Move user back toward route and verify:
   - When <75m: Stage 1 active (snap)
   - When <50m: Back on route, direct path cleared

**Expected Logcat Output**:
```
D/RerouteManager: Off-route zone entered: 120m
D/RerouteManager: OFF-ROUTE CONFIRMED: distance=120m, heading_mismatch=70°
D/RerouteManager: Stage 2: Direct path from current to closest point (index 45)
D/NavigationService: directPathGeometry updated with 2 points
```

---

### Test 4: Stage 3 Reroute (>500m, Full API Reroute)

**Objective**: Verify full GraphHopper reroute with route merging

**Prerequisites**:
- GraphHopper local server running or valid API credentials configured
- Network connectivity

**Steps**:
1. Start navigation on scenic route
2. Jump user **800m off-route** (e.g., to a parallel road)
3. Wait 5 seconds for off-route confirmation
4. Verify:
   - `isRerouting` = `true`
   - `rerouteStage` = `API_REROUTING`
   - API call to GraphHopper initiated (check logcat)
5. Wait 10–15 seconds for response
6. Verify:
   - `isRerouting` = `false`
   - New route geometry loaded
   - Original route preserved in memory
   - Navigation seamlessly continues on merged route
   - `directPathGeometry` cleared

**Expected Logcat Output**:
```
D/RerouteManager: Stage 3: Requesting API reroute from (56.950, 24.105) to (56.965, 24.120)
D/RouteCalculator: Route calculation successful: 47 points, 12 instructions
D/RerouteManager: Reroute complete: new segment=47 points, join at index 23, remaining=35 points
D/NavigationService: Reroute completed: new route with 82 points
```

---

### Test 5: Rate Limiting

**Objective**: Verify reroute rate limiting prevents thrashing

**Steps**:
1. Start navigation
2. Jump user >500m off-route
3. Wait for Stage 3 reroute completion
4. Immediately jump user >500m off-route again (within 10 seconds)
5. Verify:
   - Second reroute is **not triggered** (logged as rate-limited)
   - Wait 10+ seconds, then move off-route again
6. Verify:
   - Third reroute **is triggered** (10s elapsed)

**Expected Logcat Output**:
```
D/RerouteManager: Stage 3: Requesting API reroute...
D/RouteCalculator: Route calculation successful: 45 points
[Wait 3 seconds, move off-route again]
D/RerouteManager: Reroute rate-limited (time: 3000ms, spacing: 20m)
[Wait 10 seconds, move off-route again]
D/RerouteManager: Stage 3: Requesting API reroute... (allowed)
```

---

### Test 6: Approach Route (Pre-Navigation)

**Objective**: Verify approach route when user is far from route start

**Steps**:
1. Select a scenic route
2. Don't start navigation immediately; move 500m away
3. Start navigation
4. Verify:
   - Phase = `APPROACHING_START`
   - Approach route displayed (purple line)
   - Instructions guide to route start
   - When within 50m of start → Phase switches to `ON_ROUTE`

**Expected Logcat Output**:
```
D/NavigationService: === STARTING PHASE 1: APPROACHING ROUTE START ===
D/NavigationService: Distance to route start: 485m
D/NavigationService: Phase 1 setup complete - approachRouteGeometry updated with 23 points
[Navigate toward start]
D/NavigationService: === SWITCHING TO PHASE 2: ON SCENIC ROUTE ===
```

---

### Test 7: Heading Mismatch Validation

**Objective**: Verify heading check prevents false off-route triggers

**Steps**:
1. Start navigation (ensure device has magnetometer/gyro)
2. Move user parallel to route (staying ~60m away)
3. Verify:
   - `isOffRoute` remains false (distance-only not enough)
   - Heading check timer reset each time user turns toward route
4. Rotate device heading to match route direction while off-route
5. Verify:
   - Off-route state clears (heading aligned)

**Note**: This test requires heading data from device sensors. If sensors unavailable, heading check returns 0 (no penalty).

---

### Test 8: Route Merging Verification

**Objective**: Verify original route preserved and correctly merged

**Steps**:
1. Load route with known geometry (export and verify points)
2. Trigger Stage 3 reroute
3. After completion:
   - Save current active geometry to file
   - Verify it contains: [new segment] + [remaining original]
   - Verify original geometry unchanged in memory
4. Check file:
   ```json
   {
     "originalRoute": {...47 points...},
     "rerouteSegment": {...12 points...},
     "mergedRoute": {...59 points...},
     "joinPointIndex": 8
   }
   ```

**Testing Code**:
```kotlin
// In NavigationService or test activity
fun exportRouteForVerification() {
    val original = _scenicRouteGeometry.value
    val current = routeGeometry
    val reroute = _directPathGeometry.value
    
    val json = """
    {
      "original_points": ${original.size},
      "current_points": ${current.size},
      "reroute_points": ${reroute.size},
      "merged_correctly": ${current.size > original.size || reroute.isEmpty()}
    }
    """.trimIndent()
    
    android.util.Log.d("TEST", json)
}
```

---

## Simulation for Testing

### Using NavigationScreen's Simulation Tools

The NavigationScreen includes built-in simulation for testing without real GPS:

```kotlin
// Activate car simulation (constant speed along route)
simulating = true  // Toggle checkbox

// Manual GPS injection (one-time jump)
val testPoint = GeoPoint(56.95, 24.10)
navigationService.injectMockLocation(testPoint)

// Batch simulation (for headless testing)
val offRouteTest = listOf(
    GeoPoint(56.950, 24.105),  // On route
    GeoPoint(56.955, 24.110),  // 556m off-route
    GeoPoint(56.956, 24.111),  // 612m off-route
    GeoPoint(56.950, 24.105),  // Back on route
)
offRouteTest.forEach { point ->
    navigationService.injectMockLocation(point)
    Thread.sleep(2000) // 2s between updates
}
```

---

## Debugging Tips

### Enable Verbose Logging

```kotlin
// In NavigationService or RerouteManager
const val DEBUG_VERBOSE = true

private fun debugLog(message: String) {
    if (DEBUG_VERBOSE) {
        Log.d(TAG, message)
    }
}
```

### Logcat Filter for Rerouting

```bash
# Terminal: Filter navigation-specific logs
adb logcat | grep -E "RerouteManager|RouteCalculator|NavigationService" | grep -v "Skipped"

# Filter with timestamps
adb logcat -v time | grep -E "RerouteManager|RouteCalculator"
```

### Verify GraphHopper Connectivity

```kotlin
// Test GraphHopper endpoint
fun testGraphHopperConnection(coroutineScope: CoroutineScope) {
    coroutineScope.launch {
        val result = routeRepository.calculateRouteWithRetry(
            startLatitude = 56.95,
            startLongitude = 24.10,
            endLatitude = 56.96,
            endLongitude = 24.11,
            routeType = "scenic"
        )
        Log.d("TEST", "GraphHopper reachable: ${result.first != null}")
    }
}
```

---

## Tuning for Different Scenarios

### Urban Streets (High-Speed Off-Route Detection)

```kotlin
// Shorter off-route window, stricter heading check
const val OFF_ROUTE_DURATION_MS = 2000L        // 2 seconds
const val MINOR_DETOUR_THRESHOLD = 50.0        // 50m (tighter)
const val HEADING_MISMATCH_THRESHOLD = 45f     // degrees (stricter)
const val REROUTE_RATE_LIMIT_MS = 5000L        // 5s (more frequent)
```

### Rural/Scenic Routes (Lenient Off-Route Detection)

```kotlin
// Longer window, larger thresholds (user might take intentional detours)
const val OFF_ROUTE_DURATION_MS = 8000L        // 8 seconds
const val MINOR_DETOUR_THRESHOLD = 100.0       // 100m
const val MEDIUM_DETOUR_THRESHOLD = 300.0      // 300m
const val MAJOR_DETOUR_THRESHOLD = 800.0       // 800m
const val HEADING_MISMATCH_THRESHOLD = 75f     // degrees (lenient)
```

---

## Performance Considerations

### Memory Usage

- **Original route**: ~10 KB (1000 points @ 10 bytes each)
- **Reroute segment**: ~5 KB (500 points)
- **Cache (5 routes)**: ~100 KB
- **Total**: <500 KB for full navigation stack

### API Call Costs

- **Stage 1**: 0 calls/trip
- **Stage 2**: 0 calls/trip
- **Stage 3**: 1–3 calls/trip (average; rate-limited)
- **Approach**: 1 call if >50m away at start

---

## Troubleshooting

### Issue: Reroute Not Triggering for >500m Detours

**Diagnosis**:
- Check GraphHopper server is running: `curl http://localhost:8989/graphhopper/health`
- Verify API credentials in `.env` or BuildConfig
- Check logcat for API errors

**Solution**:
```kotlin
// Add timeout extension for slow networks
const val API_TIMEOUT_MS = 15000L  // Increase from 10s
```

### Issue: Off-Route Triggered Too Easily

**Diagnosis**: Thresholds too aggressive

**Solution**:
```kotlin
// Increase distance threshold
const val MINOR_DETOUR_THRESHOLD = 100.0  // Was 75
// Increase time window
const val OFF_ROUTE_DURATION_MS = 6000L   // Was 4000
```

### Issue: Route Merging Creates Discontinuity

**Diagnosis**: Join point not selected correctly

**Solution**:
- Verify `findClosestPointOnRoute()` is finding correct index
- Log original vs. reroute endpoint distance
- Check bearing alignment at join point

```kotlin
// Debug route merge
val (joinIdx, joinPoint, distance) = findClosestPointOnRoute(currentLoc, originalRoute)
Log.d(TAG, "Join at index $joinIdx: distance to route = ${distance}m")
```

---

## Next Steps (Future Enhancements)

1. **Community feedback**: Store user reroute choices to improve scenic routing
2. **Terrain analysis**: Prefer reroutes that maintain road curvature/scenery scores
3. **Predictive rerouting**: Reroute before user gets off-route if traffic detected ahead
4. **Offline rerouting**: For Stage 3, cache nearby road graph for local computation
5. **Live traffic integration**: Reroute to avoid congestion, not just off-route

