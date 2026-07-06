# Offline Maps Sync: Debug & Verification Guide

## ✅ Completed Tasks
1. **Removed "About Offline Maps" info section** from EnhancedOfflineMapsPanel.jsx

## 📋 System Architecture Verification

### Backend Infrastructure (Laravel)
✅ **Database**:
- `offline_map_regions` - Seeded regions (available list)
- `offline_map_downloads` - User data (tracks both `status='saved'` and `status='completed'`)

✅ **Models**:
- `OfflineMapDownload` - Has user_id, region_id, bounds, zoom_levels, size_mb, status columns

✅ **Service Layer** (`app/Services/OfflineMapService.php`):
- `saveRegionForLater(User, data)` - Creates/updates OfflineMapDownload with status='saved'
- `getUserSavedRegions(User)` - Returns only records where status='saved'
- `canDownloadMore(User)` - Checks subscription limits (free:1, premium:5, pro:unlimited)

✅ **Controller** (`app/Http/Controllers/OfflineMapController.php`):
- `saveRegion()` - POST `/api/offline-maps/save` - Calls saveRegionForLater()
- `getUserSavedRegions()` - GET `/api/offline-maps/saved` - Returns user's saved regions

✅ **Routes** (`routes/api.php`):
- GET `/api/offline-maps/regions` - Returns all available regions (no auth required)
- GET `/api/offline-maps/saved` - Returns user's saved regions (auth required)
- POST `/api/offline-maps/save` - Save region for phone (auth required)
- DELETE `/api/offline-maps/saved/{id}` - Remove saved region (auth required)

### Website (React)
✅ **EnhancedOfflineMapsPanel.jsx**:
- `handleSaveForPhone(region)` - POST `/api/offline-maps/save` with region data
- `loadSaved()` - GET `/api/offline-maps/saved` to fetch user's saved regions
- `loadRegions()` - GET `/api/offline-maps/regions` to fetch available regions
- Displays "Available Regions" list with "Save for phone" button
- Displays "Saved for Phone" list of user's saved regions

### Android (Kotlin)
✅ **OfflineMapsService.kt**:
- `fetchAvailableRegionsFromApi()` - GET `/api/offline-maps/regions`
- `fetchSavedRegionsFromApi(token)` - GET `/api/offline-maps/saved` with Bearer token
- `reportDownloadedRegion()` - POST `/api/offline-maps/downloads` to report completed download
- `syncDownloadedRegionsToServer()` - Compares local vs server and reports new ones

✅ **OfflineMapsScreen.kt**:
- Loads available regions from API
- Maps saved-for-phone list from API into OfflineMapRegion objects
- Displays three sections:
  - Downloaded (local tiles)
  - Saved-for-Phone (from API)
  - Available (seeded regions)

✅ **ApiService.kt**:
- `getOfflineMapRegions()` - GET `/api/offline-maps/regions`
- `getSavedOfflineRegions(token)` - GET `/api/offline-maps/saved`

## 🔍 Expected Sync Flow

### User Flow: Website → Database → Android

1. **Website User Action**:
   - Logs in with email/password or Google
   - Opens Offline Maps panel
   - Sees "Available Regions" list
   - Clicks "Save for phone" on a region

2. **Website → Backend (POST)**:
   - Sends POST `/api/offline-maps/save` with:
     ```json
     {
       "region_id": "latvia",
       "region_name": "Latvia",
       "bounds": { "south": 55.67, "west": 20.27, "north": 57.10, "east": 28.24 },
       "zoom_levels": [0-18],
       "estimated_size_mb": 145
     }
     ```
   - **Auth**: Bearer token from session

3. **Backend Processing** (`OfflineMapController::saveRegion`):
   - Validates request
   - Checks `canDownloadMore()` - confirms user isn't at limit
   - Calls `offlineMapService->saveRegionForLater($user, data)`
   - **Result**: Inserts/updates `offline_map_downloads` record with:
     - user_id = $request->user()->id
     - region_id = "latvia"
     - region_name = "Latvia"
     - bounds (south, west, north, east)
     - zoom_levels = [0-18]
     - size_mb = 145
     - **status = 'saved'** ← Critical field
     - download_date = now()

4. **Website Display Update**:
   - Calls `loadSaved()` to refresh list
   - GET `/api/offline-maps/saved` returns the newly saved region
   - Displays under "Saved for Phone" section

5. **Android User Action**:
   - Logs in with same email/password or Google OAuth
   - Opens Offline Maps
   - Screen calls `fetchSavedRegionsFromApi(token)`
   - Receives list of saved regions
   - Displays under "Saved-for-Phone" section

6. **Android Download** (when user clicks download):
   - Downloads tiles locally
   - Calls `reportDownloadedRegion()` POST `/api/offline-maps/downloads`
   - Backend updates status to `'completed'` and records actual size

## ⚠️ Potential Issues & Verification Steps

### Issue 1: User Not Authenticated
**Symptom**: "Save for phone" button disabled or returns 401
**Check**:
```bash
# Verify auth token is sent
# Check browser DevTools > Network tab > POST /api/offline-maps/save
# Header should have: Authorization: Bearer <token>

# Test in browser console:
fetch('/api/offline-maps/save', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    region_id: 'test',
    region_name: 'Test',
    bounds: { south: 0, west: 0, north: 1, east: 1 },
    zoom_levels: [0,1,2],
    estimated_size_mb: 10
  })
})
```

### Issue 2: Subscription Limits
**Symptom**: "Save for phone" button returns 403 "Region limit reached"
**Check**:
- User's subscription plan (check `users` table `subscription_id` and `subscriptions` table)
- Free tier: max 1 region, 100MB
- Premium: max no region limit, 500MB
- Pro: unlimited

### Issue 3: Database Not Saving
**Symptom**: POST succeeds (201) but region doesn't appear in `/api/offline-maps/saved`
**Check**:
```bash
# Direct database query
SELECT * FROM offline_map_downloads 
WHERE user_id = <user_id> AND status = 'saved'
ORDER BY created_at DESC;

# Should show: Recently added record with status='saved'
```

### Issue 4: Android Not Fetching
**Symptom**: Android shows only seeded regions in "Available", empty "Saved-for-Phone"
**Check in Android**:
```
Check logcat:
- "OfflineMapsScreen" - Should log: "Fetched X saved regions from API"
- "ApiService" - Should log: "GET offline-maps/saved" 200 response
- Verify token is being sent and auth works
```

## 🛠️ Testing Checklist

### Backend Testing (Laravel)
- [ ] POST `/api/offline-maps/save` as authenticated user → 201 success
- [ ] GET `/api/offline-maps/saved` as same user → Returns saved region
- [ ] Check `offline_map_downloads` table → Record exists with `status='saved'`
- [ ] GET `/api/offline-maps/saved` as different user → Returns empty (not user's regions)

### Website Testing
- [ ] Logs in successfully
- [ ] Can see "Available Regions" list
- [ ] Can click "Save for phone" button
- [ ] Region moves to "Saved for Phone" section
- [ ] Can delete from "Saved for Phone"

### Android Testing
- [ ] Logs in with same account
- [ ] Can see "Available Regions" (seeded)
- [ ] Can see "Saved-for-Phone" (from website)
- [ ] Can download saved region
- [ ] Quota decreases
- [ ] Can delete region (quota restored)

## 📊 Query to Verify Saved Regions

```sql
-- All saved regions for user
SELECT id, user_id, region_id, region_name, status, size_mb, created_at
FROM offline_map_downloads
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
AND status = 'saved'
ORDER BY created_at DESC;

-- All downloaded regions for user
SELECT id, user_id, region_id, region_name, status, size_mb, created_at
FROM offline_map_downloads
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
AND status = 'completed'
ORDER BY created_at DESC;

-- User's storage usage
SELECT 
  COUNT(*) as region_count,
  SUM(size_mb) as total_mb
FROM offline_map_downloads
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
AND status = 'completed';
```

## 🔗 File Locations

**Backend**:
- `app/Services/OfflineMapService.php` - Business logic
- `app/Http/Controllers/OfflineMapController.php` - Route handlers
- `app/Models/OfflineMapDownload.php` - Model
- `routes/api.php` - API endpoints

**Website**:
- `resources/js/Components/EnhancedOfflineMapsPanel.jsx` - UI component
- Methods: `handleSaveForPhone()`, `loadSaved()`, `handleDeleteSaved()`

**Android**:
- `android-native/app/src/main/java/.../OfflineMapsService.kt`
- `android-native/app/src/main/java/.../OfflineMapsScreen.kt`
- `android-native/app/src/main/java/.../ApiService.kt`

## ✨ Summary: What Should Happen

```
1. User on website saves region X
   ↓
2. POST /api/offline-maps/save creates DB record with status='saved'
   ↓
3. Website shows region X in "Saved for Phone"
   ↓
4. User opens Android app with same login
   ↓
5. Android fetches GET /api/offline-maps/saved
   ↓
6. Android shows region X in "Saved-for-Phone"
   ↓
7. User downloads region X on Android
   ↓
8. Status changes to 'completed', quota depletes
   ↓
9. User can delete region, quota restores
```

## 🎯 Next Steps

If sync isn't working:
1. Check browser DevTools Network tab for POST `/api/offline-maps/save` response
2. Verify database record was created: `SELECT * FROM offline_map_downloads WHERE user_id = ? AND status = 'saved'`
3. Check Android logcat for "OfflineMapsScreen" logs during fetch
4. Verify token is being sent with Bearer prefix: `Authorization: Bearer <token>`
5. Ensure website and Android are logging in with same email account


