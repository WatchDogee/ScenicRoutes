# Hybrid Rerouting API Reference & Integration Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATION SCREEN                         │
│  (Observes route state, renders map, handles GPS updates)   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              NAVIGATION SERVICE (Updated)                    │
│  - GPS location updates                                      │
│  - Turn-by-turn instructions                                │
│  - Calls RerouteManager on location updates                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│            NAVIGATION REROUTE INTEGRATION                    │
│  - Bridges NavigationService + RerouteManager               │
│  - Handles route merging                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                  ┌───────┴───────┐
                  ↓               ↓
        ┌─────────────────┐  ┌──────────────────┐
        │ REROUTE MANAGER │  │ ROUTE CALCULATOR │
        │ - Off-route     │  │ - GraphHopper    │
        │   detection     │  │   API calls      │
        │ - Stage logic   │  │ - Caching        │
        │ - Rate limiting │  │ - Retry logic    │
        └─────────────────┘  └──────────────────┘
```

---

## Core Classes

### 1. RerouteManager.kt

**Purpose**: Handle off-route detection, stage determination, and reroute logic

**Key Methods**:

```kotlin
// Check current location for off-route status
fun checkOffRoute(
    currentLocation: GeoPoint,
    routeGeometry: List<List<Double>>
): OffRouteState

// Handle off-route event and trigger appropriate stage
suspend fun handleOffRoute(
    currentLocation: GeoPoint,
    routeGeometry: List<List<Double>>,
    endPoint: GeoPoint,
    onRerouteNeeded: (GeoPoint, GeoPoint, String) -> Unit
): RerouteResult?

// Complete a reroute after API returns new route
fun completeReroute(
    newRouteGeometry: List<List<Double>>,
    originalRouteGeometry: List<List<Double>>,
    currentLocation: GeoPoint
): RerouteResult?

// Determine stage based on distance
fun determineRerouteStage(distanceToRoute: Double): RerouteStage

// Set user bearing from sensors
fun setUserBearing(bearing: Float?)

// Generate approach route for pre-navigation
fun generateApproachRoute(
    currentLocation: GeoPoint,
    routeStart: GeoPoint,
    distanceToStart: Double,
    onRouteRequested: (GeoPoint, GeoPoint, String) -> Unit
)
```

**State Flows**:

```kotlin
// Observable states
val offRouteState: StateFlow<OffRouteState>      // Complete off-route info
val isOffRoute: StateFlow<Boolean>               // Is user off-route?
val rerouteStage: StateFlow<RerouteStage>       // Which stage (1/2/3)?
val isRerouting: StateFlow<Boolean>              // API call in progress?
val directPathGeometry: StateFlow<List<List<Double>>>  // Stage 2 overlay
```

**Threshold Constants**:

```kotlin
companion object {
    // Distance thresholds (meters)
    const val STAGE_1_THRESHOLD = 75.0
    const val STAGE_2_THRESHOLD = 200.0
    const val STAGE_3_THRESHOLD = 500.0
    
    // Timing (milliseconds)
    const val OFF_ROUTE_DURATION_MS = 4000L
    const val HEADING_MISMATCH_DURATION_MS = 2000L
    const val REROUTE_RATE_LIMIT_MS = 10000L
    
    // Angles (degrees)
    const val HEADING_MISMATCH_THRESHOLD = 60f
}
```

---

### 2. RouteCalculator.kt

**Purpose**: Wrap GraphHopper API calls with retry logic, caching, and error handling

**Key Methods**:

```kotlin
// Calculate route from start to end
suspend fun calculateRoute(
    startLat: Double,
    startLon: Double,
    endLat: Double,
    endLon: Double,
    profile: String = "scenic"  // "scenic", "fastest", "shortest"
): Pair<Route?, List<RouteInstruction>>

// Calculate approach route specifically
suspend fun calculateApproachRoute(
    currentLat: Double,
    currentLon: Double,
    routeStartLat: Double,
    routeStartLon: Double,
    profile: String = "fastest"
): Pair<Route?, List<RouteInstruction>>

// Calculate reroute from current to target
suspend fun calculateReroute(
    currentLat: Double,
    currentLon: Double,
    targetLat: Double,
    targetLon: Double,
    profile: String = "scenic"
): Pair<Route?, List<RouteInstruction>>

// Clear cache (5-minute TTL)
fun clearCache()

// Get debugging info
fun getCacheStats(): String
```

**Configuration**:

```kotlin
companion object {
    const val MAX_RETRIES = 2
    const val RETRY_DELAY_MS = 1000L
    const val API_TIMEOUT_MS = 10000L  // 10 seconds
}
```

**Retry Logic**: 
- Attempts API call up to 2 times with 1-second backoff
- If timeout (10s) exceeded, tries again
- Returns null on final failure

**Caching**:
- Routes cached by start/end coordinates (rounded to 3 decimals)
- 5-minute TTL per cached route
- Saves API calls for repeated routes

---

### 3. OffRouteState (Data Class)

**Purpose**: Encapsulate complete off-route detection info

```kotlin
data class OffRouteState(
    val isOffRoute: Boolean = false,          // User is off-route?
    val distanceToRoute: Double = 0.0,        // Meters
    val closestRouteIndex: Int = 0,           // Index in geometry
    val closestPoint: GeoPoint? = null,       // Nearest route point
    val stage: RerouteStage = RerouteStage.NONE,  // Which stage
    val headingMismatch: Float = 0f,          // Degrees
    val durationMs: Long = 0L                 // How long off-route
)
```

---

### 4. RerouteResult (Data Class)

**Purpose**: Return value from reroute operations

```kotlin
data class RerouteResult(
    val originalRouteGeometry: List<List<Double>>,
    val rerouteSegment: List<List<Double>>,       // New path
    val joinPointIndex: Int,                       // Index on original
    val remainingGeometry: List<List<Double>>,    // Rest of original
    val isApproachReroute: Boolean = false
)
```

---

### 5. NavigationRerouteIntegration.kt

**Purpose**: Bridge between NavigationService and RerouteManager

**Key Methods**:

```kotlin
// Initialize with current route
fun initializeRoute(
    routeGeometry: List<List<Double>>,
    instructions: List<RouteInstruction>?
)

// Process GPS update
fun processLocationUpdate(
    currentLocation: GeoPoint,
    currentBearing: Float?,
    routeGeometry: List<List<Double>>,
    routeEndPoint: GeoPoint?
)

// Get current states
fun getOffRouteState(): OffRouteState
fun getRerouteStage(): RerouteStage
fun getDirectPathGeometry(): List<List<Double>>

// Debugging
fun getDebugInfo(): String
```

---

## Integration with NavigationService

### Step 1: Add RerouteIntegration to NavigationService

```kotlin
// In NavigationService.kt

class NavigationService(private val context: Context) {
    private lateinit var rerouteIntegration: NavigationRerouteIntegration
    
    init {
        // ... existing init code ...
        
        // Initialize rerouting
        rerouteIntegration = NavigationRerouteIntegration(this, viewModelScope)
    }
}
```

### Step 2: Initialize Route on Start Navigation

```kotlin
fun startTwoPhaseNavigation(
    scenicRoute: Route,
    scenicInstructions: List<RouteInstruction>? = null,
    approachRoute: Route? = null,
    approachInstructions: List<RouteInstruction>? = null
) {
    // ... existing code ...
    
    // Initialize rerouting with route geometry
    rerouteIntegration.initializeRoute(
        routeGeometry = scenicRoute.geometry,
        instructions = scenicInstructions
    )
}
```

### Step 3: Process GPS Updates with Rerouting

```kotlin
private fun onLocationUpdate(location: GeoPoint) {
    // ... existing location logic ...
    
    // Check for off-route and trigger rerouting
    rerouteIntegration.processLocationUpdate(
        currentLocation = location,
        currentBearing = _currentBearing.value,
        routeGeometry = routeGeometry,
        routeEndPoint = routeEndPoint
    )
}
```

### Step 4: Expose State to UI

```kotlin
// Add to NavigationService state flows
private val _rerouteStage = MutableStateFlow<RerouteStage>(RerouteStage.NONE)
val rerouteStage: StateFlow<RerouteStage> = _rerouteStage.asStateFlow()

private val _directPathGeometry = MutableStateFlow<List<List<Double>>>(emptyList())
val directPathGeometry: StateFlow<List<List<Double>>> = _directPathGeometry.asStateFlow()

// Update these in onLocationUpdate
_rerouteStage.value = rerouteIntegration.getRerouteStage()
_directPathGeometry.value = rerouteIntegration.getDirectPathGeometry()
```

---

## Integration with NavigationScreen

### Display Direct Path (Stage 2)

```kotlin
@Composable
fun NavigationScreen() {
    val directPathGeometry by navigationService.directPathGeometry.collectAsState()
    val mapViewRef = remember { mutableStateOf<MapView?>(null) }
    
    // Render direct path overlay
    LaunchedEffect(directPathGeometry) {
        val mapView = mapViewRef.value ?: return@LaunchedEffect
        
        if (directPathGeometry.isNotEmpty()) {
            val polyline = Polyline(mapView)
            polyline.setPoints(directPathGeometry.map { coord ->
                GeoPoint(coord[0], coord[1])
            })
            polyline.outlinePaint.color = Color.MAGENTA
            polyline.outlinePaint.strokeWidth = 8f
            mapView.overlayManager.add(polyline)
        }
    }
}
```

### Display Reroute Status Banner

```kotlin
@Composable
fun RerouteStatusBanner(navigationService: NavigationService) {
    val rerouteStage by navigationService.rerouteStage.collectAsState()
    val isRerouting by navigationService.isRerouting.collectAsState()
    
    when {
        isRerouting -> {
            // Show calculating banner
            Surface(
                color = Color.Yellow,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Calculating new route...")
                }
            }
        }
        
        rerouteStage == RerouteStage.DIRECT_PATH_GUIDANCE -> {
            // Show redirect banner
            Surface(
                color = Color(0xFFFF9800),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "Redirect to route",
                    modifier = Modifier.padding(12.dp),
                    color = Color.White
                )
            }
        }
        
        rerouteStage == RerouteStage.API_REROUTING -> {
            // Show rerouting banner
            Surface(
                color = Color.Blue,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    "Finding alternate route...",
                    modifier = Modifier.padding(12.dp),
                    color = Color.White
                )
            }
        }
    }
}
```

---

## Event Flow Sequence Diagram

```
User Starts Navigation
    ↓
NavigationService.startTwoPhaseNavigation()
    ↓
RerouteIntegration.initializeRoute()
    ↓
RerouteManager stores original route
    
[Continuous GPS Updates]
    ↓
LocationListener.onLocationChanged()
    ↓
NavigationService.onLocationUpdate()
    ↓
RerouteIntegration.processLocationUpdate()
    ↓
RerouteManager.checkOffRoute()
    ├─ Find closest point
    ├─ Calculate distance
    ├─ Check heading mismatch
    ├─ Apply hysteresis timers
    └─ Update OffRouteState

[If Off-Route Confirmed]
    ↓
RerouteManager.handleOffRoute()
    ├─ Stage 1: Snap to closest point (no action)
    ├─ Stage 2: Create directPathGeometry (UI shows line)
    └─ Stage 3: Call RouteCalculator
       ↓
       RouteCalculator.calculateReroute()
       ├─ Check cache first
       ├─ Call GraphHopper API if not cached
       ├─ Retry with backoff if needed
       └─ Return new route
       ↓
       RerouteManager.completeReroute()
       ├─ Merge new segment with remaining original
       ├─ Preserve original in memory
       └─ Update active route geometry
       ↓
       NavigationService.completeReroute()
       └─ Update all state flows
       ↓
       NavigationScreen observes new route
       └─ Re-renders map with merged route

[User Back On-Route]
    ↓
Distance < STAGE_1_THRESHOLD
    ↓
RerouteManager resets off-route state
    └─ Clear directPathGeometry
    └─ Reset timers
    └─ Normal navigation resumes
```

---

## Testing Checklist

- [ ] Stage 1 activates at 50–75m off-route
- [ ] Stage 2 creates 2-point direct path
- [ ] Stage 3 calls GraphHopper API
- [ ] Rate limiting prevents <10s reroutes
- [ ] Route merging preserves original
- [ ] Heading mismatch blocks false triggers
- [ ] Approach route guides to start
- [ ] Cache reduces duplicate API calls
- [ ] Heading validation (if sensors available)
- [ ] Graceful fallback on API failure

---

## Configuration & Tuning

### For Urban / High-Precision Navigation

```kotlin
// Shorter windows, stricter thresholds
const val OFF_ROUTE_DURATION_MS = 2000L
const val STAGE_1_THRESHOLD = 40.0
const val STAGE_2_THRESHOLD = 100.0
const val STAGE_3_THRESHOLD = 300.0
const val HEADING_MISMATCH_THRESHOLD = 45f
const val REROUTE_RATE_LIMIT_MS = 5000L
```

### For Rural / Scenic Navigation

```kotlin
// Longer windows, lenient thresholds
const val OFF_ROUTE_DURATION_MS = 8000L
const val STAGE_1_THRESHOLD = 100.0
const val STAGE_2_THRESHOLD = 300.0
const val STAGE_3_THRESHOLD = 800.0
const val HEADING_MISMATCH_THRESHOLD = 75f
const val REROUTE_RATE_LIMIT_MS = 15000L
```

---

## Error Handling

### GraphHopper API Failures

```kotlin
// In RouteCalculator.calculateRoute()
try {
    val result = routeRepository.calculateRouteWithRetry(...)
    // Handle result
} catch (e: Exception) {
    Log.e(TAG, "Route calculation failed: ${e.message}")
    
    // Fallback: Use Stage 2 (direct path indefinitely)
    // until user manually re-engages or GPS updates resume
    return Pair(null, emptyList())
}
```

### Network Unavailable

```kotlin
// In NavigationRerouteIntegration.processLocationUpdate()
if (routeGeometry.isEmpty()) return

// Stage 1 & 2 work offline
// Stage 3 gracefully degrades to Stage 2
val stage = rerouteManager.getRerouteStage()
if (stage == RerouteStage.API_REROUTING) {
    // No network → show direct path instead
    rerouteManager.rerouteFailed()
    // Continue with last known good route
}
```

---

## Performance Optimization

### Memory

- Original route: ~10 KB per 1000 points
- Cached routes: ~5 routes × 50 KB = 250 KB
- Total state: <500 KB

### CPU

- Off-route check: <5 ms (distance calculation)
- Route merge: <10 ms (list concatenation)
- UI render: ~16 ms per frame (normal Compose overhead)

### Network

- Stage 3 API call: 1–3 calls per trip (rate-limited)
- Cached responses: 5-minute TTL
- Typical data per route: 2–5 KB (JSON)

---

## Debugging & Logging

### Enable Verbose Logging

```kotlin
// In RerouteManager
private const val DEBUG_VERBOSE = BuildConfig.DEBUG

private fun debugLog(msg: String) {
    if (DEBUG_VERBOSE) Log.d(TAG, msg)
}
```

### Logcat Filter

```bash
# All rerouting
adb logcat | grep -E "RerouteManager|RouteCalculator"

# Off-route detection only
adb logcat | grep "OFF-ROUTE"

# Stage transitions
adb logcat | grep "Stage [1-3]"

# API calls
adb logcat | grep "GraphHopper"
```

### Export Debug Info

```kotlin
// Call periodically to log state
Log.d("NAV_DEBUG", rerouteIntegration.getDebugInfo())

// Output:
// RerouteManager Debug Info:
// - Off-route: false
// - Stage: NONE
// - Is rerouting: false
// - RouteCache: 2 entries
```

---

## Next Steps / Future Enhancements

1. **Predictive Rerouting**: Detect traffic ahead and reroute before off-route
2. **Offline Stage 3**: Download local road graph for full offline rerouting
3. **Traffic Integration**: Use real-time traffic to influence reroute choices
4. **User Preferences**: Remember which reroute choices user prefers
5. **Analytics**: Track reroute frequency and success rate


