package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.data.service.GeocodeResult
import com.scenicroutes.app.ui.components.OSMMapView
import com.scenicroutes.app.ui.components.* // Import all extension functions
import com.scenicroutes.app.ui.viewmodel.MapViewModel
import com.scenicroutes.app.utils.toRoute
import com.scenicroutes.app.ui.viewmodel.RouteState
import com.scenicroutes.app.ui.viewmodel.TripsViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

/**
 * Main Map Screen with full OSMDroid integration
 * Displays map, routes, markers, POIs, and all map features
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    navController: NavController,
    initialShowCommunityRoads: Boolean = false,
    initialRoadId: Long? = null,
    startNavigation: Boolean = false,
    enableRoadSearch: Boolean = false,
) {
    val context = LocalContext.current
    // Use activity-scoped ViewModel to share state with NavigationScreen
    val activity = context as? androidx.activity.ComponentActivity
    val viewModel: MapViewModel = if (activity != null) {
        viewModel(viewModelStoreOwner = activity)
    } else {
        viewModel() // Fallback to default scoping
    }
    
    // Load TripsViewModel for saved roads
    val tripsViewModel: TripsViewModel = viewModel()
    val savedRoads by tripsViewModel.savedRoads.collectAsState()
    
    val coroutineScope = rememberCoroutineScope()
    val currentUserIdState = remember { mutableStateOf<Long?>(null) }

    LaunchedEffect(Unit) {
        currentUserIdState.value = com.scenicroutes.app.data.local.TokenManager(context).userId.first()
    }

    // Initialize services
    LaunchedEffect(Unit) {
        viewModel.setSearchHistoryManager(com.scenicroutes.app.data.local.SearchHistoryManager(context))
        viewModel.setRouteHistoryManager(com.scenicroutes.app.data.local.RouteHistoryManager(context))
        viewModel.setTelemetryService(context)
        viewModel.setNotificationContext(context)
    }

    // State
    val routeState by viewModel.routeState.collectAsState()
    val selectedRoute by viewModel.selectedRoute.collectAsState()
    val alternativeRoutes by viewModel.alternativeRoutes.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    val pois by viewModel.pois.collectAsState()
    val searchRoads by viewModel.searchRoads.collectAsState()
    val saveRouteState by viewModel.saveRouteState.collectAsState()

    // Show error toast when save fails
    LaunchedEffect(saveRouteState) {
        if (saveRouteState is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Error) {
            val errorMessage = (saveRouteState as com.scenicroutes.app.ui.viewmodel.SaveRouteState.Error).message
            android.widget.Toast.makeText(
                context,
                "Failed to save route: $errorMessage",
                android.widget.Toast.LENGTH_LONG,
            ).show()
        } else if (saveRouteState is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Success) {
            android.widget.Toast.makeText(
                context,
                "Route saved successfully!",
                android.widget.Toast.LENGTH_SHORT,
            ).show()
        }
    }
    val isSearchingRoads by viewModel.isSearchingRoads.collectAsState()
    val communityRoads by viewModel.communityRoads.collectAsState()
    val isSearchingCommunityRoads by viewModel.isSearchingCommunityRoads.collectAsState()
    val weather by viewModel.weather.collectAsState()
    val routeWeather by viewModel.routeWeather.collectAsState()
    val isLoadingWeather by viewModel.isLoadingRouteWeather.collectAsState()

    // UI State
    var showActionMenu by remember { mutableStateOf(false) }
    var showRoutePlanning by remember { mutableStateOf(false) }
    var showRouteInfo by remember { mutableStateOf(false) }
    var showMapLayers by remember { mutableStateOf(false) }
    var showFilters by remember { mutableStateOf(false) }
    var showSaveRouteDialog by remember { mutableStateOf(false) }
    var showGPXImportDialog by remember { mutableStateOf(false) }
    var showGPXExportDialog by remember { mutableStateOf(false) }
    var mapCenter by remember { mutableStateOf<GeoPoint?>(null) }
    var currentMapLayer by remember { mutableStateOf("standard") }
    var markerDropMode by remember { mutableStateOf(enableRoadSearch) } // Enable if navigating from road search
    var markerDropModeType by remember { mutableStateOf<String?>(if (enableRoadSearch) "curved" else null) } // "community" or "curved"
    var searchCenterMarker by remember { mutableStateOf<GeoPoint?>(null) }
    var searchRadius by remember { mutableStateOf<Double?>(null) }
    var selectedRoadForDetails by remember { mutableStateOf<com.scenicroutes.app.data.model.RoadNetworkSearch?>(null) }
    var showRoadDetails by remember { mutableStateOf(false) }
    var selectedCommunityRoad by remember { mutableStateOf<com.scenicroutes.app.data.model.SavedRoad?>(null) }
    var showCommunityRoadDetails by remember { mutableStateOf(false) }
    var isLoadingCommunityRoadDetails by remember { mutableStateOf(false) }
    var showCommunityRoads by remember { mutableStateOf(initialShowCommunityRoads) }
    
    // Map view reference for updates - declared early so it can be used in LaunchedEffects
    var mapViewRef by remember { mutableStateOf<MapView?>(null) }
    
    
    
    // Load settings
    com.scenicroutes.app.utils.SettingsManager.ensureSettingsLoaded()
    val defaultMapView = com.scenicroutes.app.utils.SettingsManager.getDefaultMapView()
    val defaultSearchRadius = com.scenicroutes.app.utils.SettingsManager.getDefaultSearchRadius()
    val measurementUnits = com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()
    val showCommunityByDefault = com.scenicroutes.app.utils.SettingsManager.getShowCommunityByDefault()

    // Show toast feedback for route saving
    LaunchedEffect(saveRouteState) {
        when (saveRouteState) {
            is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Success -> {
                android.widget.Toast.makeText(
                    context,
                    "Route saved successfully to My Roads!",
                    android.widget.Toast.LENGTH_LONG,
                ).show()
            }
            is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Error -> {
                val errorMessage = (saveRouteState as com.scenicroutes.app.ui.viewmodel.SaveRouteState.Error).message
                android.widget.Toast.makeText(
                    context,
                    "Failed to save route: $errorMessage",
                    android.widget.Toast.LENGTH_LONG,
                ).show()
            }
            is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Saving -> {
                android.widget.Toast.makeText(
                    context,
                    "Saving route...",
                    android.widget.Toast.LENGTH_SHORT,
                ).show()
            }
            else -> {} // Idle state - do nothing
        }
    }
    
    // Initialize and update currentMapLayer from settings - observe changes
    LaunchedEffect(defaultMapView) {
        if (currentMapLayer != defaultMapView) {
            currentMapLayer = defaultMapView
            // Update map tile source when setting changes
            mapViewRef?.setTileSource(
                when (defaultMapView) {
                    "terrain" -> TileSourceFactory.USGS_TOPO
                    "satellite" -> TileSourceFactory.USGS_SAT
                    else -> TileSourceFactory.MAPNIK
                },
            )
        }
    }
    
    // Reset showCommunityRoads state when initialShowCommunityRoads changes
    // This ensures the bottom sheet doesn't persist when navigating back to map without the parameter
    LaunchedEffect(initialShowCommunityRoads) {
        showCommunityRoads = initialShowCommunityRoads
    }
    
    // Enable road search mode when navigating from "My Roads" screen
    LaunchedEffect(enableRoadSearch) {
        if (enableRoadSearch) {
            markerDropMode = true
            markerDropModeType = "curved"
            showFilters = true
            // Show toast to guide user
            android.widget.Toast.makeText(
                context,
                "Tap on the map to place a marker and search for curved roads",
                android.widget.Toast.LENGTH_LONG,
            ).show()
        }
    }
    
    // Load road when initialRoadId is provided, or clear it when null
    LaunchedEffect(initialRoadId) {
        // Clear previous road state first when a new roadId is provided
        if (initialRoadId != null) {
            android.util.Log.d("MapScreen", "=== Loading road with ID: $initialRoadId ===")
            // Clear previous road state and overlays
            val previousRoad = selectedCommunityRoad
            if (previousRoad != null && previousRoad.id != initialRoadId) {
                android.util.Log.d("MapScreen", "Clearing previous road ${previousRoad.id} before loading new road $initialRoadId")
                selectedCommunityRoad = null
                showCommunityRoadDetails = false
                // Clear map overlays for previous road
                mapViewRef?.let { view ->
                    val removedCount = view.overlays.removeAll { overlay ->
                        overlay is Polyline && (overlay.color == android.graphics.Color.parseColor("#4CAF50") ||
                            overlay.color == android.graphics.Color.parseColor("#5E8B65"))
                    }
                    android.util.Log.d("MapScreen", "Removed $removedCount previous road overlays")
                    view.invalidate()
                }
            }
            isLoadingCommunityRoadDetails = true
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                val token = tokenManager.token.first()
                
                // Try authenticated endpoint first
                val response = if (token != null) {
                    android.util.Log.d("MapScreen", "Attempting to load road ${initialRoadId} from saved roads endpoint")
                    apiService.getSavedRoad("Bearer $token", initialRoadId)
                } else {
                    android.util.Log.d("MapScreen", "No token available, will try public roads endpoint")
                    null
                }
                
                if (response != null && response.isSuccessful && response.body() != null) {
                    val road = response.body()!!
                    android.util.Log.d("MapScreen", "Road loaded: ${road.road_name}, geometry: ${road.geometry != null}, geometry size: ${road.geometry?.size ?: 0}")
                    if (road.geometry == null || road.geometry.isEmpty()) {
                        android.util.Log.w("MapScreen", "WARNING: Road ${road.road_name} (ID: ${road.id}) has no geometry! This will prevent drawing on map.")
                    }
                    
                    // If startNavigation is true, convert to Route and navigate to NavigationScreen
                    if (startNavigation && road.geometry != null && road.geometry.isNotEmpty()) {
                        // Simply use the road geometry directly without complex route calculation
                        // This avoids race conditions and invalid route errors
                        val route = road.toRoute(null)
                        if (route != null && route.geometry.isNotEmpty() && route.distance > 0) {
                            android.util.Log.d("MapScreen", "Using road geometry for navigation: distance=${route.distance}m, points=${route.geometry.size}")
                            viewModel.setSelectedRoute(route)
                            
                            // Give a brief moment for state to propagate before navigating
                            kotlinx.coroutines.delay(300)
                            android.util.Log.d("MapScreen", "Navigating to NavigationScreen...")
                            try {
                                navController.navigate("navigation") {
                                    launchSingleTop = true
                                }
                                android.util.Log.d("MapScreen", "Navigation command sent successfully")
                            } catch (e: Exception) {
                                android.util.Log.e("MapScreen", "Error navigating to NavigationScreen: ${e.message}", e)
                            }
                        } else {
                            android.util.Log.e("MapScreen", "Road geometry is invalid for navigation: geometry=${route?.geometry?.size}, distance=${route?.distance}")
                        }
                        return@LaunchedEffect
                    }
                    
                    // Set road first, then show details (allows LaunchedEffect to trigger drawing)
                    selectedCommunityRoad = road
                    // Show details sheet when viewing road from "View on Map" button
                    // Don't show details sheet immediately - let the drawing LaunchedEffect trigger first
                    kotlinx.coroutines.delay(500) // Give time for drawing LaunchedEffect to trigger
                    showCommunityRoadDetails = !startNavigation // Don't show details if starting navigation
                    android.util.Log.d("MapScreen", "Successfully loaded road ${initialRoadId} from saved roads: ${road.road_name}, geometry points: ${road.geometry?.size ?: 0}")
                } else {
                    // Fall back to public road endpoint
                    android.util.Log.d("MapScreen", "Saved roads endpoint failed or no token, trying public roads endpoint")
                    val publicResponse = apiService.getPublicRoad(initialRoadId)
                    if (publicResponse.isSuccessful && publicResponse.body() != null) {
                        val road = publicResponse.body()!!
                        android.util.Log.d("MapScreen", "Road loaded from public: ${road.road_name}, geometry: ${road.geometry != null}, geometry size: ${road.geometry?.size ?: 0}")
                        if (road.geometry == null || road.geometry.isEmpty()) {
                            android.util.Log.w("MapScreen", "WARNING: Road ${road.road_name} (ID: ${road.id}) has no geometry! This will prevent drawing on map.")
                        }
                        
                        // If startNavigation is true, convert to Route and navigate to NavigationScreen
                        if (startNavigation && road.geometry != null && road.geometry.isNotEmpty()) {
                            // Simply use the road geometry directly without complex route calculation
                            // This avoids race conditions and invalid route errors
                            val route = road.toRoute(null)
                            if (route != null && route.geometry.isNotEmpty() && route.distance > 0) {
                                android.util.Log.d("MapScreen", "Using public road geometry for navigation: distance=${route.distance}m, points=${route.geometry.size}")
                                viewModel.setSelectedRoute(route)
                                
                                // Give a brief moment for state to propagate before navigating
                                kotlinx.coroutines.delay(300)
                                android.util.Log.d("MapScreen", "Navigating to NavigationScreen...")
                                try {
                                    navController.navigate("navigation") {
                                        launchSingleTop = true
                                    }
                                    android.util.Log.d("MapScreen", "Navigation command sent successfully")
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error navigating to NavigationScreen: ${e.message}", e)
                                }
                            } else {
                                android.util.Log.e("MapScreen", "Public road geometry is invalid for navigation: geometry=${route?.geometry?.size}, distance=${route?.distance}")
                            }
                            return@LaunchedEffect
                        }
                        
                        selectedCommunityRoad = road
                        // Show details sheet when viewing road from "View on Map" button
                        // Don't show details sheet immediately - let the drawing LaunchedEffect trigger first
                        kotlinx.coroutines.delay(500) // Give time for drawing LaunchedEffect to trigger
                        showCommunityRoadDetails = !startNavigation // Don't show details if starting navigation
                        android.util.Log.d("MapScreen", "Successfully loaded road ${initialRoadId} from public roads: ${road.road_name}, geometry points: ${road.geometry?.size ?: 0}")
                    } else {
                        android.util.Log.e("MapScreen", "Failed to load road ${initialRoadId}: ${publicResponse.code()}")
                        android.widget.Toast.makeText(
                            context,
                            "Failed to load road details",
                            android.widget.Toast.LENGTH_SHORT,
                        ).show()
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MapScreen", "Error loading road ${initialRoadId}: ${e.message}", e)
                android.widget.Toast.makeText(
                    context,
                    "Error loading road: ${e.message}",
                    android.widget.Toast.LENGTH_SHORT,
                ).show()
            } finally {
                isLoadingCommunityRoadDetails = false
            }
        } else {
            // Only clear road state when initialRoadId becomes null if we're navigating to a clean map
            // Don't clear if the road was already displayed and user just dismissed the sheet
            // This allows the road to remain visible after dismissing the details sheet
            val currentRoute = navController.currentBackStackEntry?.destination?.route
            val isNavigatingAway = currentRoute != null && !currentRoute.contains("roadId")
            
            if (isNavigatingAway) {
                // User navigated away from map with roadId - clear the road
                android.util.Log.d("MapScreen", "Clearing road state - navigating away from road view")
                val hadRoad = selectedCommunityRoad != null
                selectedCommunityRoad = null
                showCommunityRoadDetails = false
                
                // Clear map overlays when clearing road state
                if (hadRoad) {
                    mapViewRef?.let { view ->
                        val removedCount = view.overlays.removeAll { overlay ->
                            overlay is Polyline && (overlay.color == android.graphics.Color.parseColor("#4CAF50") ||
                                overlay.color == android.graphics.Color.parseColor("#5E8B65"))
                        }
                        android.util.Log.d("MapScreen", "Cleared $removedCount road overlays when navigating away")
                        view.invalidate()
                    }
                }
            } else {
                // initialRoadId is null but we're still on map - don't clear, road should stay visible
                android.util.Log.d("MapScreen", "initialRoadId is null but staying on map - keeping road visible")
            }
        }
    }
    
    // Clear road state when navigating away from map screen
    DisposableEffect(Unit) {
        onDispose {
            android.util.Log.d("MapScreen", "MapScreen disposing - clearing road state")
            selectedCommunityRoad = null
            showCommunityRoadDetails = false
        }
    }
    
    // Remember route planning values for editing
    var lastStartLocation by remember { mutableStateOf<String?>(null) }
    var lastEndLocation by remember { mutableStateOf<String?>(null) }
    var lastWaypoints by remember { mutableStateOf<List<com.scenicroutes.app.data.model.Waypoint>>(emptyList()) }

    // Location permission
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.RequestPermission(),
    ) { isGranted ->
        if (isGranted) {
            // Permission granted - center on user location
            // TODO: Get user location and center map
        }
    }
    var showLocationPermissionDialog by remember { mutableStateOf(false) }
    
    fun hasLocationPermission(): Boolean {
        return androidx.core.content.ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.ACCESS_FINE_LOCATION,
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED ||
            androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.ACCESS_COARSE_LOCATION,
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    // Draw selectedCommunityRoad on map when it's loaded and center/zoom to it
    // Use road.id as key to ensure it redraws even if the same road is selected again
    LaunchedEffect(selectedCommunityRoad?.id, mapViewRef) {
        selectedCommunityRoad?.let { road ->
            android.util.Log.d("MapScreen", "=== LaunchedEffect triggered for selectedCommunityRoad: ${road.road_name} (ID: ${road.id}) ===")
            android.util.Log.d("MapScreen", "Road geometry: ${road.geometry != null}, size: ${road.geometry?.size ?: 0}")
            android.util.Log.d("MapScreen", "MapViewRef: ${mapViewRef != null}")
            
            mapViewRef?.let { view ->
                android.util.Log.d("MapScreen", "=== Drawing selectedCommunityRoad on map: ${road.road_name} ===")
                road.geometry?.let { geometry ->
                    if (geometry.isNotEmpty()) {
                        android.util.Log.d("MapScreen", "Road has ${geometry.size} geometry points, first point: ${geometry.firstOrNull()}")
                        try {
                            // Always clear previous community road overlays before drawing new one
                            val removedCount = view.overlays.removeAll { overlay ->
                                overlay is Polyline && (overlay.color == android.graphics.Color.parseColor("#4CAF50") ||
                                    overlay.color == android.graphics.Color.parseColor("#5E8B65"))
                            }
                            android.util.Log.d("MapScreen", "Removed $removedCount previous community road overlays before drawing road ${road.id}")
                            
                            // Draw the road
                            view.addRoute(
                                coordinates = geometry,
                                color = android.graphics.Color.parseColor("#5E8B65"), // Muted sage green for community roads
                                width = 10f,
                                onClick = {
                                    // Road is already selected, just show details
                                    android.util.Log.d("MapScreen", "Road polyline clicked, showing details")
                                    showCommunityRoadDetails = true
                                },
                            )
                            android.util.Log.d("MapScreen", "Added route to map with ${geometry.size} points")
                            
                            // Center and zoom map to show the road
                            val firstPoint = geometry.firstOrNull()
                            if (firstPoint != null && firstPoint.size >= 2) {
                                val centerPoint = org.osmdroid.util.GeoPoint(firstPoint[0], firstPoint[1])
                                view.controller.animateTo(centerPoint)
                                view.controller.setZoom(12.0)
                                android.util.Log.d("MapScreen", "Centered map on road at ${firstPoint[0]}, ${firstPoint[1]}")
                            } else {
                                android.util.Log.w("MapScreen", "First point invalid: $firstPoint")
                            }
                            
                            view.invalidate()
                        } catch (e: Exception) {
                            android.util.Log.e("MapScreen", "Error drawing road on map: ${e.message}", e)
                        }
                    } else {
                        android.util.Log.w("MapScreen", "Road ${road.road_name} has no geometry to draw")
                    }
                } ?: run {
                    android.util.Log.w("MapScreen", "Road ${road.road_name} has null geometry")
                }
            } ?: run {
                android.util.Log.w("MapScreen", "MapViewRef is null, cannot draw road")
            }
        } ?: run {
            // Road was cleared - remove overlays
            mapViewRef?.let { view ->
                val removedCount = view.overlays.removeAll { overlay ->
                    overlay is Polyline && (overlay.color == android.graphics.Color.parseColor("#4CAF50") ||
                        overlay.color == android.graphics.Color.parseColor("#5E8B65"))
                }
                android.util.Log.d("MapScreen", "Removed $removedCount road overlays because selectedCommunityRoad is null")
                view.invalidate()
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        floatingActionButton = {
            android.util.Log.d("MapScreen", "Rendering FAB button with testTag='map_fab_button'")
            FloatingActionButton(
                onClick = { showActionMenu = true },
                containerColor = MaterialTheme.colorScheme.primary,
                modifier = Modifier.testTag("map_fab_button"),
            ) {
                Icon(Icons.Default.Menu, contentDescription = "Actions")
            }
        },
    ) { padding ->
        android.util.Log.d("MapScreen", "MapScreen Scaffold content rendering")
        Box(modifier = Modifier.fillMaxSize()) {
            // Marker Drop Mode Notification Banner
            if (markerDropMode) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .align(Alignment.TopCenter),
                    colors = CardDefaults.cardColors(
                        containerColor = when (markerDropModeType) {
                            "community" -> MaterialTheme.colorScheme.secondaryContainer
                            "curved" -> MaterialTheme.colorScheme.primaryContainer
                            else -> MaterialTheme.colorScheme.primaryContainer
                        },
                    ),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(
                                Icons.Default.AddLocation,
                                contentDescription = null,
                                tint = when (markerDropModeType) {
                                    "community" -> MaterialTheme.colorScheme.onSecondaryContainer
                                    "curved" -> MaterialTheme.colorScheme.onPrimaryContainer
                                    else -> MaterialTheme.colorScheme.onPrimaryContainer
                                },
                            )
                            Column {
                                Text(
                                    text = when (markerDropModeType) {
                                        "community" -> "Community Roads Mode"
                                        "curved" -> "Curved Roads Mode"
                                        else -> "Drop Marker Mode"
                                    },
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = when (markerDropModeType) {
                                        "community" -> MaterialTheme.colorScheme.onSecondaryContainer
                                        "curved" -> MaterialTheme.colorScheme.onPrimaryContainer
                                        else -> MaterialTheme.colorScheme.onPrimaryContainer
                                    },
                                )
                                Text(
                                    text = when (markerDropModeType) {
                                        "community" -> "Tap on the map to set search center for community roads (public saved roads)"
                                        "curved" -> "Tap on the map to set search center for curved roads"
                                        else -> "Tap anywhere on the map to set the search center"
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = when (markerDropModeType) {
                                        "community" -> MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f)
                                        "curved" -> MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                        else -> MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                    },
                                )
                            }
                        }
                        IconButton(
                            onClick = {
                                markerDropMode = false
                                markerDropModeType = null
                            },
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Cancel",
                                tint = when (markerDropModeType) {
                                    "community" -> MaterialTheme.colorScheme.onSecondaryContainer
                                    "curved" -> MaterialTheme.colorScheme.onPrimaryContainer
                                    else -> MaterialTheme.colorScheme.onPrimaryContainer
                                },
                            )
                        }
                    }
                }
            }
            
            // Map View
            OSMMapView(
                modifier = Modifier.fillMaxSize(),
                center = mapCenter,
                onMapClick = { point ->
                    android.util.Log.d("MapScreen", "=== MAP CLICKED ===")
                    android.util.Log.d("MapScreen", "Point: ${point.latitude}, ${point.longitude}")
                    android.util.Log.d("MapScreen", "markerDropMode: $markerDropMode")
                    android.util.Log.d("MapScreen", "markerDropModeType: $markerDropModeType")
                    android.util.Log.d("MapScreen", "mapViewRef is null: ${mapViewRef == null}")
                    
                    // Priority 1: Handle marker drop mode
                    if (markerDropMode) {
                        android.util.Log.d("MapScreen", "ENTERING MARKER DROP MODE HANDLER")
                        searchCenterMarker = point
                        val searchType = markerDropModeType // Save before clearing
                        markerDropMode = false
                        
                        // Add marker to map
                        mapViewRef?.let { mapView ->
                            android.util.Log.d("MapScreen", "mapView found, adding marker and radius")
                            
                            // Clear previous search markers
                            val removedMarkers = mapView.overlays.removeAll { overlay ->
                                overlay is Marker && overlay.title == "Search Center"
                            }
                            android.util.Log.d("MapScreen", "Removed $removedMarkers old markers")
                            
                            // Clear previous radius circles to draw new one
                            val removedPolygons = mapView.overlays.removeAll { overlay ->
                                overlay is org.osmdroid.views.overlay.Polygon
                            }
                            android.util.Log.d("MapScreen", "Removed $removedPolygons old polygons")
                            
                            // Create a more visible marker for search using a custom drawable
                            val markerIcon = try {
                                // Try to use a more visible icon
                                val drawable = android.graphics.drawable.BitmapDrawable(
                                    context.resources,
                                    android.graphics.Bitmap.createBitmap(48, 48, android.graphics.Bitmap.Config.ARGB_8888).apply {
                                        val canvas = android.graphics.Canvas(this)
                                        val paint = android.graphics.Paint().apply {
                                            color = android.graphics.Color.argb(255, 0, 100, 255) // Blue
                                            style = android.graphics.Paint.Style.FILL
                                            isAntiAlias = true
                                        }
                                        canvas.drawCircle(24f, 24f, 20f, paint)
                                        // Add a white border
                                        paint.style = android.graphics.Paint.Style.STROKE
                                        paint.color = android.graphics.Color.WHITE
                                        paint.strokeWidth = 4f
                                        canvas.drawCircle(24f, 24f, 20f, paint)
                                    }
                                )
                                drawable
                            } catch (e: Exception) {
                                android.util.Log.e("MapScreen", "Error creating custom marker icon", e)
                                // Fallback to default icon
                                context.getDrawable(android.R.drawable.ic_menu_mylocation)?.apply {
                                    setTint(android.graphics.Color.argb(255, 0, 100, 255))
                                    setAlpha(255)
                                }
                            }
                            
                            android.util.Log.d("MapScreen", "Adding marker at ${point.latitude}, ${point.longitude}")
                            val marker = mapView.addMarker(
                                point = point,
                                title = "Search Center",
                                icon = markerIcon,
                            )
                            // Ensure marker is properly configured
                            marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                            marker.isDraggable = false
                            android.util.Log.d("MapScreen", "Marker added successfully")
                            
                            // Draw radius circle (default 10km for curved roads, or get from panel)
                            val defaultRadius = searchRadius ?: 10.0 // km, use existing radius if set
                            android.util.Log.d("MapScreen", "Drawing radius circle: ${defaultRadius}km at ${point.latitude}, ${point.longitude}")
                            
                            // Add radius circle (function expects radius in km)
                            try {
                                mapView.addRadiusCircle(point, defaultRadius)
                                android.util.Log.d("MapScreen", "Radius circle added successfully")
                            } catch (e: Exception) {
                                android.util.Log.e("MapScreen", "Error adding radius circle", e)
                            }
                            
                            searchRadius = defaultRadius
                            
                            // Update map view to show marker
                            mapView.invalidate()
                            android.util.Log.d("MapScreen", "Map invalidated")
                            
                            // Re-open the appropriate panel with marker location
                            if (searchType == "community" || showCommunityRoads) {
                                showCommunityRoads = true
                                markerDropModeType = null
                            } else {
                                showFilters = true
                                markerDropModeType = null
                            }
                        } ?: run {
                            android.util.Log.e("MapScreen", "ERROR: mapViewRef is null, cannot add marker!")
                        }
                        
                        // After dropping marker, return to prevent other click handling
                        return@OSMMapView
                    } else {
                        android.util.Log.d("MapScreen", "NOT in marker drop mode, checking for community road clicks")
                    }
                    
                    // Priority 2: Handle community road clicks (only if not in marker drop mode)
                    val clickedRoad = communityRoads.firstOrNull { road ->
                            road.geometry?.let { geometry ->
                                // Check if point is near any segment of this road
                                for (i in 0 until geometry.size - 1) {
                                    val p1 = geometry[i]
                                    val p2 = geometry[i + 1]
                                    if (p1.size >= 2 && p2.size >= 2) {
                                        val distance = pointToLineDistance(
                                            point.latitude, point.longitude,
                                            p1[0], p1[1],
                                            p2[0], p2[1]
                                        )
                                        // ~0.001 degrees ≈ 111 meters, use 0.002 for ~200m tolerance
                                        if (distance < 0.002) {
                                            return@firstOrNull true
                                        }
                                    }
                                }
                            }
                            false
                        }
                        
                        if (clickedRoad != null) {
                            // Fetch full road details and show
                            coroutineScope.launch {
                                isLoadingCommunityRoadDetails = true
                                try {
                                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                    val response = apiService.getPublicRoad(clickedRoad.id)
                                    if (response.isSuccessful && response.body() != null) {
                                        selectedCommunityRoad = response.body()
                                        showCommunityRoadDetails = true
                                    } else {
                                        // If API fails, show with available data
                                        selectedCommunityRoad = clickedRoad
                                        showCommunityRoadDetails = true
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error fetching road details: ${e.message}", e)
                                    // Show with available data even if fetch fails
                                    selectedCommunityRoad = clickedRoad
                                    showCommunityRoadDetails = true
                                } finally {
                                    isLoadingCommunityRoadDetails = false
                                }
                            }
                            return@OSMMapView
                        }
                },
                onMapReady = { view ->
                    android.util.Log.d("MapScreen", "Map ready, setting mapViewRef")
                    mapViewRef = view
                    // Set initial map layer from settings
                    view.setTileSource(
                        when (defaultMapView) {
                            "terrain" -> TileSourceFactory.USGS_TOPO
                            "satellite" -> TileSourceFactory.USGS_SAT
                            else -> TileSourceFactory.MAPNIK
                        },
                    )
                    // Set initial center to user location or default
                    if (hasLocationPermission()) {
                        // TODO: Get user location and center map
                        view.controller.setCenter(GeoPoint(50.0, 8.0)) // Default: Europe
                    } else {
                        view.controller.setCenter(GeoPoint(50.0, 8.0)) // Default: Europe
                    }
                    view.controller.setZoom(6.0)

                    // If there's already a route selected, draw it asynchronously to avoid blocking main thread
                    selectedRoute?.let { route ->
                        android.util.Log.d("MapScreen", "Map ready, scheduling route drawing")
                        if (route.geometry.isNotEmpty()) {
                            coroutineScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                                try {
                                    val validGeometry = route.geometry.filter { it.size >= 2 }
                                    if (validGeometry.isNotEmpty()) {
                                        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                                            view.clearOverlays()
                                            view.addRoute(validGeometry, android.graphics.Color.parseColor("#5B7C99"), 12f) // Muted slate blue

                                            // Add markers
                                            val start = validGeometry.first()
                                            if (start.size >= 2) {
                                                view.addMarker(
                                                    GeoPoint(start[0], start[1]),
                                                    "Start",
                                                    icon = context.getDrawable(android.R.drawable.ic_menu_mylocation)?.apply {
                                                        setTint(android.graphics.Color.parseColor("#5E8B65")) // Muted sage green
                                                    },
                                                )
                                            }
                                            val end = validGeometry.last()
                                            if (end.size >= 2) {
                                                view.addMarker(
                                                    GeoPoint(end[0], end[1]),
                                                    "End",
                                                    icon = context.getDrawable(android.R.drawable.ic_menu_mylocation)?.apply {
                                                        setTint(android.graphics.Color.parseColor("#B85450")) // Muted terracotta red
                                                    },
                                                )
                                            }

                                            view.fitBounds(validGeometry, padding = 100)
                                            android.util.Log.d("MapScreen", "Route drawn successfully on map ready")
                                        }
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error drawing route on map ready: ${e.message}", e)
                                }
                            }
                        }
                    }
                },
            )

            // Update map when route changes - show route immediately when calculated
            LaunchedEffect(routeState, mapViewRef) {
                if (routeState is RouteState.Success) {
                    mapViewRef?.let { mapView ->
                        selectedRoute?.let { route ->
                            android.util.Log.d("MapScreen", "Route calculated successfully, drawing: ${route.geometry.size} points, distance=${route.distance / 1000.0}km")
                            
                            // Clear only route polylines and route markers, keep search roads
                            // Clear blue route polylines
                            mapView.overlays.removeAll { overlay ->
                                overlay is Polyline && (overlay.color == android.graphics.Color.BLUE ||
                                    overlay.color == android.graphics.Color.parseColor("#5B7C99"))
                            }
                            // Clear alternative route polylines
                            mapView.overlays.removeAll { overlay ->
                                overlay is Polyline && (
                                    overlay.color == android.graphics.Color.GRAY ||
                                    overlay.color == android.graphics.Color.parseColor("#FF9800") ||
                                    overlay.color == android.graphics.Color.parseColor("#9C27B0") ||
                                    overlay.color == android.graphics.Color.parseColor("#C89858") ||
                                    overlay.color == android.graphics.Color.parseColor("#7B6B8E")
                                )
                            }
                            // Clear route markers
                            mapView.overlays.removeAll { overlay ->
                                overlay is Marker && (overlay.title == "Start" || overlay.title == "End")
                            }
                            
                            // Draw route polyline
                            if (route.geometry.isNotEmpty()) {
                                try {
                                    // Validate geometry format
                                    val validGeometry = route.geometry.filter { it.size >= 2 }
                                    if (validGeometry.isEmpty()) {
                                        android.util.Log.e("MapScreen", "Route geometry has no valid coordinates")
                                        return@let
                                    }
                                    
                                    android.util.Log.d("MapScreen", "Adding route with ${validGeometry.size} valid points")
                                    mapView.addRoute(
                                        coordinates = validGeometry,
                                        color = android.graphics.Color.parseColor("#5B7C99"), // Muted slate blue
                                        width = 12f,
                                    )
                                    android.util.Log.d("MapScreen", "Route polyline added to map")

                                    // Add start marker
                                    val start = validGeometry.first()
                                    if (start.size >= 2) {
                                        mapView.addMarker(
                                            point = GeoPoint(start[0], start[1]),
                                            title = "Start",
                                            icon = context.getDrawable(android.R.drawable.ic_menu_mylocation)?.apply {
                                                setTint(android.graphics.Color.parseColor("#5E8B65")) // Muted sage green
                                            },
                                        )
                                    }

                                    // Add end marker
                                    val end = validGeometry.last()
                                    if (end.size >= 2) {
                                        mapView.addMarker(
                                            point = GeoPoint(end[0], end[1]),
                                            title = "End",
                                            icon = context.getDrawable(android.R.drawable.ic_menu_mylocation)?.apply {
                                                setTint(android.graphics.Color.parseColor("#B85450")) // Muted terracotta red
                                            },
                                        )
                                    }
                                    
                                    // Fit map bounds to show entire route
                                    android.util.Log.d("MapScreen", "Fitting map bounds to route")
                                    mapView.fitBounds(validGeometry, padding = 100)
                                    android.util.Log.d("MapScreen", "Map bounds fitted")
                                    
                                    // Show route info card
                                    showRouteInfo = true
                                    
                                    // Show success toast
                                    val distanceText = com.scenicroutes.app.utils.DistanceFormatter.formatDistance(route.distance, measurementUnits)
                                    android.widget.Toast.makeText(
                                        context,
                                        "Route calculated! Distance: $distanceText",
                                        android.widget.Toast.LENGTH_SHORT,
                                    ).show()
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error drawing route: ${e.message}", e)
                                    e.printStackTrace()
                                    android.widget.Toast.makeText(
                                        context,
                                        "Error drawing route: ${e.message}",
                                        android.widget.Toast.LENGTH_LONG,
                                    ).show()
                                }
                            } else {
                                android.util.Log.w("MapScreen", "Route has empty geometry")
                                android.widget.Toast.makeText(
                                    context,
                                    "Route has no geometry data",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            }
                        }
                    }
                } else if (routeState is RouteState.Error) {
                    val errorMsg = (routeState as RouteState.Error).message
                    android.util.Log.e("MapScreen", "Route calculation failed: $errorMsg")
                    // Error card will be shown in the UI, no need for toast here
                }
            }
            
            // Draw alternative routes and search roads when they change
            LaunchedEffect(searchRoads, mapViewRef) {
                // Draw roads whenever searchRoads changes
                android.util.Log.d("MapScreen", "=== SEARCH ROADS EFFECT ===")
                android.util.Log.d("MapScreen", "searchRoads.size=${searchRoads.size}")
                android.util.Log.d("MapScreen", "mapViewRef != null: ${mapViewRef != null}")
                
                if (searchRoads.isNotEmpty() && mapViewRef != null) {
                    mapViewRef?.let { mapView ->
                        android.util.Log.d("MapScreen", "Starting to draw ${searchRoads.size} roads on map")
                        
                        // Clear only search road polylines (green ones for curved roads)
                        val clearedCount = mapView.overlays.removeAll { overlay ->
                            overlay is Polyline && (overlay.color == android.graphics.Color.GREEN ||
                                overlay.color == android.graphics.Color.parseColor("#5E8B65"))
                        }
                        android.util.Log.d("MapScreen", "Cleared $clearedCount old road overlays")

                        // Draw curved roads search results if available
                        if (searchRoads.isNotEmpty()) {
                            android.util.Log.d("MapScreen", "Drawing ${searchRoads.size} curved roads on map")
                            var roadsDrawn = 0
                            searchRoads.forEach { road ->
                                android.util.Log.d("MapScreen", "Processing road: ${road.name}, coordinates: ${road.coordinates.size}")
                                if (road.coordinates.isNotEmpty()) {
                                    try {
                                        // Don't filter coordinates - let addRoute handle validation
                                        android.util.Log.d("MapScreen", "Road ${road.name}: attempting to draw ${road.coordinates.size} coordinates")
                                        
                                        // Store road reference for click handler
                                        val roadRef = road
                                        mapView.addRoute(
                                            coordinates = road.coordinates,
                                            color = android.graphics.Color.parseColor("#5E8B65"), // Muted sage green
                                            width = 6f,
                                            onClick = {
                                                // Show road details when clicked
                                                selectedRoadForDetails = roadRef
                                                showRoadDetails = true
                                            },
                                        )
                                        roadsDrawn++
                                        android.util.Log.d("MapScreen", "Drew curved road: ${road.name}")
                                    } catch (e: Exception) {
                                        android.util.Log.e("MapScreen", "Error drawing search road ${road.name}: ${e.message}", e)
                                        e.printStackTrace()
                                    }
                                } else {
                                    android.util.Log.w("MapScreen", "Road ${road.name} has empty coordinates")
                                }
                            }
                            android.util.Log.d("MapScreen", "Road drawing complete: $roadsDrawn roads drawn out of ${searchRoads.size}")
                            if (roadsDrawn > 0) {
                                // Show success message when roads are drawn
                                android.widget.Toast.makeText(
                                    context,
                                    "Found $roadsDrawn curved road(s)",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                                android.util.Log.d("MapScreen", "Successfully drew $roadsDrawn roads on map")
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "No valid curved roads found",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            }
                            // Force map refresh
                            mapView.invalidate()
                        } else {
                            android.util.Log.d("MapScreen", "No curved roads found in search results")
                        }
                    }
                }
            }

            LaunchedEffect(alternativeRoutes, mapViewRef, isSearchingRoads) {
                // Draw alternative routes when they change
                if (!isSearchingRoads) {
                    mapViewRef?.let { mapView ->
                        android.util.Log.d("MapScreen", "Drawing alternative routes: ${alternativeRoutes.size}")
                        // Clear only alternative route polylines (not search roads or main route)
                        mapView.overlays.removeAll { overlay ->
                            overlay is Polyline && overlay.color == android.graphics.Color.GRAY ||
                            overlay is Polyline && overlay.color == android.graphics.Color.parseColor("#FF9800") ||
                            overlay is Polyline && overlay.color == android.graphics.Color.parseColor("#9C27B0") ||
                            overlay is Polyline && overlay.color == android.graphics.Color.parseColor("#C89858") ||
                            overlay is Polyline && overlay.color == android.graphics.Color.parseColor("#7B6B8E")
                        }

                        // Draw alternative routes if available
                        alternativeRoutes.forEachIndexed { index, altRoute ->
                            if (altRoute.geometry.isNotEmpty()) {
                                try {
                                    val altColor = when (index % 3) {
                                        0 -> android.graphics.Color.GRAY
                                        1 -> android.graphics.Color.parseColor("#C89858") // Muted amber/gold
                                        else -> android.graphics.Color.parseColor("#7B6B8E") // Muted purple
                                    }
                                    mapView.addRoute(
                                        coordinates = altRoute.geometry,
                                        color = altColor,
                                        width = 8f,
                                    )
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error drawing alternative route: ${e.message}", e)
                                }
                            }
                        }
                    }
                }
            }
            
            // Draw community roads when they change
            LaunchedEffect(communityRoads, mapViewRef, isSearchingCommunityRoads) {
                // Wait for search to complete before drawing
                if (!isSearchingCommunityRoads) {
                    mapViewRef?.let { mapView ->
                        // Clear only community road polylines (green ones)
                        mapView.overlays.removeAll { overlay ->
                            overlay is Polyline && (overlay.color == android.graphics.Color.parseColor("#4CAF50") ||
                                overlay.color == android.graphics.Color.parseColor("#5E8B65")) // Green for community roads
                        }
                        
                        // Draw community roads if available
                        if (communityRoads.isNotEmpty()) {
                            android.util.Log.d("MapScreen", "Drawing ${communityRoads.size} community roads on map")
                            var roadsDrawn = 0
                            communityRoads.forEach { road ->
                                road.geometry?.let { geometry ->
                                    if (geometry.isNotEmpty()) {
                                        try {
                                            // Store road reference for click handler
                                            val roadRef = road
                                            mapView.addRoute(
                                                coordinates = geometry,
                                                color = android.graphics.Color.parseColor("#5E8B65"), // Muted sage green for community roads
                                                width = 8f,
                                                onClick = {
                                                    // Fetch full road details with user info and show details sheet
                                                    coroutineScope.launch {
                                                        isLoadingCommunityRoadDetails = true
                                                        try {
                                                            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                                            val response = apiService.getPublicRoad(road.id)
                                                            if (response.isSuccessful && response.body() != null) {
                                                                selectedCommunityRoad = response.body()
                                                                showCommunityRoadDetails = true
                                                            } else {
                                                                // If API fails, show with available data
                                                                selectedCommunityRoad = road
                                                                showCommunityRoadDetails = true
                                                            }
                                                        } catch (e: Exception) {
                                                            android.util.Log.e("MapScreen", "Error fetching road details: ${e.message}", e)
                                                            // Show with available data even if fetch fails
                                                            selectedCommunityRoad = road
                                                            showCommunityRoadDetails = true
                                                        } finally {
                                                            isLoadingCommunityRoadDetails = false
                                                        }
                                                    }
                                                },
                                            )
                                            roadsDrawn++
                                            android.util.Log.d("MapScreen", "Drew community road: ${road.road_name} with ${geometry.size} points")
                                        } catch (e: Exception) {
                                            android.util.Log.e("MapScreen", "Error drawing community road ${road.road_name}: ${e.message}", e)
                                        }
                                    } else {
                                        android.util.Log.w("MapScreen", "Community road ${road.road_name} has empty geometry")
                                    }
                                } ?: run {
                                    android.util.Log.w("MapScreen", "Community road ${road.road_name} has no geometry")
                                }
                            }
                            if (roadsDrawn > 0) {
                                // Show success message when roads are drawn
                                android.widget.Toast.makeText(
                                    context,
                                    "Found $roadsDrawn community road(s)",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "No valid community roads found",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            }
                            // Force map refresh
                            mapView.invalidate()
                        } else {
                            android.util.Log.d("MapScreen", "No community roads found in search results")
                        }
                    }
                }
            }

            // Search Bar
            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(padding)
                    .padding(16.dp),
            ) {
                SearchBar(
                    modifier = Modifier.fillMaxWidth(),
                    viewModel = viewModel,
                    onLocationSelected = { result ->
                        mapViewRef?.let { mapView ->
                            val point = GeoPoint(result.lat, result.lon)
                            mapView.controller.animateTo(point)
                            mapView.controller.setZoom(15.0)
                            mapCenter = point
                        }
                    },
                )
            }

            // Quick action buttons (Location, Layers)
            Column(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Location button
                FloatingActionButton(
                    onClick = {
                        if (hasLocationPermission()) {
                            coroutineScope.launch {
                                try {
                                    val locationManager = context.getSystemService(android.content.Context.LOCATION_SERVICE) as android.location.LocationManager
                                    val lastKnownLocation = locationManager.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                                        ?: locationManager.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                                    
                                    if (lastKnownLocation != null) {
                                        val userLocation = GeoPoint(lastKnownLocation.latitude, lastKnownLocation.longitude)
                                        mapViewRef?.controller?.apply {
                                            setCenter(userLocation)
                                            setZoom(16.0)
                                        }
                                        android.util.Log.d("MapScreen", "Centered map on user location: ${userLocation.latitude}, ${userLocation.longitude}")
                                    } else {
                                        android.widget.Toast.makeText(
                                            context,
                                            "Location not available. Please ensure GPS is enabled.",
                                            android.widget.Toast.LENGTH_SHORT
                                        ).show()
                                        android.util.Log.w("MapScreen", "No last known location available")
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error getting user location: ${e.message}", e)
                                    android.widget.Toast.makeText(
                                        context,
                                        "Error getting location: ${e.message}",
                                        android.widget.Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        } else {
                            showLocationPermissionDialog = true
                        }
                    },
                    modifier = Modifier.size(56.dp),
                    containerColor = MaterialTheme.colorScheme.surface,
                ) {
                    Icon(
                        Icons.Default.MyLocation,
                        contentDescription = "My Location",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }

                // Layers button
                FloatingActionButton(
                    onClick = { showMapLayers = true },
                    modifier = Modifier.size(56.dp),
                    containerColor = MaterialTheme.colorScheme.surface,
                ) {
                    Icon(
                        Icons.Default.Layers,
                        contentDescription = "Map Layers",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            // Loading indicator for route calculation
            when (routeState) {
                is RouteState.Loading -> {
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp),
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface,
                            ),
                            modifier = Modifier.padding(16.dp),
                        ) {
                            Row(
                                modifier = Modifier.padding(24.dp),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                )
                                Text(
                                    text = "Calculating route...",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
                is RouteState.Error -> {
                    // Only show error if it's actually an error state
                    val errorMessage = (routeState as RouteState.Error).message
                    if (errorMessage.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(padding)
                                .padding(16.dp),
                        ) {
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.errorContainer,
                                ),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Route Calculation Failed",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onErrorContainer,
                                        )
                                        Text(
                                            text = errorMessage,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onErrorContainer,
                                        )
                                    }
                                    IconButton(onClick = { 
                                        viewModel.clearRoute()
                                        showRouteInfo = false
                                        // Also clear map overlays
                                        mapViewRef?.clearOverlays()
                                    }) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Close",
                                            tint = MaterialTheme.colorScheme.onErrorContainer,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                else -> {}
            }
            
            // Loading indicator for roads search
            if (isSearchingRoads || isSearchingCommunityRoads) {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp),
                ) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                        ),
                        modifier = Modifier.padding(16.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(24.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                            )
                            Text(
                                text = when {
                                    isSearchingCommunityRoads -> "Searching for community roads..."
                                    isSearchingRoads -> "Searching for curved roads..."
                                    else -> "Searching..."
                                },
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }
            
            // Route Info Card (when route is calculated)
            if (showRouteInfo && routeState is RouteState.Success && selectedRoute != null) {
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(padding)
                        .padding(16.dp),
                ) {
                    RouteInfoCard(
                        route = selectedRoute!!,
                        saveRouteState = saveRouteState, // Pass save state for animated feedback
                        onDismiss = {
                            android.util.Log.d("MapScreen", "RouteInfoCard onDismiss called, setting showRouteInfo = false")
                            showRouteInfo = false
                        },
                        onStartRecording = {
                            // Generate route ID from geometry hash (simple approach)
                            // In production, could use share token if route was shared
                            val routeId = selectedRoute!!.geometry.hashCode().toString()
                            navController.navigate("recording?routeId=$routeId") {
                                launchSingleTop = true
                            }
                        },
                        onSave = {
                            // Show SaveRouteDialog to let user enter a custom name
                            coroutineScope.launch {
                                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                val token = tokenManager.token.first()
                                if (token != null) {
                                    showSaveRouteDialog = true
                                } else {
                                    // User not logged in
                                    android.widget.Toast.makeText(
                                        context,
                                        "Please log in to save routes",
                                        android.widget.Toast.LENGTH_LONG,
                                    ).show()
                                }
                            }
                        },
                        onShare = {
                            coroutineScope.launch {
                                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                val token = tokenManager.token.first()
                                // Share can work without login, but logged-in users get better features
                                viewModel.shareRoute(
                                    token = token,
                                    route = selectedRoute!!,
                                )
                            }
                        },
                        onNavigate = {
                            // Ensure route is set in ViewModel before navigating
                            selectedRoute?.let { route ->
                                viewModel.setSelectedRoute(route)
                                // Dismiss the route info card
                                showRouteInfo = false
                                // Navigate to navigation screen
                                navController.navigate("navigation") {
                                    launchSingleTop = true
                                }
                            } ?: run {
                                android.widget.Toast.makeText(
                                    context,
                                    "No route selected",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            }
                        },
                        alternativeRoutes = alternativeRoutes,
                        onShowAlternatives = {
                            // Show alternative routes sheet
                        },
                        routeWeather = routeWeather,
                        isLoadingWeather = isLoadingWeather,
                        onEditRoute = {
                            // Reopen route planner with current route data
                            selectedRoute?.let { route ->
                                // Extract start and end locations from route geometry
                                if (route.geometry.isNotEmpty()) {
                                    val start = route.geometry.first()
                                    val end = route.geometry.last()
                                    if (start.size >= 2 && end.size >= 2) {
                                        // Try to reverse geocode or use coordinates
                                        lastStartLocation = "${String.format("%.4f", start[0])}, ${String.format("%.4f", start[1])}"
                                        lastEndLocation = "${String.format("%.4f", end[0])}, ${String.format("%.4f", end[1])}"
                                    }
                                }
                                lastWaypoints = route.waypoints ?: emptyList()
                            }
                            showRouteInfo = false
                            showRoutePlanning = true
                        },
                    )
                }
            }
        }
        
        // Sheets and dialogs (outside Box but inside Scaffold content)
        // Action Menu Sheet
        if (showActionMenu) {
            ActionMenuSheet(
                onDismiss = { showActionMenu = false },
                onPlanRoute = {
                    showActionMenu = false
                    showRoutePlanning = true
                },
                onFindCurvedRoads = {
                    showActionMenu = false
                    showFilters = true
                },
                onRecordRide = {
                    android.util.Log.d("MapScreen", "onRecordRide called - closing menu and navigating")
                    showActionMenu = false
                    // Use coroutine scope to delay navigation after bottom sheet dismissal
                    coroutineScope.launch {
                        // Wait for bottom sheet dismissal animation to complete
                        kotlinx.coroutines.delay(400)
                        try {
                            android.util.Log.d("MapScreen", "Navigating to recording screen")
                            navController.navigate("recording") {
                                launchSingleTop = true
                            }
                            android.util.Log.d("MapScreen", "Navigation to recording screen completed")
                        } catch (e: Exception) {
                            android.util.Log.e("MapScreen", "Error navigating to recording screen", e)
                        }
                    }
                },
                onImportGPX = {
                    showActionMenu = false
                    showGPXImportDialog = true
                },
                onExportGPX = {
                    showActionMenu = false
                    showGPXExportDialog = true
                },
                onClearAll = {
                    showActionMenu = false
                    viewModel.clearRoute()
                    mapViewRef?.clearOverlays()
                    showRouteInfo = false
                    // Also clear the selected community road when clearing the map
                    selectedCommunityRoad = null
                    showCommunityRoadDetails = false
                    // Navigate to clean map route without parameters to ensure navigation works
                    val currentRoute = navController.currentBackStackEntry?.destination?.route
                    if (currentRoute != null && currentRoute.contains("roadId")) {
                        android.util.Log.d("MapScreen", "Clearing map - navigating to clean map route")
                        navController.navigate("map") {
                            popUpTo("map") { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                    android.widget.Toast.makeText(
                        context,
                        "Map cleared",
                        android.widget.Toast.LENGTH_SHORT,
                    ).show()
                },
                onRouteHistory = {
                    showActionMenu = false
                    navController.navigate("route_history") {
                        launchSingleTop = true
                    }
                },
                onCommunityRoads = {
                    showActionMenu = false
                    showCommunityRoads = true
                },
            )
        }

        if (showGPXImportDialog) {
            GPXImportDialog(
                onDismiss = { showGPXImportDialog = false },
                onImportSuccess = { route ->
                    viewModel.setSelectedRoute(route)
                    showRouteInfo = true
                    showGPXImportDialog = false
                },
            )
        }

        if (showGPXExportDialog) {
            GPXExportDialog(
                route = selectedRoute,
                savedRoads = savedRoads,
                collections = emptyList(),
                onDismiss = { showGPXExportDialog = false },
                navController = navController,
            )
        }

        // Route Planning Sheet
        if (showRoutePlanning) {
            RoutePlanningSheet(
                onDismiss = { showRoutePlanning = false },
                onCalculateRoute = { startLat, startLng, endLat, endLng, curvatureLevel, avoidOptions, waypoints, savedRoadIds ->
                    // Remember values for editing
                    lastWaypoints = waypoints ?: emptyList()
                    // Show loading state - route info will show automatically when route is calculated
                    showRoutePlanning = false
                    viewModel.calculateRoute(
                        startLat = startLat,
                        startLng = startLng,
                        endLat = endLat,
                        endLng = endLng,
                        curvatureLevel = curvatureLevel,
                        avoidOptions = avoidOptions,
                        waypoints = waypoints,
                        savedRoadIds = savedRoadIds,
                    )
                },
                onCalculateRoundTrip = { centerLat, centerLng, distanceKm, curvatureLevel, waypoints, savedRoadIds ->
                    // Show loading state - route info will show automatically when route is calculated
                    showRoutePlanning = false
                    viewModel.calculateRoundTrip(
                        centerLat = centerLat,
                        centerLng = centerLng,
                        distance = distanceKm,
                        curvatureLevel = curvatureLevel,
                        waypoints = waypoints,
                        savedRoadIds = savedRoadIds,
                    )
                },
                startLocation = lastStartLocation,
                endLocation = lastEndLocation,
                initialWaypoints = lastWaypoints,
                navController = navController,
            )
        }
        
        // Road Search Filters Panel
        if (showFilters) {
            RoadSearchFiltersPanel(
                onDismiss = { 
                    showFilters = false
                    // Don't reset markerDropMode here - user may just be sliding panel
                    // markerDropMode will be reset when user clicks cancel button or successfully drops marker
                },
                onSearch = { lat, lon, radius, roadType, curvatureType, lengthFilter ->
                    searchRadius = radius
                    // Clear previous error state if any
                    if (routeState is RouteState.Error) {
                        viewModel.clearRoute()
                    }
                    viewModel.searchRoads(
                        lat = lat,
                        lon = lon,
                        radius = radius,
                        roadType = roadType,
                        curvatureType = curvatureType,
                        lengthFilter = lengthFilter,
                    )
                    // If show_community_by_default is enabled, also search community roads
                    if (showCommunityByDefault) {
                        viewModel.searchCommunityRoads(
                            lat = lat,
                            lon = lon,
                            radius = radius,
                            lengthFilter = lengthFilter,
                            curvinessFilter = curvatureType,
                        )
                        // Show community roads panel
                        showCommunityRoads = true
                    }
                    // Center map on search location and show radius circle
                    mapViewRef?.let { mapView ->
                        val centerPoint = GeoPoint(lat, lon)
                        // Clear previous radius circles before adding new one
                        mapView.overlays.removeAll { overlay ->
                            overlay is org.osmdroid.views.overlay.Polygon
                        }
                        // Add radius circle (function expects radius in km)
                        android.util.Log.d("MapScreen", "Adding radius circle: ${radius}km at $lat, $lon")
                        mapView.addRadiusCircle(centerPoint, radius)
                        searchRadius = radius
                        // Calculate appropriate zoom level
                        val zoomLevel = when {
                            radius <= 5.0 -> 13.0
                            radius <= 10.0 -> 12.0
                            radius <= 20.0 -> 11.0
                            else -> 10.0
                        }
                        mapView.controller.animateTo(centerPoint)
                        mapView.controller.setZoom(zoomLevel)
                        mapView.invalidate()
                    }
                    showFilters = false
                },
                onDropMarker = {
                    android.util.Log.d("MapScreen", "Drop marker button clicked, setting markerDropMode=true")
                    markerDropMode = true
                    markerDropModeType = "curved" // For curved roads search
                    // Don't close the filters panel - keep it open so user can see instructions
                    // Show toast to guide user
                    android.widget.Toast.makeText(
                        context,
                        "Tap on the map to place a marker",
                        android.widget.Toast.LENGTH_LONG,
                    ).show()
                    // Clear any error state when starting new search
                    if (routeState is RouteState.Error) {
                        viewModel.clearRoute()
                        mapViewRef?.clearOverlays()
                    }
                },
                markerLocation = searchCenterMarker,
                onMarkerLocationChange = { newLocation ->
                    searchCenterMarker = newLocation
                },
            )
        }
        
        
        // Map Layers Dialog
        if (showMapLayers) {
            val settingsViewModel: com.scenicroutes.app.ui.viewmodel.SettingsViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
            MapLayersDialog(
                currentLayer = currentMapLayer,
                onDismiss = { showMapLayers = false },
                onLayerSelected = { layer ->
                    currentMapLayer = layer
                    mapViewRef?.setTileSource(
                        when (layer) {
                            "standard" -> TileSourceFactory.MAPNIK
                            "terrain" -> TileSourceFactory.USGS_TOPO
                            "satellite" -> TileSourceFactory.USGS_SAT
                            else -> TileSourceFactory.MAPNIK
                        },
                    )
                    // Save to settings
                    settingsViewModel.updateSetting("default_map_view", layer)
                    showMapLayers = false
                },
            )
        }
        
        // Community Roads Sheet
        if (showCommunityRoads) {
            CommunityRoadsSheet(
                onDismiss = {
                    showCommunityRoads = false
                },
                onRoadSelected = { road ->
                    // Show road on map or navigate to it
                    road.geometry?.let { geometry ->
                        if (geometry.isNotEmpty()) {
                            mapViewRef?.let { mapView ->
                                mapView.clearOverlays()
                                mapView.addRoute(
                                    coordinates = geometry,
                                    color = android.graphics.Color.parseColor("#5E8B65"), // Muted sage green for community roads
                                    width = 8f,
                                )
                                mapView.fitBounds(geometry, padding = 100)
                            }
                        }
                    }
                    showCommunityRoads = false
                },
                onSearchCommunityRoads = { lat, lon, radius, country, region, location, lengthFilter, curvinessFilter, minRating, sortBy ->
                    viewModel.searchCommunityRoads(
                        lat = lat,
                        lon = lon,
                        radius = radius,
                        country = country,
                        region = region,
                        location = location,
                        minRating = minRating,
                        tags = null, // TODO: Add tags support
                        lengthFilter = lengthFilter,
                        curvinessFilter = curvinessFilter,
                        sortBy = sortBy,
                    )
                },
                onDropMarker = {
                    markerDropMode = true
                    markerDropModeType = "community" // For community roads search
                    showCommunityRoads = false
                    android.widget.Toast.makeText(
                        context,
                        "Tap on map to set search center",
                        android.widget.Toast.LENGTH_LONG,
                    ).show()
                },
                markerLocation = searchCenterMarker,
                communityRoads = communityRoads,
                isLoading = isSearchingCommunityRoads,
            )
        }
        
        // Road Details Sheet (when a road is clicked)
        if (showRoadDetails && selectedRoadForDetails != null) {
            RoadNetworkDetailsSheet(
                road = selectedRoadForDetails!!,
                onDismiss = {
                    showRoadDetails = false
                    selectedRoadForDetails = null
                },
                onSave = {
                    coroutineScope.launch {
                        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                        val token = tokenManager.token.first()
                        if (token != null) {
                            viewModel.saveRoadNetworkSearch(
                                token = token,
                                road = selectedRoadForDetails!!,
                            )
                            android.widget.Toast.makeText(
                                context,
                                "Road saved successfully!",
                                android.widget.Toast.LENGTH_SHORT,
                            ).show()
                        } else {
                            android.widget.Toast.makeText(
                                context,
                                "Please log in to save roads",
                                android.widget.Toast.LENGTH_LONG,
                            ).show()
                        }
                    }
                },
                onNavigate = {
                    // Convert road to route and navigate
                    selectedRoadForDetails?.let { road ->
                        if (road.coordinates.isNotEmpty()) {
                            // Use road.length if available, otherwise calculate from coordinates
                            val distanceMeters = if (road.length > 0) {
                                road.length // Already in meters
                            } else {
                                // Calculate actual distance from coordinates
                                var totalDistance = 0.0
                                for (i in 0 until road.coordinates.size - 1) {
                                    val p1 = road.coordinates[i]
                                    val p2 = road.coordinates[i + 1]
                                    if (p1.size >= 2 && p2.size >= 2) {
                                        totalDistance += calculateHaversineDistance(p1[0], p1[1], p2[0], p2[1])
                                    }
                                }
                                totalDistance
                            }
                            
                            val distanceKm = distanceMeters / 1000.0
                            
                            // Estimate time based on average speed (assuming 60 km/h for curved roads)
                            val estimatedTimeMs = (distanceKm / 60.0 * 3600.0 * 1000).toLong()
                            
                            android.util.Log.d("MapScreen", "Creating route from road: distance=${distanceMeters}m (${distanceKm}km), time=${estimatedTimeMs}ms, geometry points=${road.coordinates.size}")
                            
                            val route = com.scenicroutes.app.data.model.Route(
                                distance = distanceMeters, // Route expects distance in meters
                                time = estimatedTimeMs,
                                geometry = road.coordinates,
                                instructions = null,
                                curvature = road.twistiness,
                                curvatureLevel = when {
                                    road.twistiness > 0.007 -> "extra_curvy"
                                    road.twistiness > 0.0035 -> "curved"
                                    road.twistiness > 0.0025 -> "mellow"
                                    else -> "straightest"
                                },
                            )
                            viewModel.setSelectedRoute(route)
                            // Dismiss the sheet before navigating
                            showRoadDetails = false
                            selectedRoadForDetails = null
                            navController.navigate("navigation") {
                                launchSingleTop = true
                            }
                        } else {
                            android.util.Log.w("MapScreen", "Road has no coordinates, cannot navigate")
                            android.widget.Toast.makeText(
                                context,
                                "Road has no route data",
                                android.widget.Toast.LENGTH_SHORT,
                            ).show()
                        }
                    }
                },
            )
        }
        
        // Community Road Details Sheet (when a community road is clicked)
        selectedCommunityRoad?.let { road ->
            if (showCommunityRoadDetails) {
                RoadDetailsSheet(
                    road = road,
                    navController = navController,
                    onDismiss = {
                        android.util.Log.d("MapScreen", "RoadDetailsSheet dismissed - keeping road visible on map")
                        // Only hide the sheet, keep the road visible on the map
                        // The road polyline remains visible and can be clicked again to show details
                        showCommunityRoadDetails = false
                        // Don't clear selectedCommunityRoad or overlays - road should stay visible
                        // Don't manipulate navigation stack - allow normal navigation back to trips
                    },
                    onNavigate = {
                        // Convert SavedRoad to Route and navigate
                        road.geometry?.let { geometry ->
                            if (geometry.isNotEmpty()) {
                                val distanceMeters = road.distance ?: run {
                                    // Calculate distance from geometry
                                    var totalDistance = 0.0
                                    for (i in 0 until geometry.size - 1) {
                                        val p1 = geometry[i]
                                        val p2 = geometry[i + 1]
                                        if (p1.size >= 2 && p2.size >= 2) {
                                            totalDistance += calculateHaversineDistance(p1[0], p1[1], p2[0], p2[1])
                                        }
                                    }
                                    totalDistance
                                }
                                val distanceKm = distanceMeters / 1000.0
                                val estimatedTimeMs = (distanceKm / 60.0 * 3600.0 * 1000).toLong()
                                
                                val route = com.scenicroutes.app.data.model.Route(
                                    distance = distanceMeters,
                                    time = estimatedTimeMs,
                                    geometry = geometry,
                                    instructions = null,
                                    curvature = null,
                                    curvatureLevel = "balanced",
                                )
                                viewModel.setSelectedRoute(route)
                                showCommunityRoadDetails = false
                                selectedCommunityRoad = null
                                navController.navigate("navigation") {
                                    launchSingleTop = true
                                }
                            }
                        }
                    },
                    onSave = {
                        coroutineScope.launch {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            val token = tokenManager.token.first()
                            if (token != null) {
                                // Road is already saved (it's a community road), just show message
                                android.widget.Toast.makeText(
                                    context,
                                    "This road is already saved in the community",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "Please log in to save roads",
                                    android.widget.Toast.LENGTH_LONG,
                                ).show()
                            }
                        }
                    },
                    onShare = {
                        // Share community road
                        coroutineScope.launch {
                            val shareText = "Check out this road: ${road.road_name}\n${road.start_location} → ${road.end_location}"
                            val sendIntent = android.content.Intent().apply {
                                action = android.content.Intent.ACTION_SEND
                                putExtra(android.content.Intent.EXTRA_TEXT, shareText)
                                type = "text/plain"
                            }
                            val shareIntent = android.content.Intent.createChooser(sendIntent, "Share Road")
                            context.startActivity(shareIntent)
                        }
                    },
                    onShowOnMap = {
                        // Center map on road
                        road.geometry?.firstOrNull()?.let { firstPoint ->
                            if (firstPoint.size >= 2) {
                                val centerPoint = org.osmdroid.util.GeoPoint(firstPoint[0], firstPoint[1])
                                mapViewRef?.controller?.animateTo(centerPoint)
                                mapViewRef?.controller?.setZoom(12.0)
                                showCommunityRoadDetails = false
                            }
                        }
                    },
                    onEdit = {
                        // Only allow edit if user owns the road
                        coroutineScope.launch {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            val currentUserId = tokenManager.userId.first()
                            if (currentUserId == road.user_id) {
                                // Navigate to edit road screen
                                navController.navigate("edit-road/${road.id}") {
                                    launchSingleTop = true
                                }
                                showCommunityRoadDetails = false
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "You can only edit your own roads",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            }
                        }
                    },
                    reviews = road.reviews ?: emptyList(),
                    comments = road.comments ?: emptyList(),
                    onAddReview = { rating, comment ->
                        coroutineScope.launch {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            val token = tokenManager.token.first()
                            if (token != null) {
                                try {
                                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                    val request = com.scenicroutes.app.data.api.ReviewRequest(
                                        rating = rating,
                                        comment = comment,
                                    )
                                    val response = apiService.addReview("Bearer $token", road.id, request)
                                    if (response.isSuccessful) {
                                        // Refresh road details
                                        val updatedResponse = apiService.getPublicRoad(road.id)
                                        if (updatedResponse.isSuccessful && updatedResponse.body() != null) {
                                            selectedCommunityRoad = updatedResponse.body()
                                        }
                                        android.widget.Toast.makeText(
                                            context,
                                            "Review added successfully",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error adding review: ${e.message}", e)
                                }
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "Please log in to add reviews",
                                    android.widget.Toast.LENGTH_LONG,
                                ).show()
                            }
                        }
                    },
                    onAddComment = { comment ->
                        coroutineScope.launch {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            val token = tokenManager.token.first()
                            if (token != null) {
                                try {
                                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                    val request = com.scenicroutes.app.data.api.CommentRequest(comment = comment)
                                    val response = apiService.addComment("Bearer $token", road.id, request)
                                    if (response.isSuccessful) {
                                        // Refresh road details
                                        val updatedResponse = apiService.getPublicRoad(road.id)
                                        if (updatedResponse.isSuccessful && updatedResponse.body() != null) {
                                            selectedCommunityRoad = updatedResponse.body()
                                        }
                                        android.widget.Toast.makeText(
                                            context,
                                            "Comment added successfully",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("MapScreen", "Error adding comment: ${e.message}", e)
                                }
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "Please log in to add comments",
                                    android.widget.Toast.LENGTH_LONG,
                                ).show()
                            }
                        }
                    },
                    currentUserId = currentUserIdState.value,
                )
            }
        }
    }

    // Save Route Dialog (when user clicks Save on RouteInfoCard)
    if (showSaveRouteDialog && selectedRoute != null) {
        SaveRouteDialog(
            onDismiss = { showSaveRouteDialog = false },
            onSave = { routeName, isPublic, tags ->
                coroutineScope.launch {
                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                    val token = tokenManager.token.first()
                    if (token != null) {
                        viewModel.saveRouteAsRoad(
                            token = token,
                            route = selectedRoute!!,
                            name = routeName,
                            isPublic = isPublic,
                            tags = tags.toList(),
                        )
                        showSaveRouteDialog = false
                    } else {
                        android.widget.Toast.makeText(
                            context,
                            "Please log in to save routes",
                            android.widget.Toast.LENGTH_LONG,
                        ).show()
                    }
                }
            },
            navController = navController,
        )
    }

    // Location Permission Dialog
    if (showLocationPermissionDialog) {
        AlertDialog(
            onDismissRequest = { showLocationPermissionDialog = false },
            title = { Text("Location Permission") },
            text = { Text("ScenicRoutes needs location permission to show your location on the map and provide navigation.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        locationPermissionLauncher.launch(android.Manifest.permission.ACCESS_FINE_LOCATION)
                        showLocationPermissionDialog = false
                    },
                ) {
                    Text("Grant Permission")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLocationPermissionDialog = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}

// Helper function to calculate distance between two points (Haversine formula)
/**
 * Calculate distance from a point to a line segment (in degrees)
 * Returns distance in degrees (approximate)
 */
fun pointToLineDistance(
    pointLat: Double, pointLon: Double,
    lineLat1: Double, lineLon1: Double,
    lineLat2: Double, lineLon2: Double
): Double {
    // Simple distance calculation in degrees (approximate)
    // For better accuracy, would need proper haversine projection
    val A = pointLat - lineLat1
    val B = pointLon - lineLon1
    val C = lineLat2 - lineLat1
    val D = lineLon2 - lineLon1
    
    val dot = A * C + B * D
    val lenSq = C * C + D * D
    val param = if (lenSq != 0.0) dot / lenSq else -1.0
    
    val xx: Double
    val yy: Double
    
    if (param < 0) {
        xx = lineLat1
        yy = lineLon1
    } else if (param > 1) {
        xx = lineLat2
        yy = lineLon2
    } else {
        xx = lineLat1 + param * C
        yy = lineLon1 + param * D
    }
    
    val dx = pointLat - xx
    val dy = pointLon - yy
    // Return distance in degrees (approximately 111km per degree)
    return Math.sqrt(dx * dx + dy * dy)
}

fun calculateHaversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val earthRadius = 6371000.0 // meters
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
        kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) *
        kotlin.math.sin(dLon / 2) * kotlin.math.sin(dLon / 2)
    val c = 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
    return earthRadius * c
}

