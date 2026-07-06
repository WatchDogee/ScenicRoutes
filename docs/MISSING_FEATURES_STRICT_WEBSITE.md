# Missing Features: Android Port vs Website
## Strictly Website Features Missing in Android

**Last Updated**: After implementing POI Details, Collection Management, Filter by Rating, Sort Options, Edit Profile, Weather Display

**Note**: Route Comparison and Route History are NOT user-facing features on the website. They exist as backend/debug features only.

---

## ✅ RECENTLY COMPLETED (Just Implemented)

1. ✅ **POI Details View** - Tap marker for full details
2. ✅ **Collection Management UI** - Create, edit, delete collections
3. ✅ **Filter by Rating** - Filter search results by rating
4. ✅ **Sort Options** - Sort by distance, rating, twistiness
5. ✅ **Edit Profile** - Connect API and implement fully
6. ✅ **Weather Display** - Weather API ready (may need UI connection)

---

## 🔴 HIGH PRIORITY - Website Features Missing

### 1. **Saved Roads & Trips**
- ⚠️ **Road Photos Upload** - Display works, but upload functionality missing
- ❌ **Road Folders/Collections** - Organize roads into folders/collections (different from public collections)
- ❌ **Bulk Operations** - Select multiple roads for delete/edit operations

### 2. **Road Search**
- ❌ **Road Photos in Search Results** - Display photos in search result cards
- ❌ **Search History** - Remember and display recent searches

### 3. **Collections**
- ❌ **Collection Details View** - Full details view with roads list
- ❌ **Add Roads to Collection** - Add saved roads to collections
- ❌ **Remove Roads from Collection** - Remove roads from collections
- ❌ **Collection Sharing** - Share collections with others

### 4. **POI Features**
- ❌ **POI Photos** - Display photos in POI details
- ❌ **Add POI to Route** - Use POI as waypoint (partially implemented, needs connection)
- ❌ **Save POI** - Save favorite POIs
- ❌ **POI Reviews** - Rate and review POIs
- ❌ **POI Directions** - Navigate to POI (partially implemented)

### 5. **Leaderboard**
- ❌ **Most Reviewed Roads** - Leaderboard type
- ❌ **Popular by Country** - Leaderboard type
- ❌ **User Rankings** - User leaderboard
- ❌ **Most Active Users** - Activity leaderboard
- ❌ **Most Followed Users** - Social leaderboard

### 6. **Social Features**
- ❌ **Follow Users** - Follow other users
- ❌ **Social Feed** - Community feed of activities
- ❌ **User Profiles (Public)** - View other users' profiles
- ❌ **Collection Reviews** - Review collections

### 7. **Authentication**
- ❌ **Password Reset** - Reset forgotten password
- ❌ **Email Verification** - Verify email address
- ❌ **Social Login** - Login with Google/Facebook/etc.
- ❌ **Remember Me / Auto-login** - Auto-login option

### 8. **User Profile**
- ⚠️ **Profile Picture Upload** - UI exists, upload missing
- ❌ **Public Profile View** - View other users' profiles
- ❌ **User Statistics** - User activity stats

### 9. **Map Features**
- ⚠️ **Map Layers** - UI exists, functionality missing

### 10. **Weather**
- ⚠️ **Weather on Route** - Weather along route path (not just single location)

---

## 🟡 MEDIUM PRIORITY - Website Features Missing

### 1. **Route Planning**
- ⚠️ **GPX Export** - Placeholder exists, needs full implementation
- ⚠️ **GPX Import** - Placeholder exists, needs full implementation

### 2. **Road Search**
- ❌ **Road Reviews in Search Results** - Show review count/rating in search cards

### 3. **Collections**
- ❌ **Collection Photos** - Display collection cover photos

### 4. **Settings**
- ⚠️ **Settings Screen** - Placeholder exists, needs full implementation

### 5. **Subscription**
- ⚠️ **Subscription Management** - Placeholder exists, needs full implementation

---

## 📊 SUMMARY

### Website Features Status
- **Total Website Features**: ~65
- **✅ Implemented in Android**: ~50 (77%)
- **❌ Missing in Android**: ~15 (23%)

### High Priority Missing (9 features)
1. Road Photos Upload
2. Road Folders/Collections
3. Bulk Operations
4. Road Photos in Search Results
5. Search History
6. Collection Details View
7. Add/Remove Roads to Collections
8. POI Add to Route (connection)
9. Follow Users / Social Feed

### Medium Priority Missing (5 features)
1. GPX Import/Export (full implementation)
2. Road Reviews in Search Results
3. Collection Photos
4. Settings Screen
5. Subscription Management

---

## 📱 PLANNED ANDROID-SPECIFIC FEATURES
## (Not on Website - Mobile-Native Features)

### 🔴 HIGH PRIORITY - Android-Specific

1. **Ride Recording** 📱
   - Record GPS tracks while riding
   - Save recorded rides
   - View ride history
   - Export recorded rides as GPX
   - **Status**: Model exists, needs full implementation
   - **Effort**: 2-3 weeks

2. **Turn-by-Turn Navigation** 🧭
   - Full navigation interface
   - Voice instructions
   - Real-time route guidance
   - Offline navigation support
   - **Status**: Placeholder exists
   - **Effort**: 3-4 weeks

3. **GPX Import/Export** 📥📤
   - Import GPX files from storage
   - Export routes as GPX files
   - Share GPX files
   - **Status**: Placeholder exists, needs full implementation
   - **Effort**: 1-2 weeks

4. **Offline Maps** 🗺️
   - Download map regions
   - Manage offline map regions
   - Use maps without internet
   - **Status**: Placeholder exists
   - **Effort**: 2-3 weeks

### 🟡 MEDIUM PRIORITY - Android-Specific

5. **Push Notifications** 🔔
   - Notifications for various events
   - Route reminders
   - Social notifications
   - **Status**: Not implemented
   - **Effort**: 1-2 weeks

6. **Background Location** 📍
   - Track location in background
   - For ride recording
   - Location-based reminders
   - **Status**: Not implemented
   - **Effort**: 1 week

7. **Widget Support** 📱
   - Home screen widgets
   - Quick route access
   - **Status**: Not implemented
   - **Effort**: 1 week

8. **Android Auto Integration** 🚗
   - Android Auto support
   - Voice commands
   - **Status**: Not implemented
   - **Effort**: 2-3 weeks

9. **Wear OS Support** ⌚
   - Wear OS companion app
   - Quick route info
   - **Status**: Not implemented
   - **Effort**: 2-3 weeks

### 🟢 LOW PRIORITY - Android-Specific

10. **Shortcuts** ⚡
    - App shortcuts
    - Quick actions
    - **Status**: Not implemented
    - **Effort**: 3-5 days

11. **Share Sheet Integration** 📤
    - Native Android share sheet
    - Share routes/roads
    - **Status**: Partially implemented
    - **Effort**: 1 week

12. **File Provider** 📁
    - Secure file sharing
    - GPX file handling
    - **Status**: Not implemented
    - **Effort**: 3-5 days

---

## 📈 ANDROID-SPECIFIC FEATURES SUMMARY

### Total Android-Specific Features: 12
- **🔴 High Priority**: 4 features
- **🟡 Medium Priority**: 5 features
- **🟢 Low Priority**: 3 features

### Implementation Status
- **✅ Implemented**: 0 (0%)
- **⚠️ Partial/Placeholder**: 3 (25%)
- **❌ Not Started**: 9 (75%)

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Complete Website Parity (2-3 weeks)
1. Road Photos Upload
2. Collection Details View
3. Add/Remove Roads to Collections
4. Search History
5. Road Photos in Search Results
6. POI Add to Route (connection)
7. Follow Users / Social Feed

### Phase 2: Android-Specific Core Features (4-5 weeks)
1. Ride Recording
2. Turn-by-Turn Navigation
3. GPX Import/Export (full)
4. Offline Maps

### Phase 3: Polish & Enhancements (2-3 weeks)
1. Bulk Operations
2. Road Folders/Collections
3. Push Notifications
4. Settings & Subscription screens

---

## 📝 NOTES

- **Route Comparison**: Backend exists (`compareStrategies`) but is a debug/development feature, not user-facing on website
- **Route History**: Backend tracking exists (`route_usages` table) but no user-facing history feature on website
- **Website Parity**: ~77% of website features are implemented
- **Android-Specific**: Most mobile-native features are placeholders and need full implementation
































