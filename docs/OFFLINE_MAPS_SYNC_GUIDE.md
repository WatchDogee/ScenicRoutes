# Offline Maps Sync - Web & Android Integration

## Overview

The Offline Maps feature now syncs between the website and Android phone:

- **Website**: Save regions for the phone to download later; view regions downloaded on the phone
- **Android**: Fetch saved regions from the website; download tiles locally; report downloads back to website
- **Cross-platform**: All synced via a production API

---

## Architecture

### Web → Phone (Save for Phone)
1. User logs in on the website
2. Clicks "Save for Phone" on an available region
3. Region is saved to `offline_map_downloads` table with status `saved`
4. User opens Android app
5. Android fetches `/offline-maps/saved` and shows the list
6. User taps to download → tiles stored in `internal-files/offline/tiles/<regionId>/`

### Phone → Web (Report Download)
1. User downloads a region on Android
2. Android reports via `POST /offline-maps/downloads` with region details and file size
3. Backend records it in `offline_map_downloads` with status `completed` and device `android`
4. Website displays it under "Downloaded Regions" with a phone badge

---

## Setup for Production

### 1. Configure Android API Base URL

By default, Android points to the emulator (`http://10.0.2.2:8000/api/`). For production:

**Option A: Build-time Configuration (Recommended)**

```bash
cd ScenicRoutes_dev/android-native
export API_BASE_URL="https://scenicroutes.com/api/"  # Replace with your domain
./gradlew clean installDebug -x test -x lint
```

Or in `local.properties`:
```properties
API_BASE_URL=https://scenicroutes.com/api/
```

**Option B: Permanent Code Change**

Edit [android-native/app/build.gradle.kts](android-native/app/build.gradle.kts#L18):
```kotlin
val apiBaseUrl: String =
    (project.findProperty("API_BASE_URL") as String?)
        ?: System.getenv("API_BASE_URL")
        ?: "https://scenicroutes.com/api/"  // ← Change this
```

### 2. Verify API Endpoints

All offline maps endpoints are authenticated (require bearer token):

**Web to Phone:**
- `GET /api/offline-maps/regions` - List all available regions (public)
- `GET /api/offline-maps/saved` - List user's saved regions (auth required)
- `POST /api/offline-maps/save` - Save region for phone (auth required)
- `DELETE /api/offline-maps/saved/{id}` - Remove saved region (auth required)

**Phone to Web (Sync Downloads):**
- `GET /api/offline-maps/saved` - Fetch saved regions (auth required)
- `POST /api/offline-maps/downloads` - Report locally downloaded region (auth required)

**Web Dashboard:**
- `GET /api/offline-maps/downloads` - List all downloaded regions (auth required)

---

## Testing Sync

### Step 1: Set Up Backend
```bash
cd ScenicRoutes_dev
php artisan migrate  # Ensure offline_map_downloads table exists
```

### Step 2: Save Region on Website
1. Open website: `http://localhost:3000` (or your production domain)
2. Log in with test account
3. Go to Offline Maps panel
4. Click "Save for Phone" on a region (e.g., Balvi, Latvia)
5. Check `offline_map_downloads` table: status should be `saved`

### Step 3: Fetch on Android
1. Build Android with production API URL (see **Configure Android API Base URL**)
2. Install: `./gradlew installDebug`
3. Open app on phone/emulator
4. Go to Offline Maps screen
5. Should see "Saved for Phone" list with the Balvi region
6. Tap to download (tiles will sync locally)

### Step 4: Report Download to Website
1. After Android download completes
2. Android automatically calls `POST /api/offline-maps/downloads` to report
3. Go back to website and refresh Offline Maps panel
4. Balvi region should appear under "Downloaded Regions" with phone badge

---

## API Request Examples

### Save Region (Web)
```bash
curl -X POST https://scenicroutes.com/api/offline-maps/save \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "region_id": "balvi",
    "region_name": "Balvi, Latvia",
    "bounds": {
      "south": 56.5,
      "west": 24.0,
      "north": 57.2,
      "east": 24.8
    },
    "zoom_levels": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    "estimated_size_mb": 50
  }'
```

### Fetch Saved Regions (Android)
```bash
curl -X GET https://scenicroutes.com/api/offline-maps/saved \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Report Download (Android)
```bash
curl -X POST https://scenicroutes.com/api/offline-maps/downloads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "region_id": "balvi",
    "region_name": "Balvi, Latvia",
    "size_mb": 47,
    "download_date": 1703414400000
  }'
```

---

## Files Modified

### Android
- `android-native/app/build.gradle.kts` - Added `API_BASE_URL` BuildConfig
- `android-native/app/src/main/java/.../NetworkModule.kt` - Uses `BuildConfig.API_BASE_URL`
- `android-native/app/src/main/java/.../ApiService.kt` - Added offline maps endpoints
- `android-native/app/src/main/java/.../OfflineMapsService.kt` - Added `fetchSavedRegionsFromApi()` and `reportDownloadedRegion()`

### Backend (Laravel)
- `app/Http/Controllers/OfflineMapController.php` - Added `reportDownloadedRegion()`
- `app/Services/OfflineMapService.php` - Added `recordDownloadedRegion()`
- `routes/api.php` - Added `POST /offline-maps/downloads` route

### Website (React)
- `resources/js/Components/EnhancedOfflineMapsPanel.jsx` - Already supports saved and downloaded lists
- UI toned to mellow pastels for better UX

---

## Troubleshooting

### Android not fetching saved regions
**Check:**
1. API base URL is correct: `BuildConfig.API_BASE_URL`
2. User token is valid: Check `/api/user` returns 200
3. Network connectivity: Check logcat for HTTP errors
4. Endpoint is called: Add log in `OfflineMapsScreen` LaunchedEffect

### Website not showing Android downloads
**Check:**
1. Android reported download: Verify `POST /api/offline-maps/downloads` completed
2. Backend recorded it: Query `offline_map_downloads` table with status `completed` and device `android`
3. Website endpoint: Check `/api/offline-maps/downloads` returns the download

### Regions not showing on Android
**Check:**
1. Regions exist in backend: Query `offline_map_regions` table
2. User is authenticated: Token is sent in Authorization header
3. Response is parsed: Add logging to `fetchSavedRegionsFromApi()`

---

## Future Enhancements

- [ ] Auto-sync on app launch
- [ ] Offline queue for failed downloads
- [ ] Region update notifications
- [ ] Selective tile deletion to free space
- [ ] Estimated download time per region
- [ ] Background sync service

