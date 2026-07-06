# Missing Social Features in Android App

**Date**: Current Session  
**Comparison**: Android App vs Website

---

## ✅ **Currently Implemented in Android**

1. **Social Feed** ✅
   - Basic feed showing roads and collections from followed users
   - Filter by All/Roads/Collections
   - Infinite scroll
   - Error handling

2. **Follow/Unfollow** ✅
   - Follow/unfollow users from profile screen
   - API endpoints exist

3. **User Profiles** ✅
   - View public user profiles
   - See user's roads and collections
   - Follow/unfollow button

---

## ❌ **Missing Social Features (Compared to Website)**

### 1. **Following Tab** ❌
**Website**: Has a dedicated "Following" tab showing list of users you follow  
**Android**: Missing - no way to view list of followed users

**What's Missing:**
- Following users list screen
- API endpoint exists (`/api/following`) but not used in Android
- Should show:
  - List of users you follow
  - User cards with profile picture, name, stats
  - Quick unfollow button
  - Link to user profile

**Priority**: 🔴 HIGH (Core social feature)

---

### 2. **Followers Tab** ❌
**Website**: Shows list of users who follow you  
**Android**: Missing

**What's Missing:**
- Followers list screen
- API endpoint exists (`/api/followers`) but not used in Android
- Should show:
  - List of users following you
  - User cards with profile picture, name, stats
  - Quick follow back button
  - Link to user profile

**Priority**: 🟡 MEDIUM (Social engagement)

---

### 3. **User Discovery/Search** ❌
**Website**: Enhanced user search and discovery  
**Android**: Missing

**What's Missing:**
- User search functionality
- "Discover Users" feature
- User recommendations
- Search by username, location
- Filter by activity, followers, etc.

**Priority**: 🟡 MEDIUM (User growth)

---

### 4. **Social Feed Enhancements** ⚠️
**Website**: More advanced feed features  
**Android**: Basic implementation

**What's Missing:**
- Better feed algorithm (engagement-based, not just chronological)
- Activity timeline
- User mentions in feed
- Like/Unlike functionality
- Share to social media
- Better empty states with suggestions

**Priority**: 🟡 MEDIUM (User engagement)

---

### 5. **Collections Tab in Social Section** ⚠️
**Website**: Has collections tab in social features  
**Android**: Collections exist but not integrated into social section

**What's Missing:**
- Collections view within social context
- Public collections discovery
- Collections from followed users

**Priority**: 🟢 LOW (Collections already exist elsewhere)

---

## 🎯 **Recommended Implementation Order**

### Phase 1: Core Social Features (High Priority)
1. **Following Tab** - Add screen to view followed users
   - Create `FollowingScreen.kt`
   - Use existing `/api/following` endpoint
   - Add to Social tab or as separate tab

2. **Followers Tab** - Add screen to view followers
   - Create `FollowersScreen.kt`
   - Use existing `/api/followers` endpoint
   - Add to Social tab or as separate tab

### Phase 2: Enhanced Features (Medium Priority)
3. **User Discovery** - Add user search and recommendations
4. **Feed Enhancements** - Improve feed algorithm and features

---

## 📝 **Implementation Notes**

### API Endpoints Available (Not Used in Android):
- ✅ `/api/following` - Get list of users you follow
- ✅ `/api/followers` - Get list of users following you
- ✅ `/api/users/{id}/followers` - Get user's followers
- ✅ `/api/users/{id}/following` - Get user's following list

### Files to Create:
1. `FollowingScreen.kt` - List of followed users
2. `FollowersScreen.kt` - List of followers
3. `UserDiscoveryScreen.kt` - User search and discovery (future)

### Integration Points:
- Add tabs to `SocialFeedScreen` or create separate screens
- Add navigation routes
- Update `ExploreScreen` if needed

---

**Summary**: The Android app has basic social features (feed, follow/unfollow) but is missing the "Following" and "Followers" tabs that exist on the website. These are core social features that should be implemented for feature parity.













