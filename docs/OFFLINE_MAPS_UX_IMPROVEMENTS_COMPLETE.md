# Offline Maps UX Improvements - Complete Implementation

## Summary
Successfully enhanced offline maps feature with searchable presets, tier-based UI, and map view capture functionality.

## Changes Implemented

### 1. **OfflineMapsScreen.kt** - Enhanced with Search & Tier Awareness
**File**: `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/maps/OfflineMapsScreen.kt`

**Changes**:
- ✅ **Search Bar**: Added `OutlinedTextField` with search functionality to filter regions by name or description
  - Includes clear button for easy reset
  - Real-time filtering of preset regions
  - Shows "No results" message when search doesn't match any regions
  
- ✅ **Tier Info Banners**:
  - **Free Users**: Shows lock icon + warning banner explaining offline maps is a Premium feature
  - **Premium Users**: Shows checkmark + tier info "Premium: no region limit (500MB storage cap), 500 MB"
  - **Pro Users**: Shows star icon (implied unlimited access)
  
- ✅ **Filtered Regions Display**:
  - Regions list filtered based on search query
  - Shows "Popular Regions" header only when results exist
  - Empty search state handled gracefully
  
- ✅ **Map Bounds Parameter Support**:
  - Accepts optional `mapBounds` parameter (format: "latNorth,lonEast,latSouth,lonWest")
  - Automatically pre-fills custom area with current map view
  - Calculates center and radius from map bounds
  - Sets custom area name to "Current View" when initialized from map

### 2. **SettingsScreen.kt** - Tier-Based Offline Maps Settings
**File**: `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/settings/SettingsScreen.kt`

**Changes**:
- ✅ **Enhanced Offline Maps Section**:
  - Shows tier-specific information card with icon indicating subscription status
  - Displays current tier limits (e.g., "Premium: no region limit (storage cap applies)")
  - Shows appropriate icon:
    - 🔒 Lock for free users
    - ✓ Checkmark for Premium users
    - ⭐ Star for Pro users

- ✅ **Conditional UI**:
  - "Manage Offline Maps" button enabled only for Premium/Pro users
  - Free users see upgrade button linking to subscription page
  - Premium users see download button and tier info

### 3. **MapScreen.kt** - Download Current View Integration
**File**: `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/map/MapScreen.kt`

**Changes**:
- ✅ **Map Bounds Capture**:
  - Captures current map viewport bounds using `mapViewRef?.boundingBox`
  - Passes bounds to OfflineMapsScreen via navigation parameter
  - Format: `offline_maps?bounds={latNorth},{lonEast},{latSouth},{lonWest}`
  
- ✅ **Fallback Support**:
  - If bounds unavailable, navigates to offline_maps without parameter
  - Maintains backward compatibility

### 4. **AppNavigation.kt** - Route Parameter Support
**File**: `android-native/app/src/main/java/com/scenicroutes/app/ui/navigation/AppNavigation.kt`

**Changes**:
- ✅ **Dynamic Route with Optional Parameter**:
  ```kotlin
  composable(
      "offline_maps?bounds={bounds}",
      arguments = listOf(
          androidx.navigation.navArgument("bounds") {
              type = androidx.navigation.NavType.StringType
              nullable = true
              defaultValue = null
          }
      )
  )
  ```
  
- ✅ **Backward Compatibility**:
  - Kept original `composable("offline_maps")` route without parameter
  - Allows navigation from both old and new locations

## Feature Flow

### Download from Map View
1. User taps **"..."** (action menu) on MapScreen
2. User selects **"Download Current View"** from menu
3. Current map bounds captured and passed to OfflineMapsScreen
4. Custom area form pre-filled with map center and calculated radius
5. User can adjust or directly download

### Search Presets
1. User opens **Offline Maps** screen
2. User types in search bar (e.g., "Berlin")
3. Regions list filters in real-time
4. User selects and downloads matching region

### Tier-Based Access
1. **Free Tier**: Sees lock banner + upgrade button in settings
2. **Premium Tier**: Can download no region limit (500MB storage cap), 500 MB total; sees tier info
3. **Pro Tier**: Unlimited downloads (future: show "Unlimited" badge)

## Technical Details

### Bounds Format
- **Source**: `mapViewRef.boundingBox` (OSMDroid MapView)
- **Format**: `latNorth,lonEast,latSouth,lonWest`
- **Example**: `52.75,13.75,52.25,13.10`
- **Parsing**: Extracts center and calculates approximate radius for custom area

### State Management
- Search query: `var searchQuery by remember { mutableStateOf("") }`
- Bounds parsing: `LaunchedEffect(mapBounds) { ... }`
- Tier info: Pulled from `FeatureAccessService.getOfflineMapLimits()`

### UI Components Used
- **TextField**: Search input with clear button
- **Card**: Tier info banner (premium/free)
- **Icon**: Tier status indicators (Lock, CheckCircle, Star)
- **LazyColumn**: Filtered regions list with search-aware rendering

## Testing Checklist

- [ ] Search functionality filters regions correctly
- [ ] Clear button resets search
- [ ] "No results" message appears when search matches nothing
- [ ] Free users see lock banner in offline maps screen
- [ ] Premium users see tier info + can download
- [ ] Settings page shows different UI for each tier
- [ ] Download Current View pre-fills custom area form
- [ ] Map bounds capture and navigation works
- [ ] Fallback to regular offline_maps route works
- [ ] Both navigation routes (with/without bounds) work

## Related Files
- **ActionMenuSheet.kt**: Has "Download Current View" action item
- **OfflineMapsService.kt**: Handles actual downloads
- **FeatureAccessService.kt**: Provides tier limits
- **SubscriptionViewModel.kt**: Provides subscription state for settings

## Notes
- Zoom level caps are maintained (11-14 for presets) to ensure ~500MB per region
- Custom area radius calculation is approximate (uses lat difference * 111 km/degree)
- Search is case-insensitive and checks both name and description fields
- Tier limits enforced both in UI and service layer

## Future Enhancements
1. **Download Progress UI**: Show progress bar during downloads
2. **Background Downloads**: Support queued downloads
3. **Storage Management**: UI to delete individual regions
4. **Pro Badge**: Show "Unlimited" badge for Pro users
5. **Offline Map Previews**: Show region thumbnail/map preview
6. **Quick Actions**: "Download 50km around me" button using device location



