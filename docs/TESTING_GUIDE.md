# Testing Guide - Usage Statistics & Route Sharing Features

**Date:** 2025-01-XX  
**Purpose:** Guide for testing the newly implemented features

---

## 🧪 Testing Checklist

### 1. Usage Statistics Dashboard

#### Setup
1. Ensure you're logged in with a Premium or Pro account (feature may be gated)
2. Have some route calculation history

#### Test Cases

**Navigation:**
- [ ] Navigate from Profile Screen → Tap "Usage Statistics" menu item
- [ ] Navigate from Subscription Screen → Tap "View Detailed Statistics" button
- [ ] Verify back button works correctly

**Period Selector:**
- [ ] Test "Today" period - verify data updates
- [ ] Test "This Week" period - verify data updates
- [ ] Test "This Month" period - verify data updates (default)
- [ ] Test "This Year" period - verify data updates
- [ ] Verify period selector chips highlight correctly

**Summary Cards:**
- [ ] Verify "Total Routes" displays correct count
- [ ] Verify "Total Distance" formats correctly:
  - Shows "m" for distances < 1km
  - Shows "km" for distances < 1000km
  - Shows "thousand km" for distances >= 1000km
- [ ] Verify "Avg Distance" calculates correctly (total_distance / total_routes)
- [ ] Verify "Routes/Day" calculates correctly:
  - Day: shows total routes
  - Week: shows total / 7
  - Month: shows total / 30
  - Year: shows total / 365

**Charts:**
- [ ] Verify Bar Chart displays "Routes by Type"
- [ ] Verify Pie Chart displays "Routes by Curvature"
- [ ] Verify charts show correct percentages
- [ ] Verify charts show correct counts
- [ ] Verify colors are displayed correctly
- [ ] Verify labels are formatted (capitalized, underscores replaced)

**Edge Cases:**
- [ ] Test with no data (empty state)
- [ ] Test with error (network failure)
- [ ] Test loading state
- [ ] Test retry functionality

---

### 2. Route Sharing with QR Codes

#### Setup
1. Calculate a route on the map
2. Ensure route is displayed

#### Test Cases

**Share Dialog:**
- [ ] Open share dialog from route info card
- [ ] Verify loading state appears
- [ ] Verify share URL is generated
- [ ] Verify share URL is displayed correctly
- [ ] Verify QR code is generated and displayed (200dp size)
- [ ] Verify QR code is scannable

**Copy Functionality:**
- [ ] Tap copy button
- [ ] Verify "Link copied to clipboard" toast appears
- [ ] Paste clipboard - verify URL is correct
- [ ] Verify URL opens shared route page

**Share Functionality:**
- [ ] Tap "Share" button
- [ ] Verify Android share sheet appears
- [ ] Verify share text includes route URL
- [ ] Test sharing to different apps (WhatsApp, Email, etc.)

**Share Statistics:**
- [ ] Verify statistics section appears (if user owns share)
- [ ] Verify "View Count" displays correctly
- [ ] Verify "Share Count" displays correctly
- [ ] Test with new share (should show 0 views/shares)
- [ ] Test after someone views shared route (view count increases)

**Error Handling:**
- [ ] Test with network failure
- [ ] Test with invalid route data
- [ ] Verify error messages display correctly
- [ ] Verify retry functionality

---

## 🔍 Manual Testing Steps

### Test Usage Statistics Dashboard

1. **Navigate to Usage Statistics:**
   ```
   Profile Screen → Usage Statistics menu item
   OR
   Subscription Screen → View Detailed Statistics button
   ```

2. **Test Period Selection:**
   - Tap each period chip (Today, This Week, This Month, This Year)
   - Verify data updates
   - Verify summary cards recalculate

3. **Verify Summary Cards:**
   - Check Total Routes matches your actual route count
   - Check Total Distance is formatted correctly
   - Check Average Distance = Total Distance / Total Routes
   - Check Routes/Day matches expected calculation

4. **Verify Charts:**
   - Check Bar Chart shows routes by type
   - Check Pie Chart shows routes by curvature
   - Verify percentages add up correctly
   - Verify colors are distinct

### Test Route Sharing

1. **Create a Route:**
   - Open Map Screen
   - Plan a route (start → end)
   - Wait for route calculation

2. **Share Route:**
   - Tap "Share" button in route info card
   - Wait for share dialog to load
   - Verify QR code appears
   - Verify share URL is displayed

3. **Test Copy:**
   - Tap copy icon
   - Verify toast message
   - Paste URL in browser
   - Verify shared route page loads

4. **Test Share:**
   - Tap "Share" button
   - Select an app (e.g., WhatsApp)
   - Verify URL is included in share

5. **Test QR Code:**
   - Scan QR code with phone camera
   - Verify it opens shared route URL
   - Verify route displays correctly

---

## 🐛 Common Issues & Solutions

### Issue: Charts not displaying
**Solution:** 
- Check if `by_type` or `by_curvature` data exists in API response
- Verify data is not empty
- Check console for errors

### Issue: QR code not generating
**Solution:**
- Verify ZXing library is in dependencies
- Check if share URL is valid
- Verify bitmap generation doesn't throw exception

### Issue: Share statistics not loading
**Solution:**
- Check if user is authenticated
- Verify API endpoint is correct
- Check network logs for errors
- Statistics may fail silently (this is expected behavior)

### Issue: Period selector not updating data
**Solution:**
- Verify `LaunchedEffect(selectedPeriod)` triggers
- Check API call includes period parameter
- Verify repository method is called correctly

---

## 📱 Device Testing

### Test on Different Screen Sizes:
- [ ] Small phone (e.g., Pixel 4)
- [ ] Large phone (e.g., Pixel 7 Pro)
- [ ] Tablet (if supported)

### Test on Different Android Versions:
- [ ] Android 8.0 (API 26)
- [ ] Android 11 (API 30)
- [ ] Android 13+ (API 33+)

---

## 🔌 API Testing

### Test Usage Statistics API:
```bash
curl -X GET "https://your-api.com/api/subscriptions/usage?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "total": 45,
  "by_type": {
    "graphhopper": 30,
    "round_trip": 15
  },
  "by_curvature": {
    "curvy": 20,
    "extra_curvy": 10,
    "straightest": 15
  },
  "total_distance_km": 1250.5,
  "period": "month"
}
```

### Test Share Statistics API:
```bash
curl -X GET "https://your-api.com/api/routes/shared/TOKEN/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "view_count": 5,
  "share_count": 2,
  "created_at": "2025-01-01T00:00:00Z",
  "expires_at": null
}
```

---

## ✅ Success Criteria

### Usage Statistics Dashboard:
- ✅ All summary cards display correct data
- ✅ Charts render correctly with data
- ✅ Period selector updates data
- ✅ Navigation works from both entry points
- ✅ Error handling works correctly
- ✅ Empty state displays when no data

### Route Sharing:
- ✅ QR code generates and displays
- ✅ Share URL is correct and accessible
- ✅ Copy functionality works
- ✅ Share functionality works
- ✅ Statistics display (if available)
- ✅ Error handling works correctly

---

## 📝 Notes

1. **Feature Gating:** Usage Statistics may be Premium/Pro only - verify feature access
2. **QR Code Library:** Uses ZXing - ensure it's in dependencies
3. **API Authentication:** Share statistics require authentication
4. **Error Handling:** Share stats errors are silent (don't break sharing flow)

---

**Status:** Ready for testing  
**Last Updated:** 2025-01-XX










