# Missing Features - Android Port

**Last Updated**: After implementing POI features, API endpoints, and fixing compilation errors

---

## 🔴 HIGH PRIORITY - Website Features Missing

### 1. **Leaderboards** (Partial - Only Featured Collections & Top Rated Roads shown)
- ❌ **Most Reviewed Roads** - UI not implemented
- ❌ **Popular by Country** - UI not implemented  
- ❌ **User Rankings** - UI not implemented
- ❌ **Most Active Users** - UI not implemented (API ready)
- ❌ **Most Followed Users** - UI not implemented (API ready)
- ❌ **Top Rated Collections** - UI not implemented (API ready)
- ⚠️ **Featured Collections** - Basic display exists, needs full implementation
- ⚠️ **Top Rated Roads** - Basic display exists, needs full implementation

### 2. **Collections**
- ❌ **Collection Details View** - Full details view with roads list
- ❌ **Add Roads to Collection** - Add saved roads to collections
- ❌ **Remove Roads from Collection** - Remove roads from collections
- ❌ **Collection Sharing** - Share collections with shareable links (API ready, UI missing)
- ❌ **Collection Reviews** - Review collections (API ready, UI missing)
- ❌ **Collection Photos** - Display collection cover photos

### 3. **POI Features**
- ⚠️ **POI Reviews** - UI structure ready, needs review dialog implementation
- ⚠️ **POI Photos Upload** - API ready, upload UI missing

### 4. **Route Planning**
- ⚠️ **Route Alternatives Display** - Infrastructure exists (AlternativeRoutesSheet), needs API connection and map display
- ⚠️ **GPX Export** - Basic implementation exists, needs polish
- ⚠️ **GPX Import** - Basic implementation exists, needs polish

### 5. **Saved Roads & Trips**
- ⚠️ **Road Photos Upload** - Display works, upload functionality missing
- ❌ **Road Folders/Collections** - Organize roads into folders/collections
- ❌ **Bulk Operations** - Select multiple roads for delete/edit operations

### 6. **Road Search**
- ❌ **Road Photos in Search Results** - Display photos in search result cards
- ❌ **Road Reviews in Search Results** - Show review count/rating in search cards
- ❌ **Search History** - Remember and display recent searches

### 7. **Social Features**
- ❌ **Follow Users** - Follow other users (API ready)
- ❌ **Social Feed** - Community feed of activities (API ready, basic UI exists)
- ❌ **Public User Profiles** - View other users' profiles (needs enhancement)
- ❌ **User Statistics** - User activity stats display (API ready)

### 8. **Authentication**
- ❌ **Password Reset** - Reset forgotten password (API ready, UI missing)
- ❌ **Email Verification** - Verify email address (API ready, UI missing)
- ❌ **Social Login** - Login with Google/Facebook/etc.
- ❌ **Remember Me / Auto-login** - Auto-login option

### 9. **User Profile**
- ⚠️ **Profile Picture Upload** - UI exists, upload functionality missing
- ❌ **Public Profile View** - View other users' profiles (needs enhancement)
- ❌ **User Statistics** - User activity stats display

### 10. **Map Features**
- ⚠️ **Map Layers** - UI exists (layers button), functionality missing (TODO comment)

### 11. **Weather**
- ⚠️ **Weather on Route** - Weather along route path (not just single location)

---

## 🟡 MEDIUM PRIORITY - Website Features Missing

### 1. **Settings**
- ⚠️ **Settings Screen** - Placeholder exists, needs full implementation

### 2. **Subscription**
- ⚠️ **Subscription Management** - Placeholder exists, needs full implementation

---

## 📱 ANDROID-SPECIFIC FEATURES (HIGH PRIORITY)

### 1. **Ride Recording** 📱
- ❌ **Full GPS Tracking** - Placeholder exists, needs full implementation
- ❌ **Save Recorded Rides** - Not implemented
- ❌ **View Ride History** - Not implemented
- ❌ **Export Recorded Rides as GPX** - Not implemented
- **Status**: Placeholder screen exists (`RideRecordingScreen.kt`)

### 2. **Turn-by-Turn Navigation** 🧭
- ❌ **Full Navigation Interface** - Placeholder exists
- ❌ **Voice Instructions** - Not implemented
- ❌ **Real-time Route Guidance** - Not implemented
- ❌ **Offline Navigation Support** - Not implemented
- **Status**: Placeholder screen exists (`NavigationScreen.kt`)

### 3. **GPX Import/Export** 📥📤
- ⚠️ **GPX Import** - Basic implementation exists, needs polish
- ⚠️ **GPX Export** - Basic implementation exists, needs polish
- ❌ **Share GPX Files** - Not implemented

### 4. **Offline Maps** 🗺️
- ❌ **Download Map Regions** - Not implemented
- ❌ **Manage Offline Map Regions** - Not implemented
- ❌ **Use Maps Without Internet** - Not implemented
- **Status**: Placeholder screen exists (`OfflineMapsScreen.kt`)

---

## 🟡 ANDROID-SPECIFIC FEATURES (MEDIUM PRIORITY)

### 5. **Push Notifications** 🔔
- ❌ Not implemented

### 6. **Background Location** 📍
- ❌ Not implemented

### 7. **Widget Support** 📱
- ❌ Not implemented

### 8. **Android Auto Integration** 🚗
- ❌ Not implemented

### 9. **Wear OS Support** ⌚
- ❌ Not implemented

---

## 📊 SUMMARY

### Website Features
- **Total Website Features**: ~65
- **✅ Implemented**: ~50 (77%)
- **❌ Missing**: ~15 (23%)
- **⚠️ Partial**: ~10 (15%)

### Android-Specific Features
- **Total Android Features**: 12
- **✅ Implemented**: 0 (0%)
- **⚠️ Partial/Placeholder**: 4 (33%)
- **❌ Not Started**: 8 (67%)

### Implementation Status by Category

#### ✅ Fully Implemented
- Basic route planning
- Road search (basic)
- POI search and display
- POI photos display
- POI save/unsave
- POI directions
- Saved roads list
- Collections list (basic)
- User profile view
- Login/Register

#### ⚠️ Partially Implemented
- Route alternatives (infrastructure exists)
- GPX Import/Export (basic)
- POI reviews (UI structure ready)
- Profile picture upload (UI exists)
- Map layers (UI exists)
- Weather (single location only)
- Leaderboards (2 types shown)
- Collection management (API ready)
- Social feed (basic UI)

#### ❌ Not Implemented
- All leaderboard types (5 missing)
- Collection details & management UI
- Collection sharing UI
- Collection reviews UI
- Password reset UI
- Email verification UI
- Social login
- Remember me/auto-login
- Road photos upload
- Road folders
- Bulk operations
- Search history
- Road reviews in search
- Public user profiles enhancement
- User statistics display
- Weather on route
- Ride recording (full)
- Turn-by-turn navigation (full)
- Offline maps (full)

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Complete High Priority Website Features (2-3 weeks)
1. Leaderboards (all types) - API ready, need UI
2. Collection Details & Management UI
3. Collection Sharing UI
4. Collection Reviews UI
5. Route Alternatives (connect API)
6. Password Reset UI
7. Email Verification UI
8. Road Reviews in Search Results
9. User Statistics Display

### Phase 2: Android-Specific Core Features (4-5 weeks)
1. Ride Recording (full implementation)
2. Turn-by-Turn Navigation (full implementation)
3. GPX Import/Export (polish)
4. Offline Maps (full implementation)

### Phase 3: Polish & Enhancements (2-3 weeks)
1. Road Photos Upload
2. Road Folders/Collections
3. Bulk Operations
4. Search History
5. Map Layers functionality
6. Weather on Route
7. Settings Screen (full)
8. Subscription Management (full)

---

## 📝 NOTES

- **Google Auth**: Should be added to both website and Android for easier login
- Most missing features have API endpoints ready, primarily need UI implementation
- Many features have placeholder screens that need full implementation
- Route alternatives infrastructure exists but needs API connection
- POI features are mostly complete except for review dialog

