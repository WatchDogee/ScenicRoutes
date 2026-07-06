# JSON Truncation Fix - Excluding Coordinates from List Endpoints

## Problem
The Android app was experiencing JSON parsing errors when loading saved roads:
```
Unexpected end of JSON input: End of input at line 1 column 44247 path $[3]
java.io.EOFException: End of input at line 1 column 44247
```

**Root Cause:** The backend was including `road_coordinates` (30KB+ per road) in list responses. When multiple roads were returned, the response exceeded 44KB and was truncated mid-JSON, causing parsing failures.

## Solution
Excluded `road_coordinates` from all list endpoints by default. Coordinates are only included when fetching individual road details (where they're needed for map display).

## Changes Made

### 1. `SavedRoadController::index()` - User's Saved Roads List
- **Endpoint**: `GET /api/saved-roads`
- **Change**: Excludes `road_coordinates` from select fields
- **Optional**: Supports `?include_coordinates=true` query parameter for backward compatibility

### 2. `SavedRoadController::routes()` - User's Saved Routes List
- **Endpoint**: `GET /api/saved-roads/routes`
- **Change**: Excludes `road_coordinates` from select fields
- **Optional**: Supports `?include_coordinates=true` query parameter

### 3. `SavedRoadController::publicIndex()` - Public Roads List
- **Endpoint**: `GET /api/public-roads` (list endpoint)
- **Change**: Excludes `road_coordinates` from select fields
- **Optional**: Supports `?include_coordinates=true` query parameter

### 4. `SavedRoadController::publicRoads()` - Public Roads Search
- **Endpoint**: `GET /api/public-roads` (search with filters)
- **Change**: Added explicit select to exclude `road_coordinates`
- **Optional**: Supports `?include_coordinates=true` query parameter
- **Note**: This endpoint is used by Android app for road search functionality

## Endpoints That Still Include Coordinates

These endpoints correctly include coordinates because they return individual road details:

- `GET /api/saved-roads/{id}` - Individual saved road details
- `GET /api/public-roads/{id}` - Individual public road details

## Android App Compatibility

The Android app already handles missing coordinates gracefully:

1. **`SavedRoad` model**: `geometry` field is nullable (`List<List<Double>>?`)
2. **`parseRoadCoordinates()`**: Returns `null` if field is missing
3. **All coordinate usage**: Checks for null before using:
   ```kotlin
   if (road.geometry != null && road.geometry.isNotEmpty()) {
       // Use coordinates
   }
   ```

## Response Size Reduction

**Before:**
- Single road with coordinates: ~30-40KB
- 3 roads with coordinates: ~90-120KB (truncated at 44KB)

**After:**
- Single road without coordinates: ~1-2KB
- 3 roads without coordinates: ~3-6KB (well under limit)

**Reduction: ~95% smaller responses**

## Testing

1. **Test saved roads list**:
   ```bash
   curl -H "Authorization: Bearer {token}" http://localhost:8000/api/saved-roads
   ```
   - Should return roads without `road_coordinates` field
   - Response should be much smaller

2. **Test with coordinates** (backward compatibility):
   ```bash
   curl -H "Authorization: Bearer {token}" "http://localhost:8000/api/saved-roads?include_coordinates=true"
   ```
   - Should return roads with `road_coordinates` field

3. **Test individual road** (should still include coordinates):
   ```bash
   curl -H "Authorization: Bearer {token}" http://localhost:8000/api/saved-roads/1
   ```
   - Should include `road_coordinates` field

## Benefits

1. **Prevents JSON truncation errors** - Responses stay well under size limits
2. **Faster loading** - Smaller payloads = faster network transfer
3. **Reduced bandwidth** - Especially important for mobile users
4. **Better UX** - No more empty lists due to parsing errors
5. **Backward compatible** - Optional parameter to include coordinates if needed

## Related Files

- `app/Http/Controllers/SavedRoadController.php` - Backend controller changes
- `android-native/app/src/main/java/com/scenicroutes/app/data/model/SavedRoad.kt` - Already handles null coordinates
- `android-native/app/src/main/java/com/scenicroutes/app/data/repository/SavedRoadRepository.kt` - Already handles parsing errors gracefully

