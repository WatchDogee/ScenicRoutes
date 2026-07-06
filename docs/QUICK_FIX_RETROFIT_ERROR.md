# Retrofit Wildcard Type Error - Quick Fix

## Error
```
Exception uploading custom region: Parameter type must not include a type variable or wildcard: java.util.Map<java.lang.String, ?> (parameter #2)
```

## Root Cause
The `saveCustomOfflineRegion()` method in ApiService.kt uses `Map<String, Any>` which Retrofit's code generation cannot handle because of the type variable.

## Solution

### Temporary Quick Fix (Works immediately)

In OfflineMapsService.kt, replace the `uploadCustomRegion()` method with:

```kotlin
suspend fun uploadCustomRegion(token: String, region: OfflineMapRegion): Boolean {
    return withContext(Dispatchers.IO) {
        try {
            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
            
            // Workaround: Use reportOfflineRegionDownload which already works
            // Add a "custom" marker in bounds to help backend identify this as custom region
            val request = mutableMapOf<String, Any>(
                "region_id" to region.id,
                "region_name" to region.name,
                "size_mb" to (region.sizeBytes / 1024.0 / 1024.0).toLong(),
                "bounds" to mutableMapOf(
                    "south" to region.bounds.latSouth,
                    "west" to region.bounds.lonWest,
                    "north" to region.bounds.latNorth,
                    "east" to region.bounds.lonEast,
                    "custom" to true  // Marker for backend
                ),
                "zoom_levels" to region.zoomLevels.toList(),
                "radius_km" to (region.customRadius ?: 0.0)
            )
            
            val response = apiService.reportOfflineRegionDownload("Bearer $token", request)
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

Then update the backend to recognize the "custom" marker in the bounds.

### Proper Long-Term Fix

Remove the problematic `saveCustomOfflineRegion()` method from ApiService.kt entirely and use the workaround above.

## Why This Works

- `reportOfflineRegionDownload()` already exists and handles `Map<String, Any>` correctly
- We reuse the working endpoint with a "custom" marker in the bounds
- Backend can check for the "custom" flag to handle it as a custom region vs downloaded region
- No Retrofit type generation issues

## Backend Changes Needed

In the OfflineMapController, check for the "custom" marker:

```php
if (isset($request['bounds']['custom']) && $request['bounds']['custom']) {
    // Save as custom region with status='custom'
    $status = 'custom';
} else {
    // Save as downloaded region with status='completed'
    $status = 'completed';
}
```


