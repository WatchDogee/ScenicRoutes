# Map-Based Offline Maps Download Feature - Implementation Summary

## Overview
Implemented a streamlined offline map download experience by enabling users to:
1. **Long-press on map** to trigger quick download options
2. **Download specific radius around marked location** (5km, 10km, 25km, 50km, custom)
3. **Pre-populate custom area** when navigating from map
4. **Quick access** to offline maps download from anywhere on the map

## Changes Made

### 1. OSMMapView Component Enhancement
**File**: `OSMMapView.kt`

Added long-press gesture support:
- Added `onMapLongPress: ((GeoPoint) -> Unit)?` parameter
- Updated `MapEventsReceiver` to handle both single tap (click) and long press
- Returns `true` from `longPressHelper` when callback is provided

```kotlin
override fun longPressHelper(p: GeoPoint?): Boolean {
    p?.let { onMapLongPress?.invoke(it) }
    return onMapLongPress != null
}
```

### 2. MapScreen State Management
**File**: `MapScreen.kt`

Added new state variables for map downloads:
```kotlin
var showQuickDownloadDialog by remember { mutableStateOf(false) }
var quickDownloadLocation by remember { mutableStateOf<GeoPoint?>(null) }
var selectedRoute by remember { mutableStateOf<Route?>(null) }
var showDownloadRouteOptions by remember { mutableStateOf(false) }
```

Added long-press handler to OSMMapView:
```kotlin
onMapLongPress = { point ->
    quickDownloadLocation = point
    showQuickDownloadDialog = true
}
```

### 3. QuickDownloadSheet Composable
**File**: `QuickDownloadSheet.kt` (NEW)

Created bottom sheet dialog for quick download options with:
- **Location display**: Shows exact coordinates of marked location
- **Preset radius buttons**: 5km, 10km, 25km, 50km
- **Custom slider**: Adjust radius from 1-100km
- **Download button**: "Download X km around location"
- **Route download option**: "Download around saved route"
- **Cancel button**: Dismiss dialog

Features:
- Real-time radius display
- Visual feedback showing selected radius
- Integration with navigation system

### 4. Navigation Route Enhancement
**File**: `AppNavigation.kt`

Extended offline_maps route to support download parameters:
```kotlin
"offline_maps?bounds={bounds}&lat={lat}&lon={lon}&radius={radius}"
```

Arguments:
- `bounds`: Map view bounds (existing, backward compatible)
- `lat`: Download location latitude
- `lon`: Download location longitude
- `radius`: Download radius in km

Maintains backward compatibility with plain `offline_maps` route.

### 5. OfflineMapsScreen Enhancement
**File**: `OfflineMapsScreen.kt`

Updated function signature:
```kotlin
fun OfflineMapsScreen(
    navController: NavController,
    mapBounds: String? = null,
    downloadLat: Double? = null,
    downloadLon: Double? = null,
    downloadRadius: Double? = null,
)
```

Added auto-population of custom area when download location provided:
```kotlin
LaunchedEffect(downloadLat, downloadLon, downloadRadius) {
    if (downloadLat != null && downloadLon != null) {
        customLat = downloadLat.toString()
        customLon = downloadLon.toString()
        customRadiusKm = (downloadRadius ?: 10.0).toInt().toString()
        customName = "Around Marked Location"
        showCustomArea = true
    }
}
```

## User Experience Flow

1. **User opens map** - MapScreen displayed
2. **User long-presses on map** - QuickDownloadSheet appears at location coordinates
3. **User selects radius** - Uses preset buttons or custom slider
4. **User taps "Download"** - Navigates to OfflineMapsScreen with:
   - Location coordinates pre-filled
   - Radius pre-selected
   - Custom area section automatically expanded
5. **User can confirm or modify** - Adjust parameters before downloading

## Features

### Radius Options
- **Quick presets**: 5km, 10km, 25km, 50km
- **Custom range**: 1km - 100km via slider
- **Real-time display**: Shows selected radius in km

### Integration Points
- **Map interaction**: Long-press detection via MapEventsOverlay
- **Navigation**: Safe route parameters with null defaults
- **State management**: Proper state propagation with LaunchedEffect
- **Backward compatibility**: All existing routes still work

### Future Enhancements (Scaffolding Ready)
- `onDownloadRoute()` callback ready for route-based downloads
- `selectedRoute` state prepared for route context
- `showDownloadRouteOptions` state for route selection UI
- Can implement "Download around this route" workflow

## Files Modified

| File | Changes |
|------|---------|
| `OSMMapView.kt` | Added onMapLongPress parameter, updated MapEventsReceiver |
| `MapScreen.kt` | Added state vars, long-press handler, QuickDownloadSheet dialog |
| `QuickDownloadSheet.kt` | NEW - Bottom sheet UI for quick download options |
| `AppNavigation.kt` | Extended offline_maps route with lat/lon/radius params |
| `OfflineMapsScreen.kt` | Updated signature, auto-populate logic for download location |

## Compilation Status
✅ All files compile with zero errors
✅ No breaking changes
✅ Backward compatible

## Testing Recommendations

1. **Long-press Detection**
   - Long-press on various map locations
   - Verify dialog appears at correct coordinates
   - Check touch handling doesn't conflict with other gestures

2. **Radius Selection**
   - Test all preset buttons
   - Test slider range (1-100km)
   - Verify real-time display updates

3. **Navigation Flow**
   - Download location preset in OfflineMapsScreen
   - Radius pre-selected
   - Custom area auto-expanded
   - Verify bounds still work (backward compatibility)

4. **Edge Cases**
   - Long-press near map edges
   - Large radius (100km+)
   - Quick succession of long-presses
   - Mix of bounds and location-based navigation

## Next Steps (Optional Enhancements)

1. **Route-Based Downloads**
   - Load user's saved routes in QuickDownloadSheet
   - Add "Download around route" button
   - Calculate optimal download area from route geometry

2. **Trip-Based Downloads**
   - Similar to routes, offer trip-based downloads
   - Pre-calculate bounding box from trip waypoints

3. **Visual Feedback**
   - Draw semi-transparent circle on map showing download area
   - Update circle as user adjusts radius
   - Show affected regions/tiles count

4. **Download Confirmation**
   - Show preview of regions/tiles to download
   - Display estimated size before confirming
   - Option to adjust if too large for tier limits

5. **Quick Access Features**
   - "Download 10km around me" using device location
   - "Download along current route" if route active
   - Recent download locations for quick re-download

## API Compatibility

- ✅ OSMDroid MapView with Marker overlays
- ✅ GeoPoint coordinate system
- ✅ MapEventsOverlay for touch handling
- ✅ Material3 composables (ModalBottomSheet, Slider, etc.)
- ✅ Jetpack Navigation safe routes
- ✅ StateFlow for service integration

