# Saved Road Diagnostics Guide

## Overview
This guide explains how to diagnose issues with loading saved road details, particularly the `500 Internal Server Error` that was occurring.

## Log Locations

### Backend (Laravel)
- **Location**: `storage/logs/laravel.log`
- **View logs**: `tail -f storage/logs/laravel.log` (or open the file directly)
- **Search for road issues**: `grep "road_id" storage/logs/laravel.log`

### Frontend (Android)
- **Location**: Android Logcat
- **Filter**: `adb logcat | grep RoadDetailsScreen`
- **Or use Android Studio**: View → Tool Windows → Logcat, filter by tag `RoadDetailsScreen`

## Logging Implementation

### Backend Logging (`SavedRoadController.php`)

The following log entries are created:

1. **Info logs** (normal operation):
   - `Fetching road details` - When `show()` is called
   - `Fetching public road details` - When `showPublic()` is called
   - `Successfully fetched road details` - When road loads successfully

2. **Warning logs** (non-critical issues):
   - `Road not found or not accessible` - Road doesn't exist or user lacks access
   - `Public road not found` - Public road doesn't exist
   - `Error loading some relationships` - Some relationships failed to load (continues with partial data)
   - `Could not load [relationship]` - Individual relationship loading failed

3. **Error logs** (critical issues):
   - `Failed to fetch road details` - Exception in `show()` method
   - `Failed to fetch public road details` - Exception in `showPublic()` method

All error logs include:
- `road_id` - The ID of the road being accessed
- `user_id` - The authenticated user ID (if applicable)
- `error` - The error message
- `file` - The file where the error occurred
- `line` - The line number where the error occurred
- `trace` - Full stack trace

### Frontend Logging (`RoadDetailsScreen.kt`)

The following log entries are created:

1. **Debug logs** (normal flow):
   - `Attempting authenticated endpoint for roadId=X`
   - `Authenticated endpoint response: code=X, isSuccessful=X`
   - `Successfully loaded road from authenticated endpoint`
   - `Attempting public endpoint for roadId=X`
   - `Public endpoint response: code=X, isSuccessful=X`
   - `Successfully loaded road from public endpoint`

2. **Warning logs** (non-critical issues):
   - `Authenticated endpoint failed` - Auth endpoint returned error
   - `Could not read authenticated error body` - Couldn't parse error response

3. **Error logs** (critical issues):
   - `Server error (500) from authenticated endpoint`
   - `Public endpoint failed` - Public endpoint returned error
   - `Exception with authenticated/public endpoint` - Network or other exception
   - `Public endpoint error body` - The error response body
   - `Parsed error message` - Extracted error message from JSON response

## Diagnosing Issues

### 500 Internal Server Error

**Steps to diagnose:**

1. **Check backend logs**:
   ```bash
   tail -n 100 storage/logs/laravel.log | grep -A 20 "Failed to fetch"
   ```

2. **Look for**:
   - The exact error message
   - Which relationship failed to load (if any)
   - Database connection issues
   - Missing columns or tables

3. **Check frontend logs**:
   - Look for the error body in Android Logcat
   - Check if both authenticated and public endpoints failed
   - Verify the error message from backend

### Common Issues and Solutions

#### Issue: "Failed to load user relationship"
- **Cause**: User record deleted or missing
- **Solution**: Check if `user_id` in `saved_roads` table references a valid user

#### Issue: "Failed to load reviews relationship"
- **Cause**: Database schema mismatch or missing foreign keys
- **Solution**: Run migrations: `php artisan migrate`

#### Issue: "Road not found or not accessible"
- **Cause**: Road doesn't exist, is private, or user lacks access
- **Solution**: Verify `is_public` flag and `user_id` ownership

#### Issue: Database connection error
- **Cause**: Database server down or credentials incorrect
- **Solution**: Check `.env` file and database server status

## Testing the Fix

1. **Test authenticated endpoint**:
   - Log in to the app
   - Try to view a saved road you own
   - Check logs for successful loading

2. **Test public endpoint**:
   - Log out or use incognito
   - Try to view a public road
   - Check logs for successful loading

3. **Test error cases**:
   - Try to view a non-existent road (should return 404)
   - Try to view a private road you don't own (should return 404)
   - Check logs for appropriate error messages

## Error Response Format

The backend now returns detailed error responses:

```json
{
  "error": "Failed to fetch road details",
  "message": "SQLSTATE[42S22]: Column not found: 1054 Unknown column 'xyz' in 'field list'"
}
```

The frontend logs this message, making it easier to diagnose issues.

## Next Steps

If you encounter a 500 error:

1. Check `storage/logs/laravel.log` for the detailed error
2. Look for the specific relationship or query that failed
3. Check Android Logcat for the error message from backend
4. Verify database schema matches the code expectations
5. Check if any migrations need to be run

