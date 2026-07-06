# Offline Maps Testing Guide

## Overview

This guide explains how to test offline maps functionality on both web and Android, understand map caching, and test offline functionality.

---

## 1. Current Implementation

### What Works
- ✅ **Custom Area Drawing**: Draw rectangular areas on the map to download tiles
- ✅ **Custom Region Saving**: Save drawn areas with metadata
- ✅ **Tile Storage**: Saves tiles locally for offline use
- ✅ **Storage Limits**: Free: 0MB, Premium: 500MB, Pro: Unlimited

### What's New
- ✅ **Route-Based Offline Maps**: Select saved routes and create offline download areas around them
- ✅ **Buffer Zones**: Automatically creates a buffer area around route coordinates (default 1km, customizable 0.1-10km)
- ✅ **Region Limit Removed**: Only storage/MB limit applies (no 5-region limit)

---

## 2. Testing Custom Area Drawing (Web)

### Step 1: Create Test Area
1. Open the app in browser (http://127.0.0.1:8000)
2. Click **"Offline Maps"** in the sidebar
3. Click **"Start Drawing"** button
4. Click on map to draw a rectangular area
5. Name your area (e.g., "Test Downtown")

### Step 2: Save Custom Area
1. After drawing bounds, click **"Save Region"**
2. Area should appear in the "Saved Regions" tab
3. Check browser console for API response:
   ```
   POST /api/offline-maps/custom 201 Created
   {
     message: "Custom region saved",
     region: { id: "custom_...", name: "Test Downtown", status: "custom" }
   }
   ```

### Step 3: Verify Database
```bash
# SSH into database or use UI tool
SELECT * FROM offline_map_downloads WHERE user_id = 6 ORDER BY created_at DESC LIMIT 5;
```

Expected output:
```
id | user_id | region_id | region_name | south | west | north | east | zoom_levels | radius_km | size_mb | status | created_at
   | 6       | custom_... | Test Downtown | 56.94 | 26.18 | 57.32 | 27.50 | [11,12,13,14] | NULL | 51 | custom | 2026-02-03...
```

---

## 3. Testing Route-Based Offline Maps (Web)

### Step 1: Create a Saved Route First
1. In the Map page, drop a marker
2. Search for roads or draw a custom road
3. Click **"Save Road"** to add it to your saved roads

### Step 2: Save Route as Offline Map
1. Open **"Offline Maps"** panel
2. Click **"Route Based Download"** or similar
3. Select your saved route from dropdown
4. Set buffer distance (default 1km)
5. Click **"Save Route Offline"**

### Step 3: Verify in Database
```bash
SELECT * FROM offline_map_downloads 
WHERE region_id LIKE 'route_%' 
ORDER BY created_at DESC LIMIT 1;
```

Expected:
- `region_id`: "route_123_1707038400" (route_roadid_timestamp)
- `region_name`: "My Route Name (Offline)"
- `radius_km`: 1 (or custom buffer)
- `status`: "custom"

---

## 4. Testing on Android

### Prerequisites
- APK built and installed on emulator/device
- User logged in with test account
- Network connection available (for initial download)

### Step 1: Create Custom Area on Web
1. Use web interface to create custom offline map area
2. Start download (if implemented in Android UI)

### Step 2: Check Android Storage

#### Database Location
```
/data/data/com.scenicroutes.app.debug/databases/
```

#### Shared Preferences
```
/data/data/com.scenicroutes.app.debug/shared_prefs/
```

#### Using ADB
```bash
# List offline map data
adb shell ls -la /data/data/com.scenicroutes.app.debug/

# Check if offline_maps database exists
adb shell ls -la /data/data/com.scenicroutes.app.debug/databases/ | grep offline

# Pull database for inspection
adb pull /data/data/com.scenicroutes.app.debug/databases/offline_maps.db ./
sqlite3 offline_maps.db "SELECT * FROM offline_map_regions LIMIT 5;"
```

### Step 3: Test Offline Functionality
1. **Enable Airplane Mode** on device
2. Navigate to saved offline map area
3. Verify tiles load from cache (no network requests)

#### Using Logcat
```bash
# Monitor network requests
adb logcat | grep -i "offline\|tile\|cache"

# Check for errors
adb logcat *:E | grep -i "offline"

# Full logcat output
adb logcat > android_logs.txt
```

---

## 5. Map Cache & Storage Management

### Cache Location (Web)
```javascript
// IndexedDB database
Database: "scenic_routes_offline"
Object Stores:
  - "regions" (metadata)
  - "tiles" (actual tile images)
  - "metadata" (region info)
```

### Cache Location (Android)
```
/data/data/com.scenicroutes.app.debug/cache/offline_maps/
/data/data/com.scenicroutes.app.debug/app_webview/

// Tile cache format:
/z/x/y.png (standard slippy map tile format)
```

### Clearing Cache

#### Web (Browser DevTools)
```javascript
// IndexedDB
- Open DevTools → Storage → IndexedDB → scenic_routes_offline
- Right-click database → Delete Database

// Or programmatically
const db = await indexedDB.databases();
db.forEach(db => indexedDB.deleteDatabase(db.name));
```

#### Android
```bash
# Clear app cache
adb shell pm clear com.scenicroutes.app.debug

# Or delete specific offline maps directory
adb shell rm -rf /data/data/com.scenicroutes.app.debug/cache/offline_maps/

# Clear shared preferences
adb shell rm /data/data/com.scenicroutes.app.debug/shared_prefs/*.xml
```

### Cache Structure
```
offline_map_downloads/
├── custom_region_1/
│   ├── metadata.json
│   ├── tiles/
│   │   ├── 11/
│   │   │   ├── x1/
│   │   │   │   ├── y1.png
│   │   │   │   └── y2.png
│   │   │   └── x2/...
│   │   ├── 12/...
│   │   └── 13/...
│   └── size_estimate.json
└── route_123/...
```

---

## 6. Storage Limits Testing

### Test 1: Verify MB Limit Works
1. Download areas until approaching storage limit
2. Attempt to download when at limit
3. Should see error: **"Storage limit reached. You have used 500MB. Upgrade to download more."**

### Test 2: Verify No Region Limit
1. Create 10+ custom regions (previously limited to 5)
2. Should all save successfully as long as storage allows
3. Check database:
   ```bash
   SELECT COUNT(*) FROM offline_map_downloads 
   WHERE user_id = 6 AND status = 'custom';
   # Should return >= 6 (no error at 5)
   ```

### Test 3: Check API Limits Response
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://127.0.0.1:8000/api/offline-maps/limits
```

Expected response:
```json
{
  "allowed": true,
  "current_storage_mb": 123,
  "limit_storage_mb": 500
}
```

Note: `limit_regions` field removed

---

## 7. Testing Offline Functionality

### Web - Offline Mode

#### Step 1: Download Region
1. Select region and download tiles

#### Step 2: Test Offline Access
```javascript
// Open DevTools Console
// Disconnect network (DevTools Network → Offline)

// Try navigating to offline region
map.setView([latitude, longitude], zoom);

// Check that tiles load from IndexedDB (not network)
```

#### Step 3: Verify No Network Requests
- Network tab should show no requests
- Tiles should display without errors
- Check browser logs for "Loading from cache"

### Android - Offline Mode

#### Step 1: Verify Tiles Downloaded
```bash
# Check tile directory
adb shell find /data/data/com.scenicroutes.app.debug -name "*.png" | wc -l
# Should show number of downloaded tiles
```

#### Step 2: Enable Airplane Mode
```bash
adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true
```

#### Step 3: Test Offline Display
1. Navigate to offline region in app
2. Zoom in/out to load different tile levels
3. Tiles should display from cache without network

#### Step 4: Verify No Network Traffic
```bash
# Check network connections
adb shell netstat | grep -i "scenic"

# Or monitor with tcpdump (requires rooted device)
adb shell tcpdump -i any -w /sdcard/traffic.pcap
```

#### Step 5: Disable Airplane Mode
```bash
adb shell settings put global airplane_mode_on 0
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false
```

---

## 8. Troubleshooting

### Issue: Custom Region Not Saving
**Error:** `POST /api/offline-maps/custom 500 Internal Server Error`

**Solution:**
1. Check Laravel logs: `tail -f storage/logs/laravel.log | grep custom`
2. Verify database columns exist:
   ```bash
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'offline_map_downloads';
   ```
3. Ensure `radius_km` column exists (was missing, now fixed)

### Issue: Route Offline Map Returns 404
**Error:** `POST /api/offline-maps/route 404 Not Found`

**Solution:**
1. Verify route is registered in `routes/api.php`
2. Check saved road exists: `SELECT * FROM saved_roads WHERE id = ? AND user_id = ?;`
3. Verify road has coordinates: `SELECT LENGTH(coordinates) FROM saved_roads WHERE id = ?;`

### Issue: Tiles Not Loading Offline
**Error:** Blank map when offline

**Solution:**
1. Verify tiles were actually downloaded (check file system)
2. Check tile format (should be slippy map format: z/x/y)
3. Check IndexedDB/cache wasn't cleared
4. Verify zoom level matches downloaded levels

### Issue: Storage Limit Not Enforced
**Error:** Can save regions beyond limit

**Solution:**
1. Check subscription plan: `SELECT * FROM subscriptions WHERE user_id = 6 AND status = 'active';`
2. Verify plan tier: should be 'free', 'premium', or 'pro'
3. Check API response: `curl -H "Authorization: Bearer TOKEN" http://127.0.0.1:8000/api/offline-maps/limits`
4. Verify MB calculation: `SELECT SUM(size_mb) FROM offline_map_downloads WHERE user_id = 6 AND status = 'completed';`

---

## 9. Performance Testing

### Measure Tile Download Speed
```javascript
// In browser console
const start = performance.now();
// Download region
// ...
const end = performance.now();
console.log(`Download took ${(end - start) / 1000} seconds`);
```

### Measure Cache Loading Speed
```javascript
// Time loading from cache (airplane mode on)
const start = performance.now();
map.setView([lat, lng], zoom);
const end = performance.now();
console.log(`Cache load: ${end - start}ms`);
```

### Storage Usage
```bash
# Web: Check IndexedDB size
# DevTools → Storage → IndexedDB → scenic_routes_offline → Right-click → Copy all

# Android: Check file size
adb shell du -sh /data/data/com.scenicroutes.app.debug/cache/offline_maps/
```

---

## 10. Cleanup After Testing

### Clear Test Data
```bash
# Web: Clear IndexedDB
indexedDB.deleteDatabase("scenic_routes_offline");

# Database: Delete test regions
DELETE FROM offline_map_downloads 
WHERE user_id = 6 AND created_at > '2026-02-03 00:00:00';

# Android
adb shell pm clear com.scenicroutes.app.debug
```

---

## Summary

| Feature | Status | Test Method |
|---------|--------|-------------|
| Custom Area Drawing | ✅ Works | Draw on web, verify in DB |
| Custom Area Saving | ✅ Works | Check API response + DB |
| Route-Based Downloads | ✅ New | Select route, verify bounds |
| Buffer Zones | ✅ New | Check coordinates in DB |
| Storage Limit (MB) | ✅ Works | Try exceeding limit |
| Region Limit (Removed) | ✅ Done | Create 10+ regions |
| Offline Access (Web) | ✅ Works | DevTools offline mode |
| Offline Access (Android) | ✅ Works | Airplane mode test |
| Cache Management | ✅ Works | Clear + reload test |


