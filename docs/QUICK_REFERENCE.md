# Hybrid Rerouting - Quick Reference Card

## 🎯 One-Minute Overview

**What**: Intelligent 3-stage rerouting system that detects when user goes off-route and automatically calculates best recovery path.

**Why**: Seamless navigation even when user misses turns; keeps scenic route integrity.

**How**: 
- Stage 1 (0–75m): Snap to closest point
- Stage 2 (75–200m): Show direct path overlay
- Stage 3 (>500m): Call GraphHopper API for full reroute

---

## 📁 Files to Add

```
android-native/app/src/main/java/com/scenicroutes/app/data/service/
├── RerouteManager.kt              (489 lines)
├── RouteCalculator.kt              (137 lines)
├── NavigationRerouteIntegration.kt (205 lines)
└── RerouteManagerTest.kt           (356 lines)
```

---

## 🔗 Integration Points

### 1. In NavigationService.kt

```kotlin
// Add field
private lateinit var rerouteIntegration: NavigationRerouteIntegration

// In init or startTwoPhaseNavigation()
rerouteIntegration = NavigationRerouteIntegration(this, viewModelScope)
rerouteIntegration.initializeRoute(routeGeometry, instructions)

// In location update callback
rerouteIntegration.processLocationUpdate(
    currentLocation = location,
    currentBearing = bearing,
    routeGeometry = routeGeometry,
    routeEndPoint = endPoint
)

// Expose states
private val _rerouteStage = MutableStateFlow<RerouteStage>(RerouteStage.NONE)
val rerouteStage: StateFlow<RerouteStage> = _rerouteStage.asStateFlow()
```

### 2. In NavigationScreen.kt

```kotlin
// Observe reroute stage
val rerouteStage by navigationService.rerouteStage.collectAsState()

// Render direct path (Stage 2)
val directPath by navigationService.directPathGeometry.collectAsState()
if (directPath.isNotEmpty()) {
    renderPolyline(directPath, color = Color.Magenta, width = 8f)
}

// Show status banner
when (rerouteStage) {
    RerouteStage.DIRECT_PATH_GUIDANCE → 
        ShowBanner("Redirect to route", color = Orange)
    RerouteStage.API_REROUTING → 
        ShowBanner("Calculating new route...", showSpinner = true, color = Blue)
}
```

---

## 🧪 Quick Tests (Copy-Paste)

### Test Stage 1 (50m off-route)
```bash
# In NavigationScreen button click:
val testLoc = GeoPoint(
    currentLoc.latitude + 0.00045,    # ~50m north
    currentLoc.longitude + 0.0000
)
navigationService.injectMockLocation(testLoc)
Thread.sleep(6000)  # Wait for hysteresis
# Expected: rerouteStage == CLOSEST_POINT_RECOVERY
```

### Test Stage 2 (120m off-route)
```bash
val testLoc = GeoPoint(
    currentLoc.latitude + 0.0011,     # ~120m north
    currentLoc.longitude + 0.0000
)
navigationService.injectMockLocation(testLoc)
Thread.sleep(6000)
# Expected: rerouteStage == DIRECT_PATH_GUIDANCE
#           directPathGeometry.size == 2
```

### Test Stage 3 (800m off-route)
```bash
val testLoc = GeoPoint(
    currentLoc.latitude + 0.0072,     # ~800m north
    currentLoc.longitude + 0.0000
)
navigationService.injectMockLocation(testLoc)
Thread.sleep(16000)  # Wait for API (~10s) + merge
# Expected: rerouteStage == NONE
#           Route merged seamlessly
```

---

## 🔍 Logcat Filters

```bash
# All rerouting events
adb logcat | grep -E "RerouteManager|RouteCalculator"

# Off-route confirmation
adb logcat | grep "OFF-ROUTE CONFIRMED"

# Stage transitions
adb logcat | grep "Stage [1-3]"

# API success
adb logcat | grep "Route calculation successful"

# Rate limiting
adb logcat | grep "rate.limited"
```

---

## ⚙️ Key Thresholds

```kotlin
// In RerouteManager.kt companion object

// Distance (meters)
const val STAGE_1_THRESHOLD = 75.0
const val STAGE_2_THRESHOLD = 200.0
const val STAGE_3_THRESHOLD = 500.0

// Timing (milliseconds)
const val OFF_ROUTE_DURATION_MS = 4000L          // 4 seconds
const val HEADING_MISMATCH_THRESHOLD = 60f       // degrees
const val REROUTE_RATE_LIMIT_MS = 10000L         // 10 seconds

// Spacing
const val MIN_REROUTE_SPACING_M = 50.0           // meters
```

### Adjust for Your Needs:
- **Urban/Precise**: Shorter timings (2–3s), stricter distances
- **Rural/Scenic**: Longer timings (6–8s), larger distances

---

## 🚀 Testing Workflow

```
1. Build & install APK
   ./gradlew clean assembleDebug
   adb install -r app/build/outputs/apk/debug/app-debug.apk

2. Start GraphHopper (if local)
   java -Xmx1g -jar graphhopper-web.jar --datareader.file=latvia.osm.pbf

3. Launch app, select route, start navigation

4. In separate terminal, monitor logs
   adb logcat | grep -E "RerouteManager|Stage"

5. Run tests (tap buttons on screen or via code)
   - Test Stage 1 button (50m)
   - Test Stage 2 button (120m)
   - Test Stage 3 button (800m)

6. Verify logcat matches expected output
   See PRACTICAL_TESTING_GUIDE.md for detailed expectations
```

---

## 🎓 Documentation Map

| Need | Document |
|------|----------|
| Understand architecture | HYBRID_REROUTING_GUIDE.md |
| Step-by-step testing | PRACTICAL_TESTING_GUIDE.md |
| API reference | REROUTING_API_REFERENCE.md |
| Complete summary | IMPLEMENTATION_COMPLETE.md |
| Source code | RerouteManager.kt, RouteCalculator.kt, etc. |

---

## 🐛 Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Stage 1 doesn't trigger | OFF_ROUTE_DURATION_MS too high | Reduce to 2–3 seconds |
| Stage 3 never calls API | GraphHopper not running | Start server; verify connectivity |
| False off-route triggers | Heading check disabled or too strict | Increase HEADING_MISMATCH_THRESHOLD |
| Route doesn't merge | Join point calculation wrong | Check `findClosestPointOnRoute()` |
| Rate limiting blocks needed reroute | REROUTE_RATE_LIMIT_MS too high | Reduce from 10s to 5s |
| API timeout errors | Network slow or server overloaded | Increase API_TIMEOUT_MS to 15s |

---

## ✅ Success Checklist

After integration, verify:

- [ ] App builds without errors
- [ ] NavigationService initializes rerouteIntegration
- [ ] GPS updates trigger processLocationUpdate
- [ ] Test Stage 1: 50m → CLOSEST_POINT_RECOVERY
- [ ] Test Stage 2: 120m → DIRECT_PATH_GUIDANCE + purple line
- [ ] Test Stage 3: 800m → API call + route merge
- [ ] Rate limiting: 2nd reroute blocked, 3rd allowed (after 10s)
- [ ] Logcat shows clean Stage progression
- [ ] Original route preserved in memory
- [ ] No crashes in release build

---

## 🔧 Configuration Profiles

### Urban Streets
```kotlin
const val OFF_ROUTE_DURATION_MS = 2000L
const val STAGE_1_THRESHOLD = 40.0
const val STAGE_2_THRESHOLD = 100.0
const val HEADING_MISMATCH_THRESHOLD = 45f
```

### Scenic/Rural Roads
```kotlin
const val OFF_ROUTE_DURATION_MS = 8000L
const val STAGE_1_THRESHOLD = 100.0
const val STAGE_2_THRESHOLD = 300.0
const val HEADING_MISMATCH_THRESHOLD = 75f
```

---

## 📞 Need Help?

1. **Check logcat**: grep for "RerouteManager", "Stage", "OFF-ROUTE"
2. **Review test guide**: PRACTICAL_TESTING_GUIDE.md has detailed expected output
3. **Enable verbose logging**: Set `DEBUG_VERBOSE = true` in RerouteManager
4. **Read API reference**: REROUTING_API_REFERENCE.md explains all methods
5. **Run tests systematically**: Start with Test 1 (normal nav), work up to Test 8

---

## 🎯 What You're Building

A navigation system that **knows when you've gone off-route** and **automatically calculates the best way back**, all while **keeping your original scenic route intact** and **minimizing API calls**.

Result: Seamless, intelligent navigation that feels like magic to the user! ✨


