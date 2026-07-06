# Fix for Retrofit Wildcard Type Issue

## Problem
```
Exception uploading custom region: Parameter type must not include a type variable or wildcard: java.util.Map<java.lang.String, ?> (parameter #2)
```

This error occurs because Retrofit's code generation doesn't support wildcard types in API method parameters.

## Solution

The fix is to replace the untyped `Map<String, Any>` with a properly typed data class.

### Step 1: Use the CustomRegionRequest class

In OfflineMapsService.kt, update the `uploadCustomRegion()` method to use:

```kotlin
suspend fun uploadCustomRegion(token: String, region: OfflineMapRegion): Boolean {
    return withContext(Dispatchers.IO) {
        try {
            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
            
            // Use typed data class instead of Map<String, Any>
            val request = com.scenicroutes.app.data.api.CustomRegionRequest(
                region_id = region.id,
                region_name = region.name,
                bounds = com.scenicroutes.app.data.api.BoundsData(
                    south = region.bounds.latSouth,
                    west = region.bounds.lonWest,
                    north = region.bounds.latNorth,
                    east = region.bounds.lonEast
                ),
                zoom_levels = region.zoomLevels.toList(),
                radius_km = region.customRadius
            )
            
            val response = apiService.saveCustomOfflineRegion("Bearer $token", request)
            response.isSuccessful.also { success ->
                if (success) {
                    android.util.Log.d("OfflineMapsService", "Custom region uploaded: ${region.id}")
                } else {
                    android.util.Log.e("OfflineMapsService", "Error uploading custom region: ${response.code()}")
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("OfflineMapsService", "Exception uploading custom region: ${e.message}", e)
            false
        }
    }
}
```

### Step 2: Update ApiService.kt

Replace the saveCustomOfflineRegion method signature:

```kotlin
@POST("offline-maps/custom")
suspend fun saveCustomOfflineRegion(
    @Header("Authorization") token: String,
    @Body request: com.scenicroutes.app.data.api.CustomRegionRequest
): Response<Map<String, Any>>
```

## Why This Works

- **Typed data classes**: Retrofit can properly inspect and handle strongly-typed Kotlin data classes
- **No wildcards**: Removes the `Map<String, ?>` wildcard that Retrofit can't process
- **Serialization**: Gson automatically serializes CustomRegionRequest to the correct JSON format
- **Type safety**: Compile-time checking prevents mistakes

## Files Changed
1. Created: `android-native/app/src/main/java/com/scenicroutes/app/data/api/CustomRegionRequest.kt`
2. Modified: `android-native/app/src/main/java/com/scenicroutes/app/data/service/OfflineMapsService.kt` - uploadCustomRegion() method
3. Modified: `android-native/app/src/main/java/com/scenicroutes/app/data/api/ApiService.kt` - saveCustomOfflineRegion() signature


