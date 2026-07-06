# Offline Maps - Next Improvements

## Current Status ✅
- Offline maps manifest persistence implemented
- Real OSM tile download with osmdroid
- Custom area creator with bounding box
- Preset regions (cities/metro areas)
- Size estimator (6 KB/tile average, clamped at 1.5 GB)
- Reduced zoom ranges to fit Premium 500 MB cap:
  - Cities (Berlin, London, Paris, Riga): zoom 11-14
  - Larger metros (SF Bay, LA, Innsbruck): zoom 10-13
  - Tokyo/Sydney: zoom 11-14
- Tier limits enforced (Premium: no region limit, 500 MB; Pro: unlimited)

## Pending Improvements 🚧

### 1. Map Screen Download Actions
Add quick download options from the map view:
- **Download Current View**: Capture visible map bounds and download tiles
- **Download Around Route**: Extract route bounding box + buffer, download tiles
- **Download Near Me**: Use GPS location + configurable radius to define area

**Implementation:**
- Add action menu items in `MapScreen` or `ActionMenuSheet`
- Calculate bounding box from:
  - Map camera position for "current view"
  - Route geometry for "around route"
  - GPS + radius for "near me"
- Show size estimate before download
- Prevent download if exceeds tier limit
- Navigate to OfflineMapsScreen or show download progress dialog

### 2. Searchable Presets
Improve preset discovery:
- Add search bar in `OfflineMapsScreen`
- Filter presets by country/city name
- Show size estimates inline
- Disable presets that exceed tier limit
- Highlight already-downloaded regions

**UI Flow:**
```
┌─────────────────────────────┐
│ [🔍 Search countries/cities]│
├─────────────────────────────┤
│ ✓ Berlin (120 MB) Downloaded│
│   Paris (145 MB)            │
│   London (180 MB)           │
│   Riga (95 MB)              │
│   🚫 Tokyo (520 MB) Too big │
└─────────────────────────────┘
```

### 3. Download Progress & Resume
- Show download progress per tile batch
- Allow pause/resume for large downloads
- Handle network interruptions gracefully
- Store partial downloads and resume from last tile

### 4. Storage Management
- Show total storage used by offline maps
- Allow deletion of individual regions
- "Clear All" option with confirmation
- Automatic cleanup of orphaned tiles

### 5. Pro Tier Enhancements
- Remove 500 MB limit check for Pro users (already unlimited)
- Still show free space warning if device storage low
- Consider adding "Download Entire Country" presets for Pro (e.g., Latvia, Estonia)

### 6. Tile Source Options
Currently hardcoded to OSM standard tiles. Consider:
- Alternative tile servers (Thunderforest, Mapbox with API key)
- Satellite imagery option (for Pro tier)
- Terrain/topographic tiles

### 7. Background Download Service
- Use WorkManager for long-running downloads
- Continue downloads even when app is backgrounded
- Show notification with progress

### 8. Smart Region Suggestions
- Analyze user's saved routes/roads
- Suggest downloading regions frequently visited
- Auto-download home region on first app launch (with permission)

## Technical Notes

### Current Architecture
```
OfflineMapsService.kt
├── downloadRegion() - Main download orchestrator
├── estimateRegionSize() - Pre-download size check
├── downloadTile() - Individual tile fetch
└── saveManifest() - Persist downloaded regions

OfflineMapsScreen.kt
├── Presets list with size estimates
├── Custom area creator (BoundingBoxSelector)
└── Tier limit enforcement
```

### Tile Estimation Formula
```kotlin
avgTileBytes = 6 * 1024 // 6 KB per tile
tileCount = sum across zoom levels {
    width = (maxLon - minLon) / 360 * 2^zoom
    height = (maxLat - minLat) / 180 * 2^zoom
    tiles = ceil(width) * ceil(height)
}
estimatedSize = min(tileCount * avgTileBytes, 1.5 GB)
```

### Zoom Level Guidelines
- **City centers** (5-15 km²): zoom 11-14 (~100-150 MB)
- **Metro areas** (50-100 km²): zoom 10-13 (~150-250 MB)
- **Regions/states** (500+ km²): zoom 8-12 (~300-500 MB)
- **Countries**: zoom 6-10 (Pro tier only, 1-2 GB)

## Priority Order
1. **Map screen download actions** - Most useful UX improvement
2. **Searchable presets** - Better discovery
3. **Storage management** - Essential for cleanup
4. **Download progress** - Better feedback
5. **Background downloads** - Nice to have
6. **Smart suggestions** - Future enhancement

## Related Files
- `android-native/app/src/main/java/com/scenicroutes/app/data/service/OfflineMapsService.kt`
- `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/offline/OfflineMapsScreen.kt`
- `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/map/MapScreen.kt`
- `android-native/app/src/main/java/com/scenicroutes/app/ui/components/ActionMenuSheet.kt`



