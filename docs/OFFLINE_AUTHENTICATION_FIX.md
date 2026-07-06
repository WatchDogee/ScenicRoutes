# Offline Authentication & Settings Fix

## Problem
When users logged in and then enabled airplane mode, they would:
1. Get logged out immediately
2. Lose all settings (theme reset to light mode)
3. Cannot access user profile or offline maps

## Root Causes

### Issue 1: User Data Not Cached
- `ProfileViewModel.checkAuth()` had offline detection (`if (isNetworkError)`)
- BUT it only preserved authentication if `_user.value != null`
- When app restarts with airplane mode on, `_user.value` is null
- Result: User gets logged out even though token exists in DataStore

### Issue 2: Settings Not Preserved Offline
- `SettingsViewModel.loadSettings()` called from MainActivity on every launch
- When API call fails due to network error, error was logged but settings remained empty
- Empty settings → default to "light" theme (line 77 of MainActivity)
- Cached settings existed but weren't used when API failed

## Solutions Implemented

### Fix 1: Cache User Data in DataStore (TokenManager.kt)
Added new fields to TokenManager:
```kotlin
private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
private val USER_NAME_KEY = stringPreferencesKey("user_name")

val userEmail: Flow<String?>
val userName: Flow<String?>

suspend fun saveUserData(email: String, name: String)
```

### Fix 2: Reconstruct User from Cache When Offline (ProfileViewModel.kt)
Updated `checkAuth()` to load cached user data when offline:
```kotlin
onFailure = { error ->
    val isNetworkError = error is IOException || error.cause is IOException
    if (isNetworkError) {
        // Offline: try to load cached user data
        val cachedEmail = tokenManager.userEmail.first()
        val cachedName = tokenManager.userName.first()
        val cachedUserId = tokenManager.userId.first()
        
        if (cachedEmail != null && cachedName != null && cachedUserId != null) {
            // Reconstruct user from cached data
            _user.value = User(
                id = cachedUserId,
                name = cachedName,
                email = cachedEmail
            )
            _isAuthenticated.value = true
        }
    }
}
```

When user is successfully loaded from API, cache their data:
```kotlin
onSuccess = { user ->
    _user.value = user
    _isAuthenticated.value = true
    // Save user data to cache for offline access
    tokenManager.saveUserData(user.email, user.name)
}
```

### Fix 3: Preserve Settings on Network Error (SettingsViewModel.kt)
Updated `loadSettings()` to detect offline and preserve cached settings:
```kotlin
onFailure = { error ->
    val isNetworkError = error is java.io.IOException || error.cause is java.io.IOException
    if (isNetworkError) {
        // Offline - keep cached settings if available
        // Cached settings already loaded in init block
        android.util.Log.d("SettingsViewModel", "Offline - using cached settings")
        _isLoading.value = false
    } else {
        _errorMessage.value = error.message ?: "Failed to load settings"
        _isLoading.value = false
    }
}
```

## How It Works Now

### First Login (Online):
1. User logs in → Token saved to DataStore
2. User data fetched from API → Saved to DataStore cache
3. Settings fetched from API → Saved to SharedPreferences cache
4. App displays: authenticated user, correct theme

### App Restart with Airplane Mode:
1. SettingsViewModel init → Loads cached settings from SharedPreferences
2. ProfileViewModel checkAuth() → Tries to fetch user from API
3. Network error detected → Loads cached user from DataStore
4. User stays authenticated with correct settings

### Benefits:
✅ User remains logged in offline
✅ Theme and settings persist offline
✅ Can access profile screen offline
✅ Can access offline maps without network

## Files Modified

1. **TokenManager.kt**
   - Added user email/name caching
   - Added `saveUserData()` method
   - Clear cached user data on logout

2. **ProfileViewModel.kt**
   - Save user data on successful login/auth
   - Reconstruct user from cache when offline
   - Properly detect network errors vs auth errors

3. **SettingsViewModel.kt**
   - Detect network errors in `loadSettings()`
   - Preserve cached settings when offline
   - Don't show error message for network issues

## Testing

### Test Offline Login Persistence:
1. Login to the app with internet
2. Wait for user profile to load
3. Enable airplane mode
4. Close app completely (swipe away from recents)
5. Reopen app
6. **Expected:** User stays logged in, settings preserved

### Test Offline Theme:
1. Login, set theme to Dark
2. Settings sync to server
3. Enable airplane mode
4. Close and reopen app
5. **Expected:** Dark theme persists

### Test Online->Offline Transition:
1. Login and use app normally
2. While app is open, enable airplane mode
3. Navigate to Profile screen
4. **Expected:** Profile loads from cache, no logout

## Future Improvements

- Cache profile photo URL
- Cache user stats for offline display
- Add "Offline Mode" indicator in UI
- Sync settings changes when back online
- Cache subscription tier (requires updating User model)

