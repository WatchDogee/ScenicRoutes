# Map Library Setup for ScenicRoutes

## Current Implementation: OSMDroid (OpenStreetMap)

Your web app uses **Leaflet with OpenStreetMap**, so we're using **OSMDroid** for Android to match exactly.

### Why OSMDroid?

✅ **Free** - No API key needed  
✅ **Same tiles** - Uses OpenStreetMap (same as your web app)  
✅ **Works with routes** - Easy to draw polylines, markers, and overlays  
✅ **Offline support** - Can cache map tiles  
✅ **Familiar** - Same map data your users see on the web  

### Setup

**Already configured!** No setup needed - OSMDroid works out of the box.

The app is configured to:
- Use OpenStreetMap tiles (MAPNIK tile source)
- Support zoom levels 3-19
- Show user location (with permission)
- Work offline (tiles are cached)

## Alternative: Mapbox (Optional)

If you want to switch to Mapbox later for better performance/styling:

### 1. Update `build.gradle.kts`:
```kotlin
// Replace OSMDroid with:
implementation("com.mapbox.maps:android:11.2.0")
```

### 2. Get Mapbox Access Token:
1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up (free tier: 50,000 map loads/month)
3. Copy your **Default public token**

### 3. Update `AndroidManifest.xml`:
```xml
<meta-data
    android:name="com.mapbox.token"
    android:value="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImN..." />
```

### 4. Update `MapScreen.kt` to use Mapbox composables

**Pros of Mapbox:**
- ✅ Better performance
- ✅ More polished UI
- ✅ Custom map styles
- ✅ Better offline maps

**Cons:**
- ⚠️ Requires API key
- ⚠️ Different from web app (different tiles)

## Recommendation

**Stick with OSMDroid** - It matches your web app perfectly, is free, and works great for routes and roads. You can always switch to Mapbox later if needed.


