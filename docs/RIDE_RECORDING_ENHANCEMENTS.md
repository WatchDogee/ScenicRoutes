# Ride Recording Enhancements

## ✅ Implemented Features

### 1. **Enhanced Statistics Tracking**

Ride recording now tracks comprehensive statistics:

- **Distance** - Total distance traveled (km)
- **Duration** - Time elapsed during recording
- **Speed** - Average and maximum speed (km/h)
- **Elevation** - Gain, loss, max, and min elevation (meters)
- **Corner Count** - Number of corners detected using turn direction analysis

### 2. **Corner Detection Algorithm**

**How it works:**
- Analyzes GPS points in groups of 3 consecutive points
- Calculates turn angle between points using bearing calculations
- Detects transitions from left turn → right turn (or vice versa)
- This indicates exiting one corner and entering another

**Algorithm Details:**
```kotlin
// For each point (except first and last):
1. Calculate bearing from point1 → point2
2. Calculate bearing from point2 → point3
3. Calculate turn angle (difference in bearings)
4. If turn angle > threshold (15° default):
   - Mark as LEFT turn (positive angle) or RIGHT turn (negative angle)
5. When turn direction changes (LEFT → RIGHT or RIGHT → LEFT):
   - This indicates a corner transition
   - Count as a new corner
6. Apply minimum distance filter (50m default) to avoid counting GPS noise
```

**Parameters:**
- `minTurnAngle`: 15° (minimum angle to consider a turn)
- `minCornerDistance`: 50m (minimum distance between corners)

### 3. **Route Linking**

**What is Route Linking?**
Route linking allows recorded rides to be associated with planned routes. This enables:
- Comparing planned vs actual route
- Tracking which planned routes were completed
- Analyzing deviations from planned route
- Showing completion statistics

**How Hard is it to Add?**

**Difficulty: 🟢 EASY-MEDIUM** (2-4 hours)

**Why it's relatively easy:**
1. ✅ **Infrastructure exists** - `LocationTrackingService` already supports route linking
2. ✅ **Data model ready** - `SavedRoadRequest` has `route_id` field
3. ✅ **Backend ready** - Backend schema supports `route_id` (from documentation)

**What needs to be done:**

#### Step 1: Pass Route Info When Starting Recording (15 min)

When user starts recording from a calculated route, pass route information:

```kotlin
// In MapScreen or RouteInfoCard, when user clicks "Start Recording"
val currentRoute = viewModel.selectedRoute.value
if (currentRoute != null) {
    // Generate a unique route identifier
    // Options:
    // 1. Use route hash (geometry hash) - simple but not persistent
    // 2. Save route first, get ID from backend - more complex but better
    // 3. Use share token if route was shared - best option
    
    val routeId = currentRoute.shareToken ?: generateRouteHash(currentRoute.geometry)
    navController.navigate("ride_recording") {
        // Pass route info via navigation arguments
        // Or use a shared ViewModel/State
    }
}
```

#### Step 2: Update Navigation/Recording Screen (30 min)

```kotlin
// In RideRecordingScreen, accept route parameters
@Composable
fun RideRecordingScreen(
    navController: NavController,
    routeId: String? = null, // From navigation args
    routeGeometry: List<List<Double>>? = null, // From navigation args
) {
    // When starting recording:
    locationTrackingService.startTracking(
        routeId = routeId,
        routeGeometry = routeGeometry
    )
}
```

#### Step 3: Save Route Reference (Already Done ✅)

The `SavedRoadRequest` already includes `route_id`, so when saving:
```kotlin
val request = SavedRoadRequest(
    // ... other fields
    route_id = locationTrackingService.getLinkedRouteId(),
)
```

#### Step 4: Display Route Comparison (Optional, 1-2 hours)

Add UI to compare planned vs actual:
- Show both routes on map
- Calculate deviation distance
- Show completion percentage

**Total Implementation Time: 2-4 hours**

---

## 📊 Statistics Display

The recording screen now shows:

### Row 1: Distance & Duration
- Total distance traveled
- Elapsed time

### Row 2: Speed & Elevation
- Average speed (with max speed below)
- Elevation gain (with loss below)

### Row 3: Corners
- Total corners detected

---

## 🔧 Technical Details

### LocationTrackingService Enhancements

**New State Flows:**
- `trackedLocations: StateFlow<List<Location>>` - Full Location objects (includes altitude, speed)
- `cornerCount: StateFlow<Int>` - Number of corners detected
- `elevationStats: StateFlow<ElevationStats?>` - Elevation statistics
- `speedStats: StateFlow<SpeedStats?>` - Speed statistics

**New Methods:**
- `startTracking(routeId?, routeGeometry?)` - Start with route linking
- `getLinkedRouteId()` - Get linked route ID
- `getLinkedRouteGeometry()` - Get linked route geometry

### RideStatisticsCalculator

New utility class with:
- `calculateBearing()` - Calculate direction between points
- `calculateTurnAngle()` - Calculate turn angle between 3 points
- `detectCorners()` - Main corner detection algorithm
- `calculateElevationStats()` - Elevation gain/loss calculation
- `calculateSpeedStats()` - Average/max speed calculation

---

## 🚀 Usage Example

### Starting Recording from a Route

```kotlin
// In MapScreen, when user has a calculated route
val route = viewModel.selectedRoute.value
if (route != null) {
    // Option 1: Use route share token if available
    val routeId = route.shareToken
    
    // Option 2: Generate hash from geometry
    val routeId = route.geometry.hashCode().toString()
    
    // Navigate to recording screen with route info
    navController.navigate("ride_recording?routeId=$routeId")
}
```

### Recording Standalone Ride

```kotlin
// Just start recording without route linking
locationTrackingService.startTracking()
// or explicitly
locationTrackingService.startTracking(routeId = null, routeGeometry = null)
```

---

## 📝 Backend Considerations

The backend should support:
- `route_id` field in saved roads/ride recordings table
- API endpoint to fetch route by ID for comparison
- Comparison endpoint: `/api/rides/{rideId}/compare/{routeId}`

---

## ✅ Status

- ✅ Enhanced statistics tracking
- ✅ Corner detection algorithm
- ✅ Route linking infrastructure
- ✅ Statistics display in UI
- ⚠️ Route linking UI integration (needs navigation args)
- ⚠️ Route comparison UI (optional enhancement)

---

## 🎯 Next Steps

1. **Add route linking UI** (2-4 hours)
   - Pass route info when navigating to recording screen
   - Show "Recording from route" indicator
   - Display route name if available

2. **Add route comparison** (1-2 hours, optional)
   - Compare planned vs actual route
   - Show deviation analysis
   - Calculate completion percentage

3. **Add route completion prompt** (30 min, optional)
   - After saving ride, if route was linked:
   - "Did you complete this route?" prompt
   - Update route completion status










