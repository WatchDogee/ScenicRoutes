# Practical Hybrid Rerouting Testing Guide

## Quick Start (5 Minutes)

### 1. Build and Install Latest APK

```bash
cd c:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev\android-native

# Clean build with rerouting enabled
./gradlew clean assembleDebug

# Install on emulator/device
adb install -r app\build\outputs\apk\debug\app-debug.apk

# Clear app data (fresh start)
adb shell pm clear com.scenicroutes.app.debug
```

### 2. Start GraphHopper Server (if local)

```bash
# Terminal 1: Start local GraphHopper
cd ~\Downloads\graphhopper
java -Xmx1g -Xms1g -jar graphhopper-web-X.X-SNAPSHOT.jar --datareader.file=latvia-latest.osm.pbf

# Verify it's running
curl http://localhost:8989/graphhopper/health
# Expected: {"status":"ok"}
```

### 3. Launch App and Navigate to Routes

```
1. Open ScenicRoutes app
2. Navigate to "Trips" tab
3. Select a saved route (e.g., "Balvi – Celmene – Sita")
4. Tap "Start Navigation"
5. App will calculate approach route if >50m away
```

---

## Test 1: Normal Route Following (Baseline)

**Duration**: 2 minutes  
**Objective**: Verify no false reroutes on normal driving

### Steps

```kotlin
// 1. Start navigation on a scenic route
// 2. Let the app simulate car movement for 30 seconds
// 3. Check logcat for any off-route warnings

adb logcat | grep -E "RerouteManager|OFF-ROUTE|Stage"
```

**Expected Output**:
```
D/NavigationService: === STARTING PHASE 2: ON SCENIC ROUTE ===
D/NavigationScreen: Navigation started - no reroute messages
```

**Pass Condition**: No "OFF-ROUTE CONFIRMED" messages in logcat

---

## Test 2: Stage 1 Reroute (50m Off-Route)

**Duration**: 10 minutes  
**Objective**: Verify closest-point recovery triggers correctly

### Manual Setup

```kotlin
// In NavigationScreen.kt, add test button:

Button(onClick = {
    val current = navigationService.currentLocation.value
    if (current != null) {
        // Inject point 50m north (within Stage 1)
        val testLoc = GeoPoint(
            current.latitude + 0.00045,  // ~50m north
            current.longitude + 0.00000
        )
        navigationService.injectMockLocation(testLoc)
        navTestLog = "Injected 50m off-route"
    }
}) {
    Text("Test Stage 1 (50m off)")
}

// Wait 6 seconds for hysteresis
Thread.sleep(6000)

// Verify Stage 1 is active
val stage = navigationService.rerouteState.value
assert(stage == RerouteState.CLOSEST_POINT_RECOVERY)

navTestLog = "Stage 1 confirmed!"
```

### Logcat Monitoring

```bash
adb logcat -v time | grep -E "RerouteManager|Stage 1"
```

**Expected Output**:
```
2026-01-20 16:25:00.123 D/RerouteManager: Off-route zone entered: 50m
2026-01-20 16:25:04.456 D/RerouteManager: OFF-ROUTE CONFIRMED: distance=50m, heading_mismatch=30°
2026-01-20 16:25:04.457 D/RerouteManager: Stage 1: Closest point recovery at index 12
```

**Pass Condition**: 
- ✅ "Stage 1: Closest point recovery" appears
- ✅ No API call in logcat
- ✅ After ~4 seconds, confirmed as off-route

**Failure Debugging**:
```bash
# If Stage 1 doesn't trigger, check:
adb logcat | grep "OFF_ROUTE_DURATION_MS"  # Should be 4000
adb logcat | grep "STAGE_1_THRESHOLD"      # Should be 75.0
```

---

## Test 3: Stage 2 Reroute (120m Off-Route)

**Duration**: 10 minutes  
**Objective**: Verify direct-path guidance shows overlay

### Manual Setup

```kotlin
Button(onClick = {
    val current = navigationService.currentLocation.value
    if (current != null) {
        // Inject point 120m away (Stage 2)
        val testLoc = GeoPoint(
            current.latitude + 0.0011,  // ~120m north
            current.longitude + 0.0000
        )
        navigationService.injectMockLocation(testLoc)
        navTestLog = "Injected 120m off-route"
    }
}) {
    Text("Test Stage 2 (120m off)")
}

// Wait 6 seconds for hysteresis
Thread.sleep(6000)

// Verify Stage 2 is active AND directPathGeometry is populated
val stage = navigationService.rerouteState.value
val directPath = navigationService.directPathGeometry.value

assert(stage == RerouteState.DIRECT_PATH_GUIDANCE)
assert(directPath.size == 2)  // [current, closest point]
navTestLog = "Stage 2 confirmed! Direct path has ${directPath.size} points"
```

### Visual Verification

```
1. Launch app in emulator
2. Tap "Test Stage 2 (120m off)"
3. After 6 seconds, you should see a purple/cyan LINE on the map
   from current location to the nearest point on the original route
4. This is the directPathGeometry rendering
```

### Logcat Monitoring

```bash
adb logcat | grep -E "Stage 2|DIRECT_PATH_GUIDANCE|directPathGeometry"
```

**Expected Output**:
```
D/RerouteManager: Stage 2: Direct path from current to closest point (index 45)
D/NavigationService: directPathGeometry updated with 2 points
```

**Pass Condition**:
- ✅ Stage = `DIRECT_PATH_GUIDANCE`
- ✅ Direct path has exactly 2 points
- ✅ Purple line visible on map
- ✅ No API call made

---

## Test 4: Stage 3 Reroute (800m Off-Route + API)

**Duration**: 20 minutes  
**Objective**: Verify full GraphHopper reroute, route merging

### Prerequisites

```bash
# Ensure GraphHopper is running
curl http://localhost:8989/graphhopper/health
# Should return: {"status":"ok"}

# Or use remote API (requires credentials in config)
```

### Manual Setup

```kotlin
Button(onClick = {
    val current = navigationService.currentLocation.value
    if (current != null) {
        // Inject point 800m away (Stage 3)
        val testLoc = GeoPoint(
            current.latitude + 0.0072,  // ~800m north
            current.longitude + 0.0000
        )
        navigationService.injectMockLocation(testLoc)
        navTestLog = "Injected 800m off-route - waiting for Stage 3..."
    }
}) {
    Text("Test Stage 3 (800m off)")
}

// Wait 6 seconds for hysteresis + 10+ seconds for API
Thread.sleep(16000)

// Verify Stage 3 completed and route was merged
val stage = navigationService.rerouteState.value
val isRerouting = navigationService.isRerouting.value

assert(stage == RerouteState.NONE)  // Should be back to normal after merge
assert(!isRerouting)  // Should have completed
navTestLog = "Stage 3 completed! Route merged successfully"
```

### Logcat Monitoring (Detailed)

```bash
# In one terminal, stream logs
adb logcat -v time | grep -E "RerouteManager|RouteCalculator|Stage 3|Reroute complete"

# In another terminal, start the test
# [Phone] Tap "Test Stage 3 (800m off)"
```

**Expected Output Timeline**:
```
16:25:00.123 D/RerouteManager: Off-route zone entered: 800m
16:25:04.456 D/RerouteManager: OFF-ROUTE CONFIRMED: distance=800m
16:25:04.457 D/RerouteManager: Stage 3: Requesting API reroute from (56.950,24.100) to (56.965,24.120)
16:25:04.458 D/RouteCalculator: Attempting route calculation (attempt 1/2)
16:25:04.500 I/okhttp.OkHttpClient: --> GET http://localhost:8989/graphhopper/route...
16:25:14.500 I/okhttp.OkHttpClient: <-- 200 OK (2500ms)
16:25:14.501 D/RouteCalculator: Route calculation successful: 47 points, 12 instructions
16:25:14.502 D/RerouteManager: Reroute complete: new segment=47 points, join at index 23, remaining=35 points
16:25:14.503 D/NavigationService: Reroute completed: new route with 82 points
```

**Pass Condition**:
- ✅ GraphHopper API call made (logs show GET request)
- ✅ Route calculation successful (47+ points)
- ✅ Routes merged (82 total = 47 new + 35 remaining)
- ✅ No errors in API response

**Failure Debugging**:
```bash
# If API fails
adb logcat | grep "RouteCalculator.*failed"

# Check GraphHopper is reachable
adb shell ping -c 1 localhost:8989

# Check credentials
adb shell grep -r "GRAPHHOPPER_API_KEY" /data/data/com.scenicroutes.app.debug/
```

---

## Test 5: Rate Limiting

**Duration**: 15 minutes  
**Objective**: Verify reroutes are throttled to prevent API spam

### Manual Setup

```kotlin
Button(onClick = {
    repeat(3) { attempt ->
        val current = navigationService.currentLocation.value
        if (current != null) {
            // Inject Stage 3 (800m)
            val testLoc = GeoPoint(
                current.latitude + 0.0072 + (attempt * 0.001),
                current.longitude + 0.0000
            )
            navigationService.injectMockLocation(testLoc)
            
            if (attempt == 0) {
                navTestLog = "Reroute 1/3: Triggered"
                Thread.sleep(16000)  // Wait for API completion
            } else if (attempt == 1) {
                navTestLog = "Reroute 2/3: Should be rate-limited (5s)"
                Thread.sleep(5000)   // Try within 10s window
            } else {
                navTestLog = "Reroute 3/3: Should be allowed (15s total)"
                Thread.sleep(10000)  // Try after 10s window
            }
        }
    }
}) {
    Text("Test Rate Limiting")
}
```

### Logcat Monitoring

```bash
adb logcat | grep -E "rate.limited|Requesting API|Route calculation"
```

**Expected Output**:
```
D/RouteCalculator: Route calculation successful  [1st reroute - ALLOWED]
D/RerouteManager: Reroute rate-limited (time: 5000ms, spacing: 20m)  [2nd - BLOCKED]
D/RouteCalculator: Route calculation successful  [3rd reroute - ALLOWED]
```

**Pass Condition**:
- ✅ Only 2 API calls (1st and 3rd), not 2nd
- ✅ Logs show "rate-limited" message for 2nd attempt

---

## Test 6: Heading Mismatch Validation

**Duration**: 10 minutes  
**Objective**: Verify heading check prevents false off-route

### Prerequisite

```
Device must have magnetometer/gyro sensors (real device preferred)
Emulator: Configure virtual sensors in AVD settings
```

### Manual Setup

```kotlin
Button(onClick = {
    val current = navigationService.currentLocation.value
    if (current != null) {
        // Move 100m off-route but facing back toward route
        val testLoc = GeoPoint(
            current.latitude + 0.0009,
            current.longitude + 0.0000
        )
        navigationService.injectMockLocation(testLoc)
        
        // Simulate turning to face the route (bearing aligned)
        navigationService.injectMockBearing(0f)  // Facing north
        
        navTestLog = "Injected off-route but heading toward route"
    }
}) {
    Text("Test Heading Check")
}
```

### Expected Behavior

```
Without heading validation:
  ✗ 100m off-route → Off-route after 4s

With heading validation (current):
  ✓ 100m off-route + heading aligned → No off-route (heading blocks it)
  ✓ 100m off-route + heading away → Off-route after 4s+2s
```

**Logcat**:
```bash
adb logcat | grep "HEADING_MISMATCH_THRESHOLD"
```

---

## Test 7: Approach Route (Pre-Navigation)

**Duration**: 10 minutes  
**Objective**: Verify approach route when user far from start

### Manual Setup

```kotlin
// Scenario: User is 2 km away from route start
val routeStart = GeoPoint(56.950, 24.100)  // Route start
val userPosition = GeoPoint(56.968, 24.100)  // 2 km north

// Start navigation without moving close
navigationService.startTwoPhaseNavigation(
    scenicRoute = loadedRoute,
    scenicInstructions = instructions
    // approachRoute will be auto-calculated
)
```

### Expected Behavior

```
1. Phase = APPROACHING_START
2. Approach route displayed (purple polyline)
3. Navigation instructions: "Continue for 1.9 km to route start"
4. User moves toward route
5. When <50m from start → Phase switches to ON_ROUTE
6. Scenic route displayed, scenic instructions active
```

### Logcat

```bash
adb logcat | grep -E "APPROACHING_START|PHASE 2|ON_ROUTE"
```

**Expected Output**:
```
D/NavigationService: === STARTING PHASE 1: APPROACHING ROUTE START ===
D/NavigationService: Distance to route start: 1847m
D/NavigationService: === SWITCHING TO PHASE 2: ON SCENIC ROUTE ===
```

---

## Test 8: Route Merging Verification

**Duration**: 15 minutes  
**Objective**: Verify route merging keeps original intact

### Export Routes for Verification

```kotlin
// Add this to NavigationService for debugging
fun exportRouteDebugInfo(): String {
    val json = """
    {
      "original_geometry_points": ${originalRouteGeometry.size},
      "current_active_points": ${routeGeometry.size},
      "direct_path_points": ${_directPathGeometry.value.size},
      "phase": "${_navigationPhase.value}",
      "off_route": ${_isOffRoute.value},
      "route_merge_verified": ${routeGeometry.size >= originalRouteGeometry.size}
    }
    """.trimIndent()
    return json
}

// Trigger during/after Stage 3 reroute
val info = navigationService.exportRouteDebugInfo()
Log.d("ROUTE_DEBUG", info)
```

### Logcat Capture

```bash
adb logcat | grep "ROUTE_DEBUG" > route_debug.txt
cat route_debug.txt
```

**Expected Output**:
```json
{
  "original_geometry_points": 47,
  "current_active_points": 82,
  "direct_path_points": 0,
  "phase": "ON_ROUTE",
  "off_route": false,
  "route_merge_verified": true
}
```

**Pass Condition**:
- ✅ Original unchanged: 47 points
- ✅ Active merged: 82 points (47 + 35)
- ✅ No direct path (cleared after merge)

---

## Batch Testing Script (All Tests at Once)

**Duration**: 60 minutes

```kotlin
// Create this in a test activity or companion test suite

suspend fun runFullRerouteTestSuite() {
    val results = mutableListOf<TestResult>()
    
    // Test 1: Normal following
    results.add(testNormalRouteFollowing())
    
    // Test 2: Stage 1
    results.add(testStage1Reroute())
    
    // Test 3: Stage 2
    results.add(testStage2Reroute())
    
    // Test 4: Stage 3
    results.add(testStage3Reroute())
    
    // Test 5: Rate limiting
    results.add(testRateLimiting())
    
    // Test 6: Heading validation
    results.add(testHeadingValidation())
    
    // Test 7: Approach route
    results.add(testApproachRoute())
    
    // Test 8: Route merging
    results.add(testRouteMerging())
    
    // Print report
    val passCount = results.count { it.passed }
    val totalCount = results.size
    
    Log.d("TEST_SUITE", """
        ╔════════════════════════════════════╗
        ║   REROUTING TEST SUITE RESULTS     ║
        ╠════════════════════════════════════╣
        ║ Passed: $passCount / $totalCount                ║
        ║ Failed: ${totalCount - passCount} / $totalCount                ║
        ╚════════════════════════════════════╝
    """.trimIndent())
    
    results.forEach { result ->
        Log.d("TEST_RESULT", "${result.name}: ${if (result.passed) "✅ PASS" else "❌ FAIL"}")
    }
}

data class TestResult(
    val name: String,
    val passed: Boolean,
    val message: String = ""
)
```

---

## Troubleshooting Checklist

| Issue | Check | Fix |
|-------|-------|-----|
| No off-route detection | OFF_ROUTE_DURATION_MS | Increase threshold if GPS noisy |
| False off-route triggers | HEADING_MISMATCH_THRESHOLD | Increase mismatch angle |
| API timeouts | API_TIMEOUT_MS | Increase from 10s to 15s |
| Rate limiting too aggressive | REROUTE_RATE_LIMIT_MS | Decrease from 10s to 5s |
| Route doesn't merge | Route merging logic | Check join point calculation |
| Approach route not shown | Phase detection | Verify distanceToStart > threshold |

---

## Performance Benchmarks

Expected timings:

```
Stage 1 trigger:   4.0 ± 0.5 seconds (hysteresis)
Stage 2 latency:   <100 ms (direct path overlay)
Stage 3 latency:   10-15 seconds (API + merge)
Route merge:       <50 ms
Memory per route:  ~50 KB (1000 points)
```

Monitor with:
```bash
adb shell dumpsys meminfo com.scenicroutes.app.debug | grep "TOTAL"
```

---

## Success Criteria

All tests should show these patterns:

```
✅ Normal nav: No reroute messages
✅ Stage 1: Closest-point recovery triggered
✅ Stage 2: Direct path overlay shown
✅ Stage 3: API call + route merge successful
✅ Rate limiting: Only 2 of 3 API calls made
✅ Heading: No false triggers when aligned
✅ Approach: Phase switches correctly
✅ Merging: Original route preserved in memory
```

