# Feature Verification Checklist

## How to Test Features

### 1. Road Details Page
**Test Steps:**
1. Navigate to "My Roads" (Trips screen)
2. Tap on any saved road/route
3. Verify road details load correctly
4. Check all tabs: Reviews, Comments, Statistics
5. Try adding a review (requires login)
6. Try adding a comment (requires login)
7. Test "View on Map" button
8. Test "Start Navigation" button
9. Test "Share" button

**Expected Behavior:**
- Road details should load from either authenticated or public endpoint
- Reviews/Comments tabs should show existing reviews/comments
- Add review/comment buttons should work when logged in
- Navigation buttons should work if road has geometry

**Common Issues:**
- 404 error: Road might be private or deleted
- 401 error: Token expired, need to re-login
- Empty reviews/comments: Normal if none exist yet

---

### 2. Following/Followers System
**Test Steps:**
1. Navigate to Profile → View your profile
2. Check "Following" and "Followers" counts
3. Navigate to Explore → Social tab
4. Search for users
5. Tap on a user profile
6. Try following/unfollowing
7. Navigate to "Following" screen (from profile or explore)
8. Navigate to "Followers" screen

**Expected Behavior:**
- Following/Followers screens should load user lists
- Follow/Unfollow buttons should toggle correctly
- User counts should update after follow/unfollow

**API Endpoints:**
- `GET /api/following` - Get users you follow
- `GET /api/followers` - Get users following you
- `POST /api/users/{id}/follow` - Follow a user
- `DELETE /api/users/{id}/follow` - Unfollow a user

---

### 3. Review System
**Test Steps:**
1. Open any road details (saved or public)
2. Go to Reviews tab
3. Click "Add Review"
4. Select rating (1-5 stars)
5. Add optional comment
6. Submit review
7. Verify review appears in list
8. Check if rating updates

**Expected Behavior:**
- Review dialog should open
- Rating selection should work
- Comment field should be optional
- Review should appear after submission
- Road rating should update

**API Endpoints:**
- `POST /api/saved-roads/{id}/reviews` - Add review
- Reviews are included in road details response

---

### 4. Comments System
**Test Steps:**
1. Open any road details
2. Go to Comments tab
3. Click "Add Comment"
4. Enter comment text
5. Submit comment
6. Verify comment appears in list

**Expected Behavior:**
- Comment dialog should open
- Comment should appear after submission
- Comments should show user info and timestamp

**API Endpoints:**
- `POST /api/saved-roads/{id}/comments` - Add comment
- Comments are included in road details response

---

### 5. Community Roads
**Test Steps:**
1. Navigate to Map screen
2. Open community roads search panel
3. Drop a marker or enter location
4. Set search filters (country, region, rating, etc.)
5. Click "Search Roads"
6. Verify roads appear on map
7. Tap on a road to see details
8. Try saving a community road

**Expected Behavior:**
- Search should return public roads
- Roads should be drawn on map
- Road details should load when tapped
- Save button should work when logged in

**API Endpoints:**
- `GET /api/public-roads` - Search public roads
- `GET /api/public-roads/{id}` - Get public road details

---

### 6. Ratings Display
**Test Steps:**
1. View any road in "My Roads" list
2. Check if rating is displayed
3. View road details
4. Check rating in header
5. Check review count

**Expected Behavior:**
- Rating should show as stars or number
- Review count should be accurate
- Rating should update when reviews are added

---

## Debugging Tips

### Check Logs
Use Android Studio Logcat with filters:
- `RoadDetailsScreen` - Road details loading
- `FollowingScreen` - Following system
- `FollowersScreen` - Followers system
- `MapViewModel` - Community roads search
- `ApiService` - API calls

### Common Error Codes
- **401 Unauthorized**: Token expired or invalid - user needs to re-login
- **403 Forbidden**: User doesn't have permission (e.g., private road)
- **404 Not Found**: Resource doesn't exist or was deleted
- **500 Server Error**: Backend issue - check Laravel logs

### Verify API Endpoints
1. Check `routes/api.php` for route definitions
2. Verify controller methods exist
3. Check authentication middleware
4. Test endpoints with Postman/curl

### Check Data Models
- Verify `SavedRoad` model includes `reviews`, `comments`, `user` relationships
- Check `Review` and `Comment` models
- Verify `User` model for following relationships

---

## Quick Verification Commands

### Backend (Laravel)
```bash
# Check routes
php artisan route:list | grep saved-roads
php artisan route:list | grep follow
php artisan route:list | grep review

# Test API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/saved-roads/1
curl http://localhost:8000/api/public-roads/1
```

### Android Logs
```bash
# Filter for specific screens
adb logcat | grep RoadDetailsScreen
adb logcat | grep FollowingScreen
adb logcat | grep "API Error"
```

---

## Feature Status

### ✅ Working Features
- Road details loading (with fallback to public endpoint)
- Reviews tab display
- Comments tab display
- Statistics tab
- Share functionality
- View on Map
- Start Navigation
- Following/Followers screens
- Community roads search

### ⚠️ Needs Verification
- Review submission (API works, need to verify UI updates)
- Comment submission (API works, need to verify UI updates)
- Photo upload (UI exists, needs testing)
- Follow/Unfollow buttons (API exists, need to verify UI)

### ❌ Known Issues
- Road details may fail if road is private and user not logged in
- Review/Comment reload may fail if using wrong endpoint
- Some error messages could be more user-friendly

---

## Next Steps for Testing

1. **Test each feature systematically** using the steps above
2. **Check logs** for any errors or warnings
3. **Verify API responses** match expected format
4. **Test edge cases**: empty lists, network errors, expired tokens
5. **Compare with web version** to ensure feature parity

