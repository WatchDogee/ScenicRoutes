# Quick Reference - Offline Maps Features

## User Flows

### 1. Search Presets
```
Open App → Settings → Offline Maps 
→ Type in search bar → Results filter → Tap region → Download
```

### 2. Download Current View
```
Open Map → Zoom to desired area → Tap "..." menu 
→ Select "Download Current View" → Form pre-filled → Download
```

### 3. Check Tier Status
```
Open Settings → Scroll to Offline Maps 
→ See tier badge (Lock/Check/Star) → Shows limits or upgrade option
```

## Technical Reference

### Route Navigation
```kotlin
// With bounds
navController.navigate("offline_maps?bounds=52.75,13.75,52.25,13.10")

// Without bounds (fallback)
navController.navigate("offline_maps")
```

### Bounds Format
```
latNorth,lonEast,latSouth,lonWest
Example: 52.75,13.75,52.25,13.10
```

### Tier Limits
| Tier | Regions | Storage | Download | Settings |
|------|---------|---------|----------|----------|
| Free | ✗ | - | ✗ | Lock icon + Upgrade |
| Premium | 5 | 500 MB | ✓ | Check + Info |
| Pro | ∞ | ∞ | ✓ | Star + Unlimited |

## Component Locations

| Component | File |
|-----------|------|
| Search bar | OfflineMapsScreen.kt (line ~190) |
| Tier banners | OfflineMapsScreen.kt (line ~215) |
| Filtered list | OfflineMapsScreen.kt (line ~522) |
| Settings UI | SettingsScreen.kt (line ~167) |
| Map bounds capture | MapScreen.kt (line ~1567) |
| Navigation routes | AppNavigation.kt (line ~133) |

## Key Methods

### Search Filtering
```kotlin
val filteredRegions = regions.filter {
    searchQuery.isEmpty() || 
    it.name.contains(searchQuery, ignoreCase = true) ||
    it.description?.contains(searchQuery, ignoreCase = true) ?: false
}
```

### Bounds Parsing
```kotlin
val parts = mapBounds.split(",")
val latNorth = parts[0].toDouble()
val centerLat = (latNorth + latSouth) / 2.0
val radius = maxOf((latNorth - latSouth) * 111.0 / 2.0, 5.0)
```

### Tier Checking
```kotlin
val (maxRegions, maxStorageMB) = 
    featureAccessService.getOfflineMapLimits()
```

## States to Monitor

### OfflineMapsScreen
- `searchQuery` - Current search text
- `regions` - All available presets
- `hasOfflineAccess` - Tier permission
- `mapBounds` - Passed from map view

### SettingsScreen
- `subscription` - Current user subscription
- `is_premium`, `is_pro` - Tier flags

### MapScreen
- `mapViewRef` - Reference to map widget
- `showActionMenu` - Menu visibility

## Error Handling

### Missing Bounds
- ✅ Falls back to default `offline_maps` route
- ✅ Form uses default values (Riga center)

### Search No Results
- ✅ Shows "No regions matching..." message
- ✅ User can clear search to see all

### Free Tier Access
- ✅ Shows lock banner
- ✅ Download button disabled
- ✅ Upgrade button available

## Testing Quick Checks

```kotlin
// Free user sees:
- Lock icon in offline maps screen
- "Offline Maps - Premium Feature" banner
- Upgrade button in settings
- Disabled download button

// Premium user sees:
- CheckCircle icon
- "Premium: X/no region limit" info
- Manage button enabled
- Can download presets

// Search bar works:
- Type "Berlin" → shows Berlin Metro only
- Clear button resets search
- "No regions matching..." when nothing found

// Map integration works:
- "Download Current View" navigates to offline maps
- Custom area pre-filled with map center
- Bounds parsed correctly to coordinates
```

## Files to Review

1. **OfflineMapsScreen.kt** - Main UI (search + tiers)
2. **SettingsScreen.kt** - Tier display in settings
3. **MapScreen.kt** - Bounds capture logic
4. **AppNavigation.kt** - Route configuration
5. **ActionMenuSheet.kt** - Download action menu

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Search not working | Check `searchQuery` state is mutable |
| Bounds not parsing | Verify format: latN,lonE,latS,lonW |
| Tier not showing | Check `featureAccessService.getOfflineMapLimits()` |
| Navigation failing | Ensure NavArgument type is String |

## Performance Notes

- Search: O(n) filter on ~15 regions = instant
- Bounds calculation: Simple math, no API calls
- Navigation: Local parameter passing, no network
- UI: Lazy rendering with items() composable

## Deployment Checklist

- [x] All files compile (Android: 0 errors)
- [x] Navigation routes configured
- [x] Tier access working
- [x] Search functionality active
- [x] Map integration complete
- [x] Documentation complete
- [x] Backward compatible
- [x] Ready for QA

---

**Quick Status**: ✅ COMPLETE - Ready for testing and deployment



