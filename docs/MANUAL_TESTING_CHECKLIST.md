# Manual Testing Checklist - ScenicRoutes

**Date**: 2025-12-02  
**Purpose**: Guide for manual/interactive testing that requires user interaction

---

## 🎯 **High Priority Manual Tests** (Critical Features)

### **1. Route Planning & Calculation** ⚠️ **REQUIRES MANUAL TESTING**

#### **Basic Route Calculation**
- [ ] **Plan a Route**:
  1. Click "Plan Route" button
  2. Search for start location (e.g., "Zurich, Switzerland")
  3. Search for end location (e.g., "Geneva, Switzerland")
  4. Click "Calculate Route" or similar button
  5. **Verify**: Route appears on map
  6. **Verify**: Route statistics display (distance, duration, elevation)
  7. **Verify**: Route can be saved

#### **Waypoint Management**
- [ ] **Add Waypoints**:
  1. Plan a route with start and end points
  2. Click "Add Waypoint" button
  3. Search or click on map to add waypoint
  4. **Verify**: Waypoint appears in list
  5. **Verify**: Route recalculates with waypoint
  6. Add multiple waypoints (3-5)
  7. **Verify**: All waypoints are included in route

- [ ] **Remove Waypoints**:
  1. Remove a waypoint from the list
  2. **Verify**: Route recalculates without that waypoint
  3. **Verify**: Route updates on map

- [ ] **Reorder Waypoints**:
  1. Change order of waypoints (if drag-and-drop available)
  2. **Verify**: Route recalculates in new order

#### **Avoid Options**
- [ ] **Test Each Avoid Option**:
  1. Plan a route
  2. Check "Avoid Highways"
  3. **Verify**: Route avoids highways
  4. Uncheck and check "Avoid Tolls"
  5. **Verify**: Route avoids tolls
  6. Test "Avoid Ferries"
  7. Test "Avoid Unpaved Roads"
  8. Test multiple avoid options together

#### **Curvature Levels** (Premium/Pro)
- [ ] **Test Different Curvature Levels**:
  1. Plan a route
  2. Select "Straightest" curvature
  3. **Verify**: Route is relatively straight
  4. Select "Balanced" curvature
  5. **Verify**: Route has moderate curves
  6. Select "Curvy" curvature
  7. **Verify**: Route prioritizes curvy roads
  8. Select "Extra Curvy" (Premium/Pro only)
  9. **Verify**: Route maximizes curves

#### **Alternative Routes** (Premium/Pro)
- [ ] **Test Alternative Routes**:
  1. Plan a route
  2. Check "Show Alternative Routes" (if available)
  3. **Verify**: Multiple route options appear
  4. Click on different alternatives
  5. **Verify**: Selected route highlights on map
  6. **Verify**: Statistics update for selected route

#### **Round Trip** (Premium/Pro)
- [ ] **Test Round Trip Feature**:
  1. Plan a route
  2. Enable "Round Trip" option
  3. Set round trip distance (e.g., 100km)
  4. **Verify**: Route returns to start point
  5. **Verify**: Total distance matches round trip distance
  6. Test with different distances
  7. **Verify**: Free tier limited to 300km (if applicable)

#### **Route Actions**
- [ ] **Save Route**:
  1. Calculate a route
  2. Click "Save Route" or "Save to Saved Roads"
  3. **Verify**: Route saved successfully
  4. **Verify**: Route appears in "My Saved Roads"

- [ ] **Export Route** (Premium/Pro):
  1. Calculate a route
  2. Click "Export" or "Download GPX"
  3. **Verify**: GPX file downloads
  4. **Verify**: File can be opened in external app (e.g., Google Maps)

- [ ] **Share Route**:
  1. Calculate a route
  2. Click "Share Route"
  3. **Verify**: Share link generated
  4. **Verify**: Link can be copied/shared

- [ ] **Open in Navigation Apps**:
  1. Calculate a route
  2. Click "Open in Google Maps" or similar
  3. **Verify**: Route opens in external navigation app

---

### **2. Find Curved Roads** ⚠️ **REQUIRES MANUAL TESTING**

#### **Location Search**
- [ ] **Search for Location**:
  1. Click "Find Curved Road"
  2. Type location in search box (e.g., "Alps")
  3. **Verify**: Search suggestions appear
  4. Select a location from suggestions
  5. **Verify**: Marker appears on map at selected location

#### **Marker Placement**
- [ ] **Drop Marker on Map**:
  1. Click "Drop Marker on Map" button
  2. Click on map to place marker
  3. **Verify**: Marker appears at clicked location
  4. **Verify**: Coordinates display correctly
  5. Move marker to different location
  6. **Verify**: Marker updates position

#### **Search Filters**
- [ ] **Test Each Filter**:
  1. Set search radius to different values (5km, 10km, 20km, 50km)
  2. **Verify**: Radius slider works
  3. Select "Primary Road" from Road Type dropdown
  4. **Verify**: Filter applies
  5. Select "Very Curved" from Curvature Type
  6. **Verify**: Filter applies
  7. Select "Medium (5-15km)" from Road Length
  8. **Verify**: Filter applies
  9. Combine multiple filters
  10. **Verify**: All filters work together

#### **Execute Search**
- [ ] **Search for Roads**:
  1. Set location (search or marker)
  2. Set filters
  3. Click "Search Road" button
  4. **Verify**: Search executes
  5. **Verify**: Results appear in list
  6. **Verify**: Results display on map
  7. Click on a result
  8. **Verify**: Road highlights on map
  9. **Verify**: Road details display

#### **View Saved Roads**
- [ ] **Interact with Saved Roads**:
  1. View list of saved roads
  2. Click "View on Map" for a road
  3. **Verify**: Road displays on map
  4. Click "Navigate" for a road
  5. **Verify**: Navigation options appear

---

### **3. Community Roads** ⚠️ **REQUIRES MANUAL TESTING**

#### **Search Community Roads**
- [ ] **Search by Location**:
  1. Click "Community Road"
  2. Use "Search Location" or "Drop Marker"
  3. Select filter (City, Region, Country)
  4. Click "Search Community Road"
  5. **Verify**: Community roads appear
  6. **Verify**: Roads display on map

#### **Browse Community Roads**
- [ ] **View Community Road Details**:
  1. Click on a community road from results
  2. **Verify**: Road details modal/page opens
  3. **Verify**: Road information displays (name, rating, reviews, etc.)
  4. **Verify**: Road displays on map
  5. View reviews and comments
  6. **Verify**: Can interact with road (save, rate, comment)

---

### **4. Saved Roads Management** ⚠️ **REQUIRES MANUAL TESTING**

#### **View Saved Roads**
- [ ] **Access Saved Roads**:
  1. Navigate to saved roads section (sidebar or profile)
  2. **Verify**: List of saved roads displays
  3. **Verify**: Road details visible (name, distance, rating)
  4. Click on a road
  5. **Verify**: Road details page/modal opens
  6. **Verify**: Road displays on map

#### **Edit Saved Road**
- [ ] **Modify Road Details**:
  1. Open a saved road
  2. Click "Edit" button
  3. Change road name
  4. Change description
  5. Add/edit tags
  6. Toggle public/private
  7. Save changes
  8. **Verify**: Changes saved successfully
  9. **Verify**: Updated information displays

#### **Delete Saved Road**
- [ ] **Remove Road**:
  1. Open a saved road
  2. Click "Delete" button
  3. Confirm deletion
  4. **Verify**: Road removed from list
  5. **Verify**: Road no longer accessible

#### **Add Road to Collection**
- [ ] **Add to Collection**:
  1. Open a saved road
  2. Click "Add to Collection" or similar
  3. Select a collection (or create new)
  4. **Verify**: Road added to collection
  5. **Verify**: Road appears in collection

---

### **5. Collections Management** ⚠️ **REQUIRES MANUAL TESTING**

#### **Create Collection**
- [ ] **Create New Collection**:
  1. Navigate to Collections (Social Hub or profile)
  2. Click "Create Collection" button
  3. Enter collection name
  4. Enter description
  5. Set public/private
  6. (Optional) Upload cover image
  7. Save collection
  8. **Verify**: Collection created successfully
  9. **Verify**: Collection appears in list

#### **Edit Collection**
- [ ] **Modify Collection**:
  1. Open a collection
  2. Click "Edit" button
  3. Change name/description
  4. Change public/private setting
  5. Update cover image
  6. Save changes
  7. **Verify**: Changes saved

#### **Manage Roads in Collection**
- [ ] **Add Roads**:
  1. Open a collection
  2. Click "Add Road" or "Add Roads"
  3. Select roads to add
  4. **Verify**: Roads added to collection
  5. **Verify**: Roads appear in collection list

- [ ] **Remove Roads**:
  1. Open a collection
  2. Remove a road from collection
  3. **Verify**: Road removed from collection
  4. **Verify**: Road still exists (not deleted)

- [ ] **Reorder Roads**:
  1. Open a collection
  2. Reorder roads (drag-and-drop if available)
  3. **Verify**: Order saved
  4. **Verify**: Roads display in new order

#### **Delete Collection**
- [ ] **Remove Collection**:
  1. Open a collection
  2. Click "Delete Collection"
  3. Confirm deletion
  4. **Verify**: Collection removed
  5. **Verify**: Roads in collection still exist

---

### **6. Reviews & Comments** ⚠️ **REQUIRES MANUAL TESTING**

#### **Add Review**
- [ ] **Review a Road**:
  1. Open a saved road (own or public)
  2. Click "Add Review" or "Rate"
  3. Select rating (1-5 stars)
  4. Write review text
  5. (Optional) Upload photos
  6. Submit review
  7. **Verify**: Review appears
  8. **Verify**: Rating updates road's average rating

#### **Edit Review**
- [ ] **Modify Own Review**:
  1. Open a road with your review
  2. Click "Edit Review"
  3. Change rating
  4. Change review text
  5. Save changes
  6. **Verify**: Review updated

#### **Delete Review**
- [ ] **Remove Review**:
  1. Open a road with your review
  2. Click "Delete Review"
  3. Confirm deletion
  4. **Verify**: Review removed
  5. **Verify**: Rating recalculated

#### **Add Comment**
- [ ] **Comment on Road**:
  1. Open a saved road
  2. Scroll to comments section
  3. Type comment
  4. Submit comment
  5. **Verify**: Comment appears
  6. **Verify**: Comment shows your username

#### **Reply to Comment**
- [ ] **Reply to Comment**:
  1. Open a road with comments
  2. Click "Reply" on a comment
  3. Type reply
  4. Submit reply
  5. **Verify**: Reply appears nested under comment

#### **Edit/Delete Comment**
- [ ] **Modify Own Comment**:
  1. Find your comment
  2. Click "Edit"
  3. Modify text
  4. Save
  5. **Verify**: Comment updated

- [ ] **Delete Own Comment**:
  1. Find your comment
  2. Click "Delete"
  3. Confirm
  4. **Verify**: Comment removed

---

### **7. Social Features (Authenticated)** ⚠️ **REQUIRES MANUAL TESTING**

#### **Feed**
- [ ] **View Activity Feed**:
  1. Log in with test user
  2. Open Social Hub → Feed tab
  3. **Verify**: Activity feed displays
  4. **Verify**: Shows recent activity (road saves, reviews, etc.)
  5. Scroll through feed
  6. **Verify**: Can interact with feed items

#### **Leaderboard**
- [ ] **View Leaderboards**:
  1. Open Social Hub → Leaderboard tab
  2. Select "Road" category
  3. **Verify**: Top rated roads display
  4. Select "Most Reviewed"
  5. **Verify**: Most reviewed roads display
  6. Select "Most Popular"
  7. **Verify**: Most popular roads display
  8. Select "By Country"
  9. **Verify**: Roads grouped by country
  10. Switch to "Collection" category
  11. **Verify**: Collection leaderboard displays
  12. Switch to "User" category
  13. **Verify**: User leaderboard displays

#### **Search**
- [ ] **Search Functionality**:
  1. Open Social Hub → Search tab
  2. Search for a road name
  3. **Verify**: Road results appear
  4. Search for a user
  5. **Verify**: User results appear
  6. Search for a collection
  7. **Verify**: Collection results appear
  8. Apply filters
  9. **Verify**: Filtered results display

#### **Following**
- [ ] **Follow Users**:
  1. Open Social Hub → Following tab
  2. Search for users
  3. Click "Follow" on a user
  4. **Verify**: User added to following list
  5. **Verify**: Their content appears in feed
  6. Click "Unfollow"
  7. **Verify**: User removed from following

---

### **8. Profile & Settings** ⚠️ **REQUIRES MANUAL TESTING**

#### **User Profile**
- [ ] **View Own Profile**:
  1. Click on user menu/avatar
  2. Select "Profile"
  3. **Verify**: Profile page opens
  4. **Verify**: Profile information displays
  5. **Verify**: Saved roads count correct
  6. **Verify**: Collections count correct
  7. **Verify**: Activity history visible

- [ ] **Edit Profile**:
  1. Open profile
  2. Click "Edit Profile"
  3. Change name
  4. Change username
  5. Upload profile picture
  6. Save changes
  7. **Verify**: Changes saved
  8. **Verify**: Updated information displays

#### **Settings**
- [ ] **Access Settings**:
  1. Click on user menu
  2. Select "Settings"
  3. **Verify**: Settings modal/page opens

- [ ] **Change Preferences**:
  1. Change measurement units (km/miles)
  2. **Verify**: Units update throughout app
  3. Change map preferences
  4. **Verify**: Map settings apply
  5. Change notification settings
  6. **Verify**: Settings saved

- [ ] **Subscription Management**:
  1. Open Settings → Subscription
  2. **Verify**: Current subscription displays
  3. View subscription details
  4. **Verify**: Subscription info correct
  5. (If applicable) Test upgrade flow
  6. (If applicable) Test cancellation

---

### **9. Advanced Features (Premium/Pro)** ⚠️ **REQUIRES MANUAL TESTING**

#### **Offline Maps** (Premium/Pro)
- [ ] **Download Offline Maps**:
  1. Navigate to Settings → Offline Maps
  2. Select a region to download
  3. Click "Download"
  4. **Verify**: Download starts
  5. **Verify**: Progress indicator shows
  6. **Verify**: Download completes
  7. **Verify**: Region appears in downloaded list

- [ ] **Use Offline Maps**:
  1. Download a region
  2. Disconnect from internet (or use airplane mode)
  3. Navigate to downloaded region on map
  4. **Verify**: Map tiles load offline
  5. **Verify**: Can view map without internet

- [ ] **Manage Offline Maps**:
  1. View downloaded regions
  2. Delete a downloaded region
  3. **Verify**: Region removed
  4. **Verify**: Storage space freed

- [ ] **Test Limits**:
  1. As Premium user, try to download 6th region
  2. **Verify**: Error message about 5 region limit
  3. As Pro user, download multiple regions
  4. **Verify**: No limit enforced

#### **GPX Export/Import** (Premium/Pro)
- [ ] **Export Route as GPX**:
  1. Calculate a route
  2. Click "Export" → "GPX"
  3. **Verify**: GPX file downloads
  4. Open file in external app (e.g., Google Maps, Garmin)
  5. **Verify**: Route displays correctly

- [ ] **Import GPX File**:
  1. Click "Import GPX" or similar
  2. Select a GPX file
  3. Upload file
  4. **Verify**: Route displays on map
  5. **Verify**: Route can be saved

#### **Ride Recording** (Pro only)
- [ ] **Start Recording**:
  1. Navigate to Ride Recording feature
  2. Click "Start Recording"
  3. **Verify**: Recording starts
  4. **Verify**: GPS tracking active
  5. **Verify**: Statistics update in real-time

- [ ] **During Recording**:
  1. Pause recording
  2. **Verify**: Recording pauses
  3. Resume recording
  4. **Verify**: Recording continues
  5. View current stats
  6. **Verify**: Stats display correctly

- [ ] **Stop and Save Recording**:
  1. Stop recording
  2. **Verify**: Recording stops
  3. Save recorded ride
  4. **Verify**: Ride saved
  5. **Verify**: Ride appears in history
  6. View ride on map
  7. **Verify**: Route displays correctly

---

### **10. Tier Restrictions Testing** ⚠️ **REQUIRES MANUAL TESTING**

#### **Free Tier Restrictions**
- [ ] **Log in as Free User** (`test_free@example.com`):
  1. **Verify**: "Upgrade to Premium" button visible (not subscription badge)
  2. **Verify**: Can access basic route planning
  3. **Verify**: Cannot use "Extra Curvy" curvature level
  4. **Verify**: Cannot use Alternative Routes
  5. **Verify**: Cannot use Round Trip (or limited to 300km)
  6. **Verify**: Cannot download offline maps
  7. **Verify**: Cannot export GPX
  8. **Verify**: Upgrade prompts appear for Premium features
  9. **Verify**: Can save unlimited roads (recently corrected)
  10. **Verify**: Can access Social Hub fully

#### **Premium Tier Features**
- [ ] **Log in as Premium User** (`test_premium@example.com`):
  1. **Verify**: "Premium" badge displays
  2. **Verify**: Can use all curvature levels (including extra_curvy)
  3. **Verify**: Can use Alternative Routes
  4. **Verify**: Can use Round Trip (unlimited)
  5. **Verify**: Can download offline maps (no region limit)
  6. **Verify**: Can export GPX
  7. **Verify**: Cannot access Pro-only features (API, unlimited offline, ride recording)
  8. **Verify**: Upgrade prompts for Pro features

#### **Pro Tier Features**
- [ ] **Log in as Pro User** (`test_pro@example.com`):
  1. **Verify**: "Pro" badge displays
  2. **Verify**: All Premium features work
  3. **Verify**: Can download unlimited offline maps
  4. **Verify**: Can access API (if implemented)
  5. **Verify**: Can use Ride Recording (if implemented)
  6. **Verify**: No upgrade prompts

---

### **11. Error Handling & Edge Cases** ⚠️ **REQUIRES MANUAL TESTING**

#### **Invalid Inputs**
- [ ] **Test Invalid Route Inputs**:
  1. Try to calculate route without start point
  2. **Verify**: Error message appears
  3. Try to calculate route without end point
  4. **Verify**: Error message appears
  5. Enter invalid coordinates
  6. **Verify**: Error handling

- [ ] **Test Invalid Search**:
  1. Search for non-existent location
  2. **Verify**: "No results" message
  3. Search with empty query
  4. **Verify**: Appropriate error/validation

#### **Network Errors**
- [ ] **Test Offline Behavior**:
  1. Disconnect from internet
  2. Try to calculate route
  3. **Verify**: Error message about connectivity
  4. Try to save road
  5. **Verify**: Error message
  6. Reconnect to internet
  7. **Verify**: App recovers

#### **Empty States**
- [ ] **Test with No Data**:
  1. Log in as new user (no saved roads)
  2. **Verify**: Empty state message displays
  3. **Verify**: "Create" or "Get Started" button visible
  4. View collections with no items
  5. **Verify**: Empty state displays

#### **Large Data Sets**
- [ ] **Test with Many Items**:
  1. Create/save many roads (20+)
  2. **Verify**: List paginates or scrolls correctly
  3. **Verify**: Performance is acceptable
  4. Create many collections
  5. **Verify**: Collections list handles large sets

---

### **12. Cross-Browser Testing** ⚠️ **REQUIRES MANUAL TESTING**

- [ ] **Test in Chrome**
- [ ] **Test in Firefox**
- [ ] **Test in Edge**
- [ ] **Test in Safari** (if available)
- [ ] **Test on Mobile Browser** (responsive design)

---

### **13. Performance Testing** ⚠️ **REQUIRES MANUAL TESTING**

- [ ] **Page Load Times**:
  1. Measure initial page load
  2. **Verify**: Loads in reasonable time (< 3 seconds)
  3. Measure route calculation time
  4. **Verify**: Calculates in reasonable time

- [ ] **Map Performance**:
  1. Zoom in/out rapidly
  2. **Verify**: Map responds smoothly
  3. Pan map quickly
  4. **Verify**: No lag or stuttering
  5. Load many markers on map
  6. **Verify**: Performance acceptable

---

## 📋 **Quick Test Scenarios**

### **Scenario 1: Plan and Save a Route**
1. Plan route from Zurich to Geneva
2. Add waypoint in Bern
3. Select "Curvy" curvature
4. Avoid highways
5. Calculate route
6. Save route
7. Verify route appears in saved roads

### **Scenario 2: Find and Review a Road**
1. Search for curved roads near Alps
2. Select a road from results
3. View road on map
4. Add 5-star review with comment
5. Add a comment
6. Verify review and comment appear

### **Scenario 3: Create and Share Collection**
1. Create new collection "My Favorite Routes"
2. Add 3 saved roads to collection
3. Set collection as public
4. Share collection
5. Verify collection appears in public collections

### **Scenario 4: Test Tier Restrictions**
1. Log in as Free user
2. Try to use Premium features
3. Verify upgrade prompts appear
4. Log in as Premium user
5. Verify Premium features work
6. Try to use Pro features
7. Verify upgrade prompts for Pro

---

## 🎯 **Priority Order**

1. **Route Planning** (Core feature - test first)
2. **Saved Roads CRUD** (Essential functionality)
3. **Collections Management** (Social feature)
4. **Reviews & Comments** (User engagement)
5. **Tier Restrictions** (Monetization critical)
6. **Advanced Features** (Premium/Pro value)
7. **Error Handling** (Quality assurance)

---

## 📝 **Test Credentials**

- **Free**: `test_free@example.com` / `Password123!`
- **Premium**: `test_premium@example.com` / `Password123!`
- **Pro**: `test_pro@example.com` / `Password123!`

---

## ✅ **What's Already Tested** (Automated)

- ✅ UI components load correctly
- ✅ Navigation buttons work
- ✅ API authentication works
- ✅ Route calculation API works
- ✅ Comments API works
- ✅ Data retrieval APIs work
- ✅ Map controls functional

---

**Estimated Manual Testing Time**: 4-6 hours for comprehensive testing




























