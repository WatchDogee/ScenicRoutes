package com.scenicroutes.app.ui.components

import android.content.Context
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.view.ViewGroup
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Polygon
import org.osmdroid.events.MapEventsReceiver
import kotlin.math.abs
import java.io.File

/**
 * OSMDroid MapView wrapper for Jetpack Compose
 * Provides a composable map view that can display routes, markers, and POIs
 */
@Composable
fun OSMMapView(
    modifier: Modifier = Modifier,
    center: GeoPoint? = null,
    zoomLevel: Double = 10.0,
    overscanMultiplier: Float = 1.0f,
    applyTilt: Boolean = false,
    onMapReady: (MapView) -> Unit = {},
    onMapClick: ((GeoPoint) -> Unit)? = null,
    onMapLongPress: ((GeoPoint) -> Unit)? = null,
    onMapMoved: (() -> Unit)? = null, // Callback when user drags the map
) {
    val context = LocalContext.current
    var mapView: MapView? by remember { mutableStateOf(null) }
    var lastCenter: GeoPoint? by remember { mutableStateOf(null) }
    var lastZoom: Double? by remember { mutableStateOf(null) }
    var mapEventsOverlay: MapEventsOverlay? by remember { mutableStateOf(null) }
    var isOnline by remember { mutableStateOf(true) }

    // Monitor network connectivity changes
    DisposableEffect(context) {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        // Check initial connectivity
        val checkConnectivity = {
            val network = connectivityManager.activeNetwork
            val capabilities = network?.let { connectivityManager.getNetworkCapabilities(it) }
            capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        }
        
        isOnline = checkConnectivity()
        
        // Broadcast receiver for connectivity changes
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val newOnlineStatus = checkConnectivity()
                if (newOnlineStatus != isOnline) {
                    isOnline = newOnlineStatus
                    // Update map's data connection setting
                    mapView?.setUseDataConnection(isOnline)
                    
                    if (!isOnline) {
                        // Going offline - invalidate tile cache to force loading from disk
                        mapView?.tileProvider?.clearTileCache()
                        mapView?.invalidate()
                        android.util.Log.d("OSMMapView", "Connectivity changed: OFFLINE - cleared tile cache")
                    } else {
                        android.util.Log.d("OSMMapView", "Connectivity changed: ONLINE")
                    }
                }
            }
        }
        
        // Register receiver for connectivity changes
        val filter = IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION)
        context.registerReceiver(receiver, filter)
        
        onDispose {
            context.unregisterReceiver(receiver)
        }
    }

    // Update map event handlers when callbacks change
    LaunchedEffect(onMapClick, onMapLongPress) {
        mapView?.let { map ->
            // Remove old overlay if exists
            mapEventsOverlay?.let { map.overlays.remove(it) }
            
            // Add new overlay with updated callbacks if needed
            if (onMapClick != null || onMapLongPress != null) {
                val newOverlay = MapEventsOverlay(object : MapEventsReceiver {
                    override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                        p?.let { onMapClick?.invoke(it) }
                        return onMapClick != null
                    }

                    override fun longPressHelper(p: GeoPoint?): Boolean {
                        p?.let { onMapLongPress?.invoke(it) }
                        return onMapLongPress != null
                    }
                })
                // Insert at the beginning so it processes events first
                map.overlays.add(0, newOverlay)
                mapEventsOverlay = newOverlay
            }
        }
    }

    AndroidView(
        factory = { ctx ->
            // Initialize OSMDroid if not already done
            Configuration.getInstance().load(ctx, ctx.getSharedPreferences("osmdroid", android.content.Context.MODE_PRIVATE))
            Configuration.getInstance().userAgentValue = "ScenicRoutes/1.0"
            
            // Enable offline tile caching in custom offline directory
            // This allows OSMDroid to use cached tiles when offline
            val offlineBasePath = File(ctx.filesDir, "offline")
            val offlineTileCache = File(ctx.filesDir, "offline/tiles")
            Configuration.getInstance().osmdroidBasePath = offlineBasePath
            Configuration.getInstance().osmdroidTileCache = offlineTileCache
            
            android.util.Log.d("OSMMapView", "Offline tile cache configured at: ${offlineTileCache.absolutePath}")
            android.util.Log.d("OSMMapView", "Tile cache exists: ${offlineTileCache.exists()}")
            
            // Check if device is online or offline
            val connectivityManager = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = connectivityManager.activeNetwork
            val capabilities = network?.let { connectivityManager.getNetworkCapabilities(it) }
            val isOnline = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
            
            android.util.Log.d("OSMMapView", "Initial connectivity check: ${if (isOnline) "ONLINE" else "OFFLINE"}")

            MapView(ctx).apply {
                // Revert to MAPNIK tiles for compatibility with offline downloads
                setTileSource(TileSourceFactory.MAPNIK)
                
                // Debug: log the tile source
                val tileSourceName = TileSourceFactory.MAPNIK.name()
                android.util.Log.d("OSMMapView", "Using tile source: '$tileSourceName'")
                
                // If offline, force tile provider to use cache only
                // If online, allow downloading new tiles
                setUseDataConnection(isOnline)
                android.util.Log.d("OSMMapView", "Map data connection set to: $isOnline")
                setMultiTouchControls(true)
                minZoomLevel = 3.0
                maxZoomLevel = 20.0

                // Apply massive overscan by making the MapView 4x larger than its container
                // This ensures tiles are available beyond the visible area for tilt effects
                // The 22° tilt requires significant extra coverage on all sides
                layoutParams = ViewGroup.LayoutParams(
                    (ctx.resources.displayMetrics.widthPixels * overscanMultiplier).toInt(),
                    (ctx.resources.displayMetrics.heightPixels * overscanMultiplier).toInt()
                )

                // Set initial center and zoom
                center?.let {
                    controller.setCenter(it)
                    controller.setZoom(zoomLevel)
                    lastCenter = it
                    lastZoom = zoomLevel
                } ?: run {
                    // Default to Europe center
                    controller.setCenter(GeoPoint(50.0, 8.0))
                    controller.setZoom(6.0)
                    lastCenter = GeoPoint(50.0, 8.0)
                    lastZoom = 6.0
                }

                // Detect map movement (user dragging/scrolling)
                if (onMapMoved != null) {
                    setMapListener(object : org.osmdroid.events.MapListener {
                        override fun onScroll(event: org.osmdroid.events.ScrollEvent?): Boolean {
                            onMapMoved.invoke()
                            return false
                        }
                        
                        override fun onZoom(event: org.osmdroid.events.ZoomEvent?): Boolean {
                            onMapMoved.invoke()
                            return false
                        }
                    })
                }

                mapView = this
                onMapReady(this)
            }
        },
        modifier = modifier
            .fillMaxSize()
            .graphicsLayer {
                // Disable clipping to show overscan tiles beyond container bounds
                clip = false
            }
            .then(
                if (applyTilt) {
                    Modifier.graphicsLayer {
                        // Apply 3D tilt transformation for navigation - increased to 18° for better forward view
                        rotationX = 18f
                        cameraDistance = 12f
                        transformOrigin = TransformOrigin(0.5f, 0.8f)
                        // Scale up to expose overscan buffer in all directions
                        scaleX = 3.25f
                        scaleY = 3.25f
                        // Disable clipping for tilt layer as well
                        clip = false
                    }
                } else {
                    Modifier
                }
            ),
        update = { view ->
            // Only re-center/zoom when inputs actually change so navigation follow is not overridden by recompositions
            center?.let { target ->
                val centerChanged = lastCenter?.let { prev ->
                    abs(prev.latitude - target.latitude) > 1e-6 || abs(prev.longitude - target.longitude) > 1e-6
                } ?: true

                if (centerChanged) {
                    view.controller.animateTo(target)
                    lastCenter = target
                }
            }

            val zoomChanged = lastZoom?.let { prev -> abs(prev - zoomLevel) > 1e-3 } ?: true
            if (zoomChanged) {
                view.controller.setZoom(zoomLevel)
                lastZoom = zoomLevel
            }
        },
    )

    // Cleanup on dispose
    DisposableEffect(Unit) {
        onDispose {
            mapView?.onDetach()
        }
    }
}

/**
 * Densify a route by adding interpolated points between existing points
 * This makes the polyline smoother and more detailed visually
 * @param coordinates Original route coordinates
 * @param maxSegmentDistance Maximum distance between points in meters (default 50m)
 * @return Densified coordinates with interpolated points
 */
private fun densifyRoute(coordinates: List<List<Double>>, maxSegmentDistance: Double = 50.0): List<List<Double>> {
    if (coordinates.size < 2) return coordinates
    
    val densified = mutableListOf<List<Double>>()
    
    for (i in 0 until coordinates.size - 1) {
        val current = coordinates[i]
        val next = coordinates[i + 1]
        
        if (current.size < 2 || next.size < 2) continue
        
        val currentPoint = GeoPoint(current[0], current[1])
        val nextPoint = GeoPoint(next[0], next[1])
        
        // Add current point
        densified.add(current)
        
        // Calculate distance between points
        val distance = currentPoint.distanceToAsDouble(nextPoint)
        
        // If distance is greater than max segment distance, add interpolated points
        if (distance > maxSegmentDistance) {
            val numSegments = (distance / maxSegmentDistance).toInt()
            
            for (j in 1 until numSegments) {
                val fraction = j.toDouble() / numSegments
                val interpolatedLat = current[0] + (next[0] - current[0]) * fraction
                val interpolatedLon = current[1] + (next[1] - current[1]) * fraction
                densified.add(listOf(interpolatedLat, interpolatedLon))
            }
        }
    }
    
    // Add the last point
    densified.add(coordinates.last())
    
    return densified
}

/**
 * Add a route polyline to the map
 */
fun MapView.addRoute(
    coordinates: List<List<Double>>,
    color: Int = android.graphics.Color.BLUE,
    width: Float = 8f,
    onClick: (() -> Unit)? = null,
    densify: Boolean = true, // Enable densification by default for smoother routes
) {
    if (coordinates.isEmpty()) return

    // Densify the route for smoother visual appearance (only affects display, not calculations)
    val processedCoordinates = if (densify && coordinates.size > 1) {
        densifyRoute(coordinates, maxSegmentDistance = 50.0) // Add points every 50m
    } else {
        coordinates
    }

    // Filter out invalid coordinates more strictly to prevent vertical lines and straight lines
    val geoPoints = mutableListOf<GeoPoint>()
    var lastValidPoint: GeoPoint? = null
    
    processedCoordinates.forEach { coord ->
        if (coord.size >= 2) {
            val lat = coord[0]
            val lon = coord[1]
            // Validate that coordinates are finite numbers and within valid ranges
            if (lat.isFinite() && lon.isFinite() && 
                lat >= -90.0 && lat <= 90.0 && 
                lon >= -180.0 && lon <= 180.0) {
                
                val currentPoint = GeoPoint(lat, lon)
                
                // Check if this point is too far from the last valid point (likely invalid data)
                // RELAXED: Allow up to 2000km jumps for long routes (was 1000km)
                lastValidPoint?.let { last ->
                    val distance = last.distanceToAsDouble(currentPoint)
                    if (distance > 2000000.0) { // 2000km in meters
                        android.util.Log.w("OSMMapView", "Coordinate too far from previous: distance=${distance/1000}km, skipping [$lat, $lon]")
                        return@forEach
                    }
                }
                
                geoPoints.add(currentPoint)
                lastValidPoint = currentPoint
            } else {
                android.util.Log.w("OSMMapView", "Invalid coordinate: [$lat, $lon] (skipping)")
            }
        } else {
            android.util.Log.w("OSMMapView", "Coordinate has insufficient elements: $coord (skipping)")
        }
    }
    
    if (geoPoints.isEmpty()) {
        android.util.Log.w("OSMMapView", "No valid coordinates after filtering, skipping route")
        return
    }
    
    // Additional check: if we have very few points relative to the distance, it might be a straight line
    if (geoPoints.size >= 2) {
        val first = geoPoints.first()
        val last = geoPoints.last()
        val totalDistance = first.distanceToAsDouble(last)
        // If we have only 2 points and they're very far apart, it's likely a straight line (invalid)
        if (geoPoints.size == 2 && totalDistance > 500000.0) { // 500km
            android.util.Log.w("OSMMapView", "Route appears to be a straight line (2 points, ${totalDistance/1000}km apart), skipping")
            return
        }
    }
    
    val polyline = Polyline().apply {
        setPoints(geoPoints)
        setColor(color)
        setWidth(width)
        // Make polyline clickable
        isClickable = onClick != null
        onClick?.let { clickHandler ->
            setOnClickListener { _, _, _ ->
                clickHandler()
                true
            }
        }
    }
    overlays.add(polyline)
    invalidate()
}

/**
 * Add a marker to the map
 */
fun MapView.addMarker(
    point: GeoPoint,
    title: String? = null,
    snippet: String? = null,
    icon: android.graphics.drawable.Drawable? = null,
): Marker {
    val marker = Marker(this).apply {
        position = point
        title?.let { setTitle(it) }
        snippet?.let { setSnippet(it) }
        icon?.let { setIcon(it) }
        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
    }
    overlays.add(marker)
    invalidate()
    return marker
}

/**
 * Clear all overlays from the map
 */
fun MapView.clearOverlays() {
    overlays.clear()
    invalidate()
}

/**
 * Clear only route polylines (keep markers and search roads)
 */
fun MapView.clearRoutes() {
    // Only clear blue route polylines, not green search roads
    overlays.removeAll { overlay ->
        overlay is Polyline && overlay.color == android.graphics.Color.BLUE
    }
    // Also clear alternative route colors (gray, orange, purple)
    overlays.removeAll { overlay ->
        overlay is Polyline && (
            overlay.color == android.graphics.Color.GRAY ||
            overlay.color == android.graphics.Color.parseColor("#FF9800") ||
            overlay.color == android.graphics.Color.parseColor("#9C27B0")
        )
    }
    invalidate()
}

/**
 * Clear only markers (keep routes)
 */
fun MapView.clearMarkers() {
    overlays.removeAll { it is Marker }
    invalidate()
}

/**
 * Fit map bounds to show all coordinates
 */
fun MapView.fitBounds(coordinates: List<List<Double>>, padding: Int = 50) {
    if (coordinates.isEmpty()) return
    
    val geoPoints = coordinates.mapNotNull { coord ->
        if (coord.size >= 2) {
            GeoPoint(coord[0], coord[1])
        } else null
    }
    
    if (geoPoints.isEmpty()) return
    
    val boundingBox = BoundingBox(
        geoPoints.maxOfOrNull { it.latitude } ?: 0.0,
        geoPoints.maxOfOrNull { it.longitude } ?: 0.0,
        geoPoints.minOfOrNull { it.latitude } ?: 0.0,
        geoPoints.minOfOrNull { it.longitude } ?: 0.0,
    )
    
    zoomToBoundingBox(boundingBox, true, padding)
}

/**
 * Add a circle overlay to show search radius
 */
fun MapView.addRadiusCircle(
    center: GeoPoint,
    radiusKm: Double,
    color: Int = android.graphics.Color.argb(30, 100, 150, 255),  // More transparent light blue
    strokeColor: Int = android.graphics.Color.BLUE,
    strokeWidth: Float = 3f,
) {
    // Create circle using polygon approximation
    val points = mutableListOf<GeoPoint>()
    val numPoints = 64 // Number of points to approximate circle
    
    for (i in 0 until numPoints) {
        val angle = (i * 360.0 / numPoints) * Math.PI / 180.0
        val latOffset = radiusKm / 111.0 * Math.cos(angle) // 1 degree lat ≈ 111 km
        val lonOffset = radiusKm / (111.0 * Math.cos(center.latitude * Math.PI / 180.0)) * Math.sin(angle)
        
        points.add(GeoPoint(center.latitude + latOffset, center.longitude + lonOffset))
    }
    
    val polygon = Polygon().apply {
        setPoints(points)
        setFillColor(color)
        setStrokeColor(strokeColor)
        setStrokeWidth(strokeWidth)
    }
    
    overlays.add(polygon)
    invalidate()
}

