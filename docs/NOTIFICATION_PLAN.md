# Notification System Implementation Plan

## Overview
Push notifications will enhance user engagement by providing timely updates about routes, social activity, and important app events.

---

## Notification Types & Triggers

### 1. **Route-Related Notifications** 🛣️

#### Route Calculation Complete
- **Trigger**: When a route is successfully calculated
- **Title**: "Route Ready"
- **Message**: "Your route from [start] to [end] is ready! Distance: [X] km"
- **Action**: Tap to view route on map
- **Priority**: Default
- **When**: After `calculateRoute` succeeds in `MapViewModel`

#### Route Saved Successfully
- **Trigger**: When user saves a route as a saved road
- **Title**: "Route Saved"
- **Message**: "[Route name] has been saved to your trips"
- **Action**: Tap to view saved road
- **Priority**: Low
- **When**: After `saveRoute` succeeds in `MapViewModel`

#### Route Sharing Notification
- **Trigger**: When someone shares a route with the user (if sharing feature exists)
- **Title**: "Route Shared"
- **Message**: "[User] shared a route with you: [Route name]"
- **Action**: Tap to view shared route
- **Priority**: Default
- **When**: If route sharing API exists

---

### 2. **Social Notifications** 👥

#### New Follower
- **Trigger**: When someone follows the user
- **Title**: "New Follower"
- **Message**: "[Username] started following you"
- **Action**: Tap to view user profile
- **Priority**: Default
- **When**: After follow API call succeeds (if we have a webhook/polling system)

#### Collection Shared
- **Trigger**: When someone shares a collection with the user
- **Title**: "Collection Shared"
- **Message**: "[User] shared collection: [Collection name]"
- **Action**: Tap to view collection
- **Priority**: Default
- **When**: After `shareCollection` API call (if sharing with specific users)

#### Road Review Added
- **Trigger**: When someone reviews a road the user owns
- **Title**: "New Review"
- **Message**: "[User] reviewed your road: [Road name] - [Rating] stars"
- **Action**: Tap to view review
- **Priority**: Default
- **When**: After review API call (if we have webhook/polling)

#### Comment Added
- **Trigger**: When someone comments on a road the user owns
- **Title**: "New Comment"
- **Message**: "[User] commented on [Road name]"
- **Action**: Tap to view comment
- **Priority**: Default
- **When**: After comment API call (if we have webhook/polling)

---

### 3. **Ride Recording Notifications** 📱

#### Recording Started
- **Trigger**: When user starts ride recording
- **Title**: "Ride Recording Started"
- **Message**: "GPS tracking is active. Your ride is being recorded."
- **Action**: Tap to view recording screen
- **Priority**: Low (persistent notification from BackgroundLocationService)
- **When**: When `LocationTrackingService.startTracking()` is called

#### Recording Stopped
- **Trigger**: When user stops ride recording
- **Title**: "Ride Recording Stopped"
- **Message**: "Recording saved. Distance: [X] km, Duration: [Y] min"
- **Action**: Tap to save or export ride
- **Priority**: Default
- **When**: When `LocationTrackingService.stopTracking()` is called

#### Ride Saved Successfully
- **Trigger**: When recorded ride is saved to saved roads
- **Title**: "Ride Saved"
- **Message**: "[Ride name] has been saved to your trips"
- **Action**: Tap to view saved road
- **Priority**: Low
- **When**: After save ride API call succeeds

---

### 4. **General Notifications** 📢

#### Email Verification Reminder
- **Trigger**: If user hasn't verified email after 24 hours
- **Title**: "Verify Your Email"
- **Message**: "Please verify your email to unlock all features"
- **Action**: Tap to resend verification email
- **Priority**: Default
- **When**: Check on app launch if email not verified

#### Subscription Expiring
- **Trigger**: 7 days before subscription expires
- **Title**: "Subscription Expiring Soon"
- **Message**: "Your premium subscription expires in [X] days"
- **Action**: Tap to renew subscription
- **Priority**: Default
- **When**: Check subscription status on app launch

#### App Update Available
- **Trigger**: When a new app version is available (if we implement update checking)
- **Title**: "Update Available"
- **Message**: "A new version of ScenicRoutes is available"
- **Action**: Tap to open Play Store
- **Priority**: Low
- **When**: If we implement version checking

---

## Implementation Locations

### Files to Modify

1. **MapViewModel.kt**
   - Route calculation complete notification
   - Route saved notification

2. **RideRecordingScreen.kt**
   - Recording started/stopped notifications
   - Ride saved notification

3. **CollectionDetailsScreen.kt**
   - Collection shared notification

4. **UserProfileScreen.kt** (if we add follow notifications)
   - New follower notification

5. **RoadDetailsSheet.kt** (if we add review/comment notifications)
   - Review/comment notifications

6. **ProfileScreen.kt**
   - Email verification reminder
   - Subscription expiring notification

---

## Notification Channels

### Channel 1: Route Notifications
- **ID**: `route_channel`
- **Name**: "Route Updates"
- **Description**: "Notifications about route calculations and saved routes"
- **Importance**: Default

### Channel 2: Social Notifications
- **ID**: `social_channel`
- **Name**: "Social Activity"
- **Description**: "Notifications about followers, shares, reviews, and comments"
- **Importance**: Default

### Channel 3: Ride Recording
- **ID**: `ride_recording_channel`
- **Name**: "Ride Recording"
- **Description**: "Notifications about ride recording status"
- **Importance**: Low (persistent)

### Channel 4: General
- **ID**: `general_channel`
- **Name**: "General"
- **Description**: "General app notifications and reminders"
- **Importance**: Default

---

## User Preferences

Users should be able to control notifications in Settings:
- Enable/disable route notifications
- Enable/disable social notifications
- Enable/disable ride recording notifications
- Enable/disable general notifications

---

## Future Enhancements

1. **Rich Notifications**: Add images, action buttons
2. **Scheduled Notifications**: Route reminders at specific times
3. **Location-Based Notifications**: Notify when near saved roads
4. **Push Notifications from Server**: Real-time updates via FCM (Firebase Cloud Messaging)

---

## Notes

- Most notifications will be **local notifications** (triggered by app actions)
- For real-time social updates, we'd need **server-side push notifications** via FCM
- Background location service already has a persistent notification
- Consider battery impact of frequent notifications
































