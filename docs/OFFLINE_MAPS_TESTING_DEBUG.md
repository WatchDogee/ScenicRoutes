# Offline Maps Testing & Debugging Guide

## Problem
Downloaded offline map areas are not showing when airplane mode is enabled.

## Root Cause Analysis

The offline tiles are downloaded and stored at:
```
/data/data/com.scenicroutes.app/files/offline/tiles/{region_id}/
```

But the MapView is not configured to use this offline cache directory. The map is using online MAPNIK tiles, and when offline it can't fetch them.

## Testing Steps

### 1. Verify Tiles Are Downloaded
```bash
adb shell
cd /data/data/com.scenicroutes.app/files/offline/tiles
ls -la
# Should see your region_id folder (e.g., "test")
# If empty or missing, the download didn't work
```

### 2. Check Offline Regions Metadata
```bash
adb shell cat /data/data/com.scenicroutes.app/files/offline_regions.json
# Should show JSON with your downloaded regions
```

### 3. Monitor Logcat During Offline Access
```bash
# Terminal 1: Start logcat
adb logcat | grep -E "OfflineMap|MapView|tileSource"

# Terminal 2: In app
# 1. Enable airplane mode
# 2. Navigate to Map
# 3. Pan to your offline region coordinates
# Look for tile loading errors in logs
```

### 4. Check if Map Loads Online First
```bash
# This is important - OSMDroid needs to know which tile directories to search
# Currently it may not be configured to check /offline/tiles/
```

## Current Issue

**MapView Configuration Missing:**
- File: `OSMMapView.kt` (line 74)
- Current: Only uses `TileSourceFactory.MAPNIK`
- Missing: No configuration to use offline tile cache directory

**Solution Needed:**
The MapView needs to be told to:
1. Check offline tile cache first: `/data/data/com.scenicroutes.app/files/offline/tiles/{zoom}/{x}/{y}.png`
2. Fall back to online tiles if offline cache miss
3. Work completely offline if no internet

## Commands to Test Offline Maps

### Full Test Sequence (Automated)
```bash
#!/bin/bash

# 1. Clear app data
adb shell pm clear com.scenicroutes.app

# 2. Reinstall APK  
adb install -r app-debug.apk

# 3. Open app, login, and download a region
# (do this manually in UI)

# 4. Verify download
adb shell ls -la /data/data/com.scenicroutes.app/files/offline/tiles/test/
echo "Tile count:"
adb shell find /data/data/com.scenicroutes.app/files/offline/tiles/test -type f | wc -l

# 5. Check storage size
adb shell du -sh /data/data/com.scenicroutes.app/files/offline/

# 6. Enable airplane mode and test
adb shell am broadcast -a com.android.internal.intent.action.AIRPLANE_MODE --ez state true

# 7. Check if map loads offline
echo "Open Map in app and pan to downloaded region"
echo "Check logcat for tile loading"

# 8. Disable airplane mode
adb shell am broadcast -a com.android.internal.intent.action.AIRPLANE_MODE --ez state false
```

### Individual Commands

**Enable Airplane Mode:**
```bash
adb shell am broadcast -a com.android.internal.intent.action.AIRPLANE_MODE --ez state true
```

**Disable Airplane Mode:**
```bash
adb shell am broadcast -a com.android.internal.intent.action.AIRPLANE_MODE --ez state false
```

**Check Network Status (will return error if offline, which is correct):**
```bash
adb shell ping -c 1 google.com
# Should fail when airplane mode on
```

**Extract Downloaded Tiles:**
```bash
adb pull /data/data/com.scenicroutes.app/files/offline/tiles ./offline_tiles_backup
```

**View Tile Structure:**
```bash
adb shell find /data/data/com.scenicroutes.app/files/offline/tiles -type f | head -20
# Should show: zoom_level/x/y.png format
```

## Real Issue

OSMDroid uses a tile source system. Currently we're using:
```kotlin
setTileSource(TileSourceFactory.MAPNIK)
```

This tells OSMDroid to fetch tiles from the online MAPNIK URL. 

**What we need:**
1. Custom ITileSource that checks offline cache first
2. OR: Use MapTilePath to point OSMDroid to the offline directory
3. OR: Use XYTileSource with custom getURLString() that checks offline first

## Next Steps to Fix

1. **Create Custom Offline Tile Source** that:
   - Checks `/offline/tiles/{regionId}/{zoom}/{x}/{y}.png` first
   - Falls back to online if offline cache miss
   - Works completely offline if no internet

2. **Register which regions are downloaded** so the custom tile source knows which zoom levels/bounds have offline data

3. **Update MapView initialization** to use the custom offline tile source

## Testing with Real Coordinates

If your downloaded region was "test" around Latvia:
- **Coordinates:** ~56.95°N, 24.10°E
- **Zoom levels:** 10-15 (typical)
- **Size:** 1431 MB (per your screenshot)

Steps to test:
1. Login with internet
2. Go to Offline Maps
3. Download "test" region (16 MB shown in your screenshot)
4. Close app completely
5. Enable airplane mode
6. Reopen app
7. Navigate Map to Latvia coordinates (56.95, 24.10)
8. Zoom levels 10-15
9. Pan around - tiles should load from offline cache

If tiles don't load:
- Check logcat for: `No offline tiles found for zoom X at {x},{y}`
- Verify files exist: `adb shell ls /data/data/com.scenicroutes.app/files/offline/tiles/test/`
- Check permissions: `adb shell stat /data/data/com.scenicroutes.app/files/offline/tiles/`
