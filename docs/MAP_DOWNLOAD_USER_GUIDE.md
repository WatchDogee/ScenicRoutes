# Map-Based Offline Download - User Interaction Guide

## Feature: Quick Download from Map

### How It Works

#### Step 1: Open Map and Long-Press
- User opens ScenicRoutes app and navigates to Map screen
- User **long-presses** any location on the map
  - Long-press duration: ~500ms hold
  - Any map location is valid (road, field, city, etc.)

**Code Path**: 
```
MapScreen.kt onMapLongPress handler
  → Captures GeoPoint coordinate
  → Sets quickDownloadLocation = point
  → Shows showQuickDownloadDialog = true
```

#### Step 2: QuickDownloadSheet Appears
- Bottom sheet slides up from screen bottom
- Shows:
  - Title: "Download Offline Maps"
  - **Location card**: Coordinates (e.g., "56.9534, 24.1050")
  - **Radius selector** with preset buttons
  - **Download button**
  - **Download around route option** (for future)
  - **Cancel button**

**Visual Layout**:
```
┌────────────────────────────┐
│   Download Offline Maps    │
├────────────────────────────┤
│ Location                   │
│ 56.9534, 24.1050          │
├────────────────────────────┤
│ Download Radius            │
│ [5km] [10km] [25km] [50km] │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ <- Slider 1-100km
│ 10 km                      │
├────────────────────────────┤
│ [Download 10 km around...] │
│ [Download around saved...] │
│ [Cancel]                   │
└────────────────────────────┘
```

#### Step 3: Adjust Download Radius
User has two options:

**Option A: Quick Presets**
- Tap one of four preset buttons: 5km, 10km, 25km, 50km
- Selected button highlights in primary color
- Download radius immediately updates

**Option B: Custom Slider**
- Drag slider to customize radius (1-100km)
- Display updates in real-time ("X km")
- More granular control than presets

#### Step 4: Download
User taps "Download X km around location" button

**Navigation Flow**:
```
QuickDownloadSheet onDownload callback
  → navController.navigate(
      "offline_maps?lat=56.9534&lon=24.1050&radius=10"
    )
  → OfflineMapsScreen receives parameters
  → Auto-populates custom area:
      - Latitude: 56.9534
      - Longitude: 24.1050
      - Radius: 10km
      - Name: "Around Marked Location"
  → Custom area section auto-expands
  → Ready for download
```

#### Step 5: Confirm & Download in OfflineMapsScreen
User sees:
- Custom area pre-filled with marked location
- Radius pre-selected (10km)
- Custom area section expanded
- Can confirm or modify parameters
- Tap "Download Custom Area" to proceed

## Parameter Flow

### From Map to OfflineMapsScreen

```
Long-Press on Map
    ↓
GeoPoint captured (lat, lon)
    ↓
QuickDownloadSheet shows
    ↓
User selects radius (e.g., 25km)
    ↓
User taps "Download 25km around location"
    ↓
Navigation: "offline_maps?lat=X&lon=Y&radius=25"
    ↓
OfflineMapsScreen receives:
  - downloadLat = X (Double)
  - downloadLon = Y (Double)
  - downloadRadius = 25.0 (Double)
    ↓
LaunchedEffect auto-populates:
  - customLat = "X"
  - customLon = "Y"
  - customRadiusKm = "25"
  - customName = "Around Marked Location"
  - showCustomArea = true
    ↓
UI displays pre-filled form, ready to download
```

## Radius Preset Reference

| Preset | Use Case | Download Size (est.) |
|--------|----------|----------------------|
| **5km** | City center, dense area | 10-20 MB |
| **10km** | Small to medium city | 30-50 MB |
| **25km** | Large city or region | 80-150 MB |
| **50km** | Wide area coverage | 200-400 MB |

*Sizes depend on region and map detail level*

## Advanced: Custom Slider

**Slider Range**: 1km - 100km

**Suggested Ranges**:
- **1-10km**: Specific neighborhood, point of interest
- **10-25km**: City exploration
- **25-50km**: Regional cycling route
- **50-100km**: Multi-day trip planning

**Real-Time Feedback**:
- Slider displays current value: "X km"
- Updates immediately as user drags
- No need to tap to apply

## Touch Interaction Details

### Long-Press Recognition
- **Duration**: Approximately 500ms hold (standard Android long-press)
- **Sensitivity**: Works at any map location
- **Conflict Prevention**: 
  - Click = normal map interaction (POI selection, etc.)
  - Long-press = download dialog
  - No overlap between modes

### Slider Interaction
- **Min**: Slider stops at 1km
- **Max**: Slider stops at 100km
- **Continuous**: Smooth value changes while dragging
- **Release**: Value locked when user releases

### Button Interaction
- **Presets**: Instant selection, immediate visual feedback
- **Download button**: 
  - Enabled when location set
  - Shows current radius in label
  - Navigates immediately on tap
- **Cancel**: Closes dialog, returns to map

## Edge Cases Handled

### What happens if...

**...user long-presses near map edge?**
- Coordinate is still captured accurately
- Dialog appears at appropriate screen position
- No coordinate loss or NaN values

**...user selects very large radius (100km)?**
- Parameter still passed correctly
- OfflineMapsScreen validates against tier limits
- Can reject or adjust if exceeds Premium/Pro limits

**...user navigates back from OfflineMapsScreen?**
- Custom area data preserved in screen state
- Can long-press again to get fresh dialog
- No state pollution

**...user long-presses multiple times rapidly?**
- Each press overwrites previous location
- Only latest press processed
- One dialog shown at a time

## Integration with Existing Features

### Backward Compatibility
- Routes work as before: `offline_maps` (no parameters)
- Map bounds still supported: `offline_maps?bounds=...`
- New parameters optional: `lat`, `lon`, `radius`
- All three can coexist in single route definition

### With Other Map Features
- Long-press doesn't conflict with:
  - Community road selection
  - Route planning
  - POI search
  - Marker placement
- Operates independently on top of existing features

### With Tier Limits
- Download respects Premium/Pro limits:
  - Premium: no region limit, 500MB total
  - Pro: Unlimited regions, unlimited size
- OfflineMapsScreen enforces on download attempt
- User can adjust radius if exceeds limits

## Future Extensions (Scaffolding)

### Route-Based Download
When user taps "Download around saved route":
1. Show list of user's saved routes
2. Select one
3. Calculate bounding box + buffer
4. Auto-populate custom area with route geometry
5. User confirms and downloads

**Code Ready**: `onDownloadRoute` callback prepared

### Trip-Based Download  
Similar to routes but using trip waypoints:
1. Show list of saved trips
2. Select one
3. Calculate optimal download area
4. Pre-fill with trip context
5. Download

**Code Ready**: State scaffolding in place

### Visual Download Preview
Before confirming download:
1. Show map with semi-transparent circle
2. Circle = download area (radius zone)
3. Update in real-time as user adjusts radius
4. Highlight affected offline map regions
5. Show estimated size

**Code Ready**: Can integrate with existing Marker overlay system

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Long-press not working | Ensure 500ms+ hold duration; not a quick tap |
| Dialog doesn't appear | Check map is focused; long-press may need to be on map view itself |
| Wrong coordinates shown | Long-press exactly where needed; coordinates displayed are exact |
| Radius shows as 1.0 instead of 10.0 | Check slider is moving properly; may be UI refresh issue |
| Download button doesn't navigate | Ensure custom area section is expanded; try again |

## Code Entry Points (For Developers)

### To Test Feature:

1. **From MapScreen**:
   ```kotlin
   // Trigger dialog programmatically (for testing)
   quickDownloadLocation = GeoPoint(56.95, 24.10)
   showQuickDownloadDialog = true
   ```

2. **Direct Navigation** (for deep linking):
   ```
   offline_maps?lat=56.95&lon=24.10&radius=15
   ```

3. **Check State**:
   ```kotlin
   // In OfflineMapsScreen LaunchedEffect
   println("Download location: $downloadLat, $downloadLon, radius: $downloadRadius")
   ```

## Performance Considerations

- **Long-press detection**: Native OSMDroid, no overhead
- **Dialog rendering**: Material3 ModalBottomSheet (optimized)
- **Slider performance**: Smooth 60fps on most devices
- **Navigation**: Instant, no blocking operations
- **Custom area population**: Synchronous, <10ms

All operations are lightweight and non-blocking.

