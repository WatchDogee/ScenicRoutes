# Rerouting System Testing Guide

## Overview
The hybrid rerouting system has 3 stages triggered by how far you are off-route:
- **Stage 1 (0-75m)**: Closest point recovery (silent, instant)
- **Stage 2 (75-200m)**: Direct path guidance (orange line on map)
- **Stage 3 (>500m)**: GraphHopper API reroute (new full route)

All stages require **sustained off-route for 8 seconds** to trigger (prevents false positives).

---

## Test Method 1: Manual Reroute Controls (RECOMMENDED)

**Best for**: Quick testing, any location, works offline

### Setup
1. Start navigation on any route
2. Open manual reroute panel (tap tune icon 🔧 in FAB menu)
3. Optionally enter lat/lon to "jump" location; leave blank to use current

### Test Stage 1
```
1. Tap "Stage 1" button
2. Check: No banner shown (silent recovery)
3. Check logcat: "Stage 1: Closest point recovery at index X"
4. ✅ PASS if: Off-route state clears silently
```

### Test Stage 2
```
1. Tap "Stage 2" button
2. Check: Orange line appears on map (current→closest point)
3. Check: Off-route banner shown with orange color
4. Check logcat: "Stage 2: Direct path guidance to closest route point at index X"
5. ✅ PASS if: Orange line visible and state is DIRECT_PATH_GUIDANCE
```

### Test Stage 3 (Requires Internet)
```
1. Tap "Stage 3" button
2. Check: Banner says "Calculating new route..." with spinner
3. Check: Route geometry updates after ~2-3 seconds
4. Check logcat: "Route calculation successful" (if online)
5. ✅ PASS if: New route loads OR "Reroute failed" shown (offline is OK)
```

---

## Test Method 2: Car Simulation with Real Movement

**Best for**: End-to-end testing, verifies off-route detection timing

### Setup
1. Start navigation on curvy route (Balvi–Celmene–Sita recommended)
2. Enable car simulation (red car icon FAB)
3. Map rotates and marker moves automatically

### To Trigger Stage 1
```
1. Let car simulate for 30-60 seconds
2. Manually drag marker ~50m off the route
3. Wait 8 seconds (threshold window)
4. ✅ PASS if: State becomes CLOSEST_POINT_RECOVERY after 8s
5. ✅ PASS if: Marker snaps back to route
```

### To Trigger Stage 2
```
1. Let car simulate for 30-60 seconds
2. Manually drag marker ~150m perpendicular to route
3. Wait 8 seconds
4. ✅ PASS if: Orange line appears from current position to closest route point
5. ✅ PASS if: State becomes DIRECT_PATH_GUIDANCE
```

### To Trigger Stage 3 (Requires Internet)
```
1. Let car simulate for 30-60 seconds
2. Manually drag marker ~600m+ off route
3. Wait 8 seconds
4. ✅ PASS if: API call is made to GraphHopper (check logcat)
5. ✅ PASS if: New route calculates (online) or fails gracefully (offline)
```

---

## Test Method 3: Automated Test (DEBUG TAP)

**Best for**: Quick verification, visual feedback

### How to Run
1. Start navigation
2. Tap orange bug icon (🐛) in FAB menu
3. Watch 3-stage test run automatically
4. View progress with numbered circles (1/2/3)

### What It Does
- **Stage 1 (0-3s)**: Injects 5 locations, moves 55m off-route, waits for detection
- **Stage 2 (3-12s)**: Injects 8 locations, moves 130m off-route, waits for Stage 2
- **Stage 3 (12-47s)**: Injects 15 locations, moves 600m off-route, attempts API reroute

### Interpreting Results
```
✅ Stage 1 PASS: State shows CLOSEST_POINT_RECOVERY or NONE, off-route detected
⚠️  Stage 1 WARN: State shows DIRECT_PATH_GUIDANCE (premature Stage 2 trigger)
✅ Stage 2 PASS: State shows DIRECT_PATH_GUIDANCE, off-route distance 100-150m
⚠️  Stage 2 WARN: Orange path not visible (check map rendering)
⚠️  Stage 3 FAIL: 403 Forbidden (auth issue, offline, or API down - expected for offline)
✅ Stage 3 PASS: Route updates OR REROUTE_FAILED shown gracefully
```

### Troubleshooting
- **"❌ No GPS location"**: Start navigation first
- **Stages move too slow/fast**: Injection delays are 650-2400ms per step (realistic 60km/h)
- **Orange line not visible in Stage 2**: Check map not zoomed out too far
- **Stage 3 always fails**: Check internet connection or API authentication

---

## Logcat Keywords for Verification

### Expected Log Patterns

**Stage 1 Trigger**:
```
Off-route detected: XXm
Handling off-route: distance=XXm, stage=CLOSEST_POINT
Stage 1: Closest point recovery at index X
```

**Stage 2 Trigger**:
```
Off-route detected: XXm
Handling off-route: distance=XXm, stage=DIRECT_PATH
Stage 2: Direct path guidance to closest route point at index X
```

**Stage 3 Trigger**:
```
Off-route detected: XXm
Handling off-route: distance=XXm, stage=API_REROUTE
Stage 3: Triggering API reroute from XX,XX to YY,YY
RouteRepository: Attempting route calculation via GraphHopper
```

**Successful Reroute**:
```
RouteRepository: Route calculation successful
Reroute completed: new route with XXX points
```

**Failed Reroute** (expected offline):
```
<-- 403 Forbidden http://10.0.2.2:8000/api/routes/graphhopper
RouteRepository: Failed to calculate route (attempt X/4)
Reroute failed
```

---

## Known Limitations

### Stage 1
- ✅ Works offline
- ✅ Works while stationary
- ✅ Silent (no visual feedback)
- ⚠️ Only for minor drifts (< 75m)

### Stage 2
- ✅ Works offline
- ✅ Works while stationary  
- ✅ Orange path visible on map
- ⚠️ Requires moving to find "closest point" accurately
- ⚠️ Orange line may not be visible if map is heavily zoomed out

### Stage 3 (API)
- ❌ **Requires internet connection**
- ❌ **Requires GraphHopper API access**
- ⚠️ Rate limited: max 1 call per 30 seconds
- ⚠️ May fail with 403 if not authenticated
- ✅ Can manually bypass rate limit via "Stage 3" button with `forceApiCall=true`

---

## Best Practices

1. **Always test with logcat open** to verify internal state transitions
2. **Test offline first** (Stage 1 & 2) to validate core logic
3. **Test online last** (Stage 3) when you have internet and API key
4. **Use manual reroute buttons** for isolated stage testing
5. **Use automated test** for end-to-end verification
6. **Use car simulation** for real-world scenario testing
7. **Check map zooming** when Stage 2 orange path is not visible

---

## Common Test Scenarios

### Scenario A: Quick Offline Verification
```
1. Open map → select route → tap "Start Navigation"
2. Tap tune icon → Enter custom lat/lon (50m offset) → tap "Stage 1"
   → Expect: Silent off-route state
3. Enter custom lat/lon (150m offset) → tap "Stage 2"
   → Expect: Orange line visible
4. Done! Stages 1 & 2 work offline
```
**Duration**: ~2 minutes | **Requirements**: None

### Scenario B: Full Rerouting Test (Online + Offline)
```
1. Start car simulation on Balvi–Celmene–Sita route
2. Wait 30s for car to drive
3. Manually drag marker 150m off route
4. Wait 10s → Check for Stage 2 (orange line)
5. Manually drag marker 600m off route
6. Wait 10s → Check for Stage 3 (API call in logcat)
7. Stop simulation
```
**Duration**: ~3 minutes | **Requirements**: Internet for Stage 3

### Scenario C: Verify Manual Controls Work
```
1. Open navigation (any route, any location)
2. Tap tune icon 🔧
3. Leave lat/lon blank, tap "Stage 1" → Check logcat
4. Leave lat/lon blank, tap "Stage 2" → Check map + logcat
5. Leave lat/lon blank, tap "Stage 3" → Check API call + logcat
```
**Duration**: ~1 minute | **Requirements**: None

---

## Debugging Checklist

If Stage N doesn't trigger:

### Stage 1 Not Triggering
- [ ] Verify distance is 0-75m
- [ ] Verify sustained for 8+ seconds
- [ ] Check logcat for "Off-route detected" message
- [ ] Check if `isSimulating` flag is blocking (should be fixed now)
- [ ] Try manual button "Stage 1" to verify logic works

### Stage 2 Not Triggering
- [ ] Verify distance is 75-200m
- [ ] Verify sustained for 8+ seconds
- [ ] Check logcat for "Stage 2: Direct path" message
- [ ] Zoom in on map to see orange line
- [ ] Try manual button "Stage 2" to verify logic works

### Stage 3 Not Triggering
- [ ] Verify distance is >500m
- [ ] Check internet connection
- [ ] Check logcat for "403 Forbidden" (expected offline)
- [ ] Check GraphHopper API availability
- [ ] Try manual button "Stage 3" with `forceApiCall=true`
- [ ] If manual button works but auto-detect doesn't, check 30s rate limit

---

## Performance Notes

- **Off-route detection**: Runs every GPS update (~1-2 Hz)
- **Off-route threshold**: 8 seconds sustained delay (prevents noise)
- **Stage 1 recovery**: Instant, no API call
- **Stage 2 direct path**: Instant, uses cached route geometry
- **Stage 3 API call**: 2-5 seconds typical (depends on internet + server)
- **Rate limiting**: Max 1 API call per 30 seconds

