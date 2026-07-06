# Android App Testing Checklist

## ✅ Core Features to Test

### 1. Authentication & User Management
- [ ] **Login**
  - Enter email and password
  - Verify login button works
  - Check error handling for invalid credentials
  - Verify token is stored after successful login
  
- [ ] **Registration**
  - Fill registration form
  - Verify validation works
  - Check if user can register successfully
  
- [ ] **Profile Screen**
  - View user profile information
  - Edit profile (if implemented)
  - Logout functionality

### 2. Map Screen - Basic Functionality
- [ ] **Map Display**
  - Map loads and displays correctly
  - Map can be panned and zoomed
  - Map tiles load properly (OpenStreetMap)
  - Current location button centers map on user location (if permission granted)
  
- [ ] **Search Bar**
  - Type location name in search bar
  - Verify autocomplete/suggestions appear
  - Select a location from suggestions
  - Verify map centers on selected location
  - Verify search works with different location formats

### 3. Route Planning
- [ ] **Plan Route**
  - Click floating action button (center bottom)
  - Select "Plan Route" from action menu
  - Enter start and end locations
  - Select route options (curvature level, avoid options)
  - Click "Calculate Route"
  - **VERIFY: Route polyline appears on map (thick blue line)**
  - Verify route info card appears at top showing distance and time
  - Verify map zooms to fit route
  
- [ ] **Route Options**
  - Test different curvature levels (straightest, mellow, curved, extra curvy)
  - Test avoid options (highways, unpaved, tolls, ferries)
  - Test with waypoints (if implemented)
  - Test alternative routes (if implemented)

- [ ] **Route Actions**
  - Save route (opens save dialog)
  - Share route
  - Clear route
  - Navigate to route (opens in external navigation app)

### 4. Road Search (Curved Roads)
- [ ] **Place Search Marker**
  - Tap on map to place a marker
  - Verify marker appears on map
  - Verify hint card appears at bottom with "Filters" and "Search Roads" buttons
  
- [ ] **Search Roads from Hint Card**
  - Click "Search Roads" button on hint card
  - Verify search executes with default parameters
  - Verify roads appear on map as polylines
  - Verify search radius circle appears (if implemented)
  
- [ ] **Search Roads from Filters Panel**
  - Click "Filters" button (from hint card or quick actions)
  - Adjust search radius slider
  - Select road type filter (All, Primary, Secondary, Tertiary)
  - Select curvature filter (All, Very Curved, Moderate, Mellow)
  - Select distance filter (All, Short, Medium, Long)
  - Click "Search Roads" button at bottom
  - Verify search executes with selected filters
  - Verify roads appear on map
  - Verify filters panel closes after search

- [ ] **Road Details**
  - Tap on a road polyline from search results
  - Verify road details sheet appears
  - Verify road information is displayed correctly
  - Test "Navigate", "Save", and "Share" buttons

### 5. POI (Points of Interest) Search
- [ ] **Search POIs**
  - Click floating action button
  - Select "Search POIs" from action menu
  - Verify POI search executes (uses map center or search marker)
  - Verify POI markers appear on map
  - Tap on a POI marker to see details (if implemented)

### 6. Saved Roads
- [ ] **View Saved Roads**
  - Navigate to "Explore" tab (bottom navigation)
  - Go to "Saved Roads" section
  - Verify saved roads list displays
  - Tap on a saved road
  - Verify road details appear
  - Verify map centers on selected road

- [ ] **Save Road from Search**
  - After searching for roads, tap on a road
  - Click "Save" in road details sheet
  - Verify road is saved
  - Verify it appears in saved roads list

### 7. Collections
- [ ] **View Public Collections (Discover Tab)**
  - Navigate to "Explore" tab
  - Go to "Collections" section
  - Verify public collections list displays
  - **Verify private collections do NOT appear here**
  - Tap on a collection to view details
  - Verify collection details screen opens
  - Verify roads in collection display

- [ ] **View My Collections (Manage)**
  - Navigate to "My Roads" tab (bottom navigation)
  - Tap "My Collections" button
  - Verify both public AND private collections display
  - Tap on a collection
  - **VERIFY: Collection details screen opens correctly**
  - Verify roads in collection display

- [ ] **Create Collection**
  - Create a new public collection
  - Add roads to collection
  - Verify it appears in both "My Collections" and "Discover" tab
  - Create a new private collection
  - Verify it appears ONLY in "My Collections"
  - **VERIFY: Private collection does NOT appear in Discover tab**

- [ ] **Edit/Delete Collections**
  - Edit collection name/details
  - Remove roads from collection
  - Delete collection
  - Verify changes persist

### 8. Trips
- [ ] **View Trips**
  - Navigate to "Trips" tab (bottom navigation)
  - Verify trips list displays
  - Tap on a trip to view details
  - Verify trip route appears on map

- [ ] **Create Trip** (if implemented)
  - Create a new trip
  - Add routes to trip
  - Save trip

### 9. Subscription
- [ ] **View Subscription**
  - Navigate to "Profile" tab
  - Go to "Subscription" section
  - Verify current subscription plan displays
  - Verify usage statistics display
  - Verify subscription status is correct

- [ ] **Subscription Tier Upgrade (Free → Premium)**
  - Start with free tier account
  - Verify free tier limits are enforced (saved roads, collections, etc.)
  - Navigate to "Profile" → "Subscription"
  - Select premium tier upgrade
  - Complete upgrade process (payment/confirmation)
  - Verify subscription tier updates to Premium
  - Verify premium features are now accessible
  - Verify previously restricted features are now available
  - Check usage limits have increased
  - Test creating more collections/saving more roads than free tier allowed

- [ ] **Manage Subscription** (if implemented)
  - Upgrade/downgrade plan
  - Cancel subscription
  - Resume subscription

### 10. Mobile-Specific Features (Placeholders)
- [ ] **GPX Import**
  - Click floating action button
  - Select "Import GPX"
  - Verify placeholder dialog appears
  - (Feature not yet implemented)

- [ ] **GPX Export**
  - Click floating action button
  - Select "Export GPX"
  - Verify placeholder dialog appears
  - (Feature not yet implemented)

- [ ] **Offline Maps**
  - Click floating action button
  - Select "Offline Maps"
  - Verify placeholder dialog appears
  - (Feature not yet implemented)

- [ ] **Ride Recording**
  - Click floating action button
  - Select "Record Ride"
  - Verify placeholder dialog appears
  - (Feature not yet implemented)

- [ ] **Turn-by-Turn Navigation** (if implemented)
  - Start navigation from route
  - Verify navigation interface appears
  - Verify turn-by-turn instructions

## 🔍 Known Issues to Verify

### Route Drawing
- [ ] **Routes not appearing on map**
  - Check Logcat for "MapScreen" and "MapViewModel" logs
  - Verify route calculation succeeds (check "Route calculation successful" log)
  - Verify route geometry is not empty (check "geometry points" log)
  - Verify polyline is created and added to map (check "Route polyline added" log)
  - Verify map invalidates after adding polyline (check "Map invalidated" log)
  - Check if route polyline width is 20f and color is blue (#1976D2)

### Road Search
- [ ] **Search not starting**
  - Verify marker is placed on map before searching
  - Check Logcat for "FiltersPanel" and "MapViewModel" logs
  - Verify coordinates are valid (not 0.0, 0.0)
  - Verify "Search Roads" button is visible in FiltersPanel
  - Verify search executes when button is clicked

- [ ] **Search results not appearing**
  - Check Logcat for "Search roads updated" log
  - Verify roads are returned from API (check "roads found" log)
  - Verify road polylines are drawn on map
  - Check if road polylines have title "road_search" or "road_*"

### Location Services
- [ ] **Location permission**
  - Verify location permission is requested on first launch
  - Verify "My Location" button works after permission granted
  - Verify location overlay appears on map

### Network Issues
- [ ] **API calls failing**
  - Check Logcat for network errors
  - Verify cleartext traffic is allowed (for emulator)
  - Verify API base URL is correct
  - Check if authentication token is included in requests

## 📱 Device-Specific Testing

- [ ] **Small Phone (API 36.0)**
  - Verify map font size is readable
  - Verify UI elements are not too small
  - Verify touch targets are large enough
  
- [ ] **Medium Phone**
  - Verify layout looks good
  - Verify all features work correctly
  
- [ ] **Large Phone/Tablet**
  - Verify layout scales properly
  - Verify UI doesn't look stretched

## 🐛 Debugging Tips

1. **Enable Logcat filtering:**
   - Filter by "MapScreen" to see map-related logs
   - Filter by "MapViewModel" to see route calculation logs
   - Filter by "FiltersPanel" to see search filter logs
   - Filter by "ApiService" to see API call logs

2. **Check route state:**
   - Look for "Route calculation successful" log
   - Check "geometry points" count (should be > 0)
   - Verify "Route polyline added" log appears
   - Check for any error logs

3. **Check search state:**
   - Look for "searchRoads called" log
   - Check "Road search response" log
   - Verify "Search roads updated" log with road count
   - Check for any error logs

4. **Verify map state:**
   - Check if mapView is not null
   - Verify overlays are being added
   - Check if map invalidate is called

## 📝 Test Results Template

For each test, note:
- **Status**: ✅ Pass / ❌ Fail / ⚠️ Partial
- **Device**: (e.g., Pixel 5, API 36)
- **Notes**: Any issues or observations
- **Logs**: Relevant logcat entries

---

**Last Updated**: After route drawing and search fixes
**Next Review**: After implementing remaining features

































