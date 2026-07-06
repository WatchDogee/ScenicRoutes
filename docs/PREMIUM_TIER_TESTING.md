# Premium Tier Testing Guide

**User**: `test_premium@example.com` / `Password123!`

## Manual Testing Steps

### 1. Login
1. Navigate to http://localhost:8000/map
2. Click "Sign In" button in header
3. Enter credentials:
   - Email/Username: `test_premium@example.com`
   - Password: `Password123!`
4. Click "Sign In"

### 2. Verify Premium Badge
- ✅ Check that "Premium" badge appears in header (not "Pro")
- ✅ Click on Premium badge to see subscription menu
- ✅ Verify subscription options are available

### 3. Test Navigation Features
- ✅ Leaderboard button → Opens Social Hub
- ✅ Collection button → Opens Social Hub  
- ✅ Community button → Opens Social Hub

### 4. Test Map Features
- ✅ **Find Curved Road** → Should work (verify access level)
- ✅ **Plan Route** → Should work (verify Premium features available)
- ✅ **Community Road** → Should work

### 5. Test Social Hub
- ✅ All tabs accessible: Leaderboard, Collection, Following, Feed, Search
- ✅ Leaderboard filters work
- ✅ Sort options work

### 6. Test Premium Features
- ✅ Verify Premium-tier features are accessible
- ✅ Check if any Pro-only features show upgrade prompts
- ✅ Test route planning with Premium features
- ✅ Test offline maps (if Premium has access)

### 7. Test User Menu
- ✅ Click on profile picture/name
- ✅ Verify menu shows:
  - My Profile
  - Settings
  - Subscription (should show "Premium" badge)
  - Usage Statistics (should be visible for Premium)
  - Log Out

### 8. Compare with Pro Tier
- Note differences in available features
- Note any upgrade prompts for Pro features
- Verify Premium tier restrictions work correctly

---

## Expected Premium Tier Features

Based on `FeatureGate.jsx`, Premium tier has access to:
- ✅ **curved_routes** - Curved route finding
- ✅ **round_trip** - Round trip planning
- ✅ **extra_curvy** - Extra curvy route options
- ✅ **alternative_routes** - Alternative route suggestions
- ✅ **offline_maps** - Offline map downloads (limited)
- ✅ **ride_recording** - GPS ride recording
- ✅ **turn_by_turn** - Turn-by-turn navigation
- ✅ **gpx_export** - GPX file export
- ✅ **private_roads** - Private road access
- ✅ **usage_analytics** - Usage statistics

**Pro-only features** (Premium should see upgrade prompts):
- ❌ **api_access** - API access (Pro only)
- ❌ **unlimited_offline_maps** - Unlimited offline maps (Pro only)

---

## Testing Notes

**Status**: ⚠️ **PENDING MANUAL TESTING**

The browser automation had issues with form field interactions. Manual testing is required to verify Premium tier functionality.

**Next Steps**:
1. Manually log in with Premium credentials
2. Test all features listed above
3. Document findings
4. Compare with Pro tier to verify tier gating works correctly


