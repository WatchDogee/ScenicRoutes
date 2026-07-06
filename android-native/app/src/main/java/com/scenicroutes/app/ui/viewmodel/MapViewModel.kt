package com.scenicroutes.app.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.model.*
import com.scenicroutes.app.data.model.Weather
import com.scenicroutes.app.data.repository.POIRepository
import com.scenicroutes.app.data.repository.RouteRepository
import com.scenicroutes.app.data.repository.SavedRoadRepository
import com.scenicroutes.app.data.repository.WeatherRepository
import com.scenicroutes.app.data.service.GeocodeResult
import com.scenicroutes.app.data.service.GeocodingService
import com.scenicroutes.app.data.service.TelemetryService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONObject


class MapViewModel : ViewModel() {
    private val routeRepository = RouteRepository()
    private val poiRepository = POIRepository()
    private val savedRoadRepository = SavedRoadRepository()
    private val weatherRepository = WeatherRepository()
    private val geocodingService = GeocodingService()

    // Telemetry service - will be initialized with context when needed
    private var telemetryService: TelemetryService? = null

    // Notification context - will be initialized with context when needed
    private var _notificationContext: Context? = null

    // Search history - will be initialized with context when needed
    private var searchHistoryManager: com.scenicroutes.app.data.local.SearchHistoryManager? = null
    private var routeHistoryManager: com.scenicroutes.app.data.local.RouteHistoryManager? = null

    fun setSearchHistoryManager(manager: com.scenicroutes.app.data.local.SearchHistoryManager) {
        searchHistoryManager = manager
    }

    fun setRouteHistoryManager(manager: com.scenicroutes.app.data.local.RouteHistoryManager) {
        routeHistoryManager = manager
    }

    fun setTelemetryService(context: Context) {
        telemetryService = TelemetryService(context)
    }

    fun setNotificationContext(context: Context) {
        _notificationContext = context
    }

    // Search state
    private val _searchResults = MutableStateFlow<List<GeocodeResult>>(emptyList())
    val searchResults: StateFlow<List<GeocodeResult>> = _searchResults.asStateFlow()

    private val _isSearching = MutableStateFlow(false)
    val isSearching: StateFlow<Boolean> = _isSearching.asStateFlow()

    // Route state
    private val _routeState = MutableStateFlow<RouteState>(RouteState.Idle)
    val routeState: StateFlow<RouteState> = _routeState.asStateFlow()

    // POI state
    private val _pois = MutableStateFlow<List<POI>>(emptyList())
    val pois: StateFlow<List<POI>> = _pois.asStateFlow()

    // Road network search state (actual roads from OpenStreetMap, not saved roads)
    private val _searchRoads = MutableStateFlow<List<com.scenicroutes.app.data.model.RoadNetworkSearch>>(emptyList())
    val searchRoads: StateFlow<List<com.scenicroutes.app.data.model.RoadNetworkSearch>> = _searchRoads.asStateFlow()

    private val _isSearchingRoads = MutableStateFlow(false)
    val isSearchingRoads: StateFlow<Boolean> = _isSearchingRoads.asStateFlow()

    // Community/public saved roads state (separate from road network search)
    private val _communityRoads = MutableStateFlow<List<SavedRoad>>(emptyList())
    val communityRoads: StateFlow<List<SavedRoad>> = _communityRoads.asStateFlow()

    private val _isSearchingCommunityRoads = MutableStateFlow(false)
    val isSearchingCommunityRoads: StateFlow<Boolean> = _isSearchingCommunityRoads.asStateFlow()

    // Weather state
    private val _weather = MutableStateFlow<Weather?>(null)
    val weather: StateFlow<Weather?> = _weather.asStateFlow()

    private val _isLoadingWeather = MutableStateFlow(false)
    val isLoadingWeather: StateFlow<Boolean> = _isLoadingWeather.asStateFlow()

    // Route weather state (weather along route path)
    private val _routeWeather = MutableStateFlow<Weather?>(null)
    val routeWeather: StateFlow<Weather?> = _routeWeather.asStateFlow()

    private val _isLoadingRouteWeather = MutableStateFlow(false)
    val isLoadingRouteWeather: StateFlow<Boolean> = _isLoadingRouteWeather.asStateFlow()

    // Selected route
    private val _selectedRoute = MutableStateFlow<Route?>(null)
    val selectedRoute: StateFlow<Route?> = _selectedRoute.asStateFlow()
    
    fun setSelectedRoute(route: Route) {
        _selectedRoute.value = route
        _routeState.value = RouteState.Success(route)
    }

    // Waypoints
    private val _waypoints = MutableStateFlow<List<Waypoint>>(emptyList())
    val waypoints: StateFlow<List<Waypoint>> = _waypoints.asStateFlow()

    // Alternative routes
    private val _alternativeRoutes = MutableStateFlow<List<Route>>(emptyList())
    val alternativeRoutes: StateFlow<List<Route>> = _alternativeRoutes.asStateFlow()

    fun selectRoute(route: Route) {
        _selectedRoute.value = route
        _routeState.value = RouteState.Success(route)
    }

    fun calculateRoute(
        startLat: Double,
        startLng: Double,
        endLat: Double,
        endLng: Double,
        curvatureLevel: String? = null,
        avoidOptions: AvoidOptions? = null,
        waypoints: List<Waypoint>? = null,
        savedRoadIds: List<Long>? = null, // IDs of saved roads to include in route
        clearExistingRoute: Boolean = true,
        highDensityPolyline: Boolean = false, // Enable for navigation mode
    ) {
        viewModelScope.launch {
            android.util.Log.d("MapViewModel", "calculateRoute called: start=($startLat, $startLng), end=($endLat, $endLng), waypoints=${waypoints?.size ?: 0}, savedRoadIds=${savedRoadIds?.size ?: 0}, highDensity=$highDensityPolyline")
            // Clear previous routes before calculating new one
            if (clearExistingRoute) {
                _selectedRoute.value = null
            }
            _alternativeRoutes.value = emptyList()
            _routeState.value = RouteState.Loading

            // Update waypoints if provided
            waypoints?.let { _waypoints.value = it }

            val request = RouteCalculationRequest(
                startLat = startLat,
                startLng = startLng,
                endLat = endLat,
                endLng = endLng,
                waypoints = waypoints ?: _waypoints.value.ifEmpty { null },
                curvatureLevel = curvatureLevel,
                avoidOptions = avoidOptions,
                alternativeRoutes = false, // Alternative routes disabled
                savedRoadIds = savedRoadIds,
                pointsEncoded = !highDensityPolyline, // false = high density for navigation
                elevation = false,
                details = null,
            )
            
            android.util.Log.d("MapViewModel", "Route request details: start=($startLat, $startLng), end=($endLat, $endLng), curvature=$curvatureLevel, waypoints=${request.waypoints?.size ?: 0}, savedRoadIds=${request.savedRoadIds?.size ?: 0}")

            // Get authentication token (required for extra_curvy and saved roads)
            val token = _notificationContext?.let { context ->
                com.scenicroutes.app.data.local.TokenManager(context).token.first()
            }
            
            // For extra_curvy, require authentication
            if (curvatureLevel == "extra_curvy" && token == null) {
                _routeState.value = RouteState.Error("Authentication required for extra curvy routes. Please log in.")
                return@launch
            }

            val result = routeRepository.calculateRoute(request, token)

            result.fold(
                onSuccess = { response ->
                    android.util.Log.d("MapViewModel", "Route calculation successful. Route: ${response.route != null}")
                    response.route?.let { calculatedRoute ->
                        android.util.Log.d("MapViewModel", "Setting route with ${calculatedRoute.geometry.size} geometry points, distance=${calculatedRoute.distance}km")
                        if (calculatedRoute.geometry.isNotEmpty()) {
                            android.util.Log.d("MapViewModel", "First geometry point: ${calculatedRoute.geometry[0]}, Last: ${calculatedRoute.geometry[calculatedRoute.geometry.size - 1]}")
                        } else {
                            android.util.Log.e("MapViewModel", "WARNING: Route has empty geometry!")
                        }
                        _selectedRoute.value = calculatedRoute
                        _routeState.value = RouteState.Success(calculatedRoute)
                        android.util.Log.d("MapViewModel", "Route state updated. selectedRoute is now: ${_selectedRoute.value != null}")

                        // Show notification for route calculation complete
                        _notificationContext?.let { context ->
                            val notificationService = com.scenicroutes.app.data.service.NotificationService(context)
                            val startLocation = if (calculatedRoute.geometry.isNotEmpty()) {
                                val start = calculatedRoute.geometry.first()
                                if (start.size >= 2) "${String.format("%.2f", start[0])}, ${String.format("%.2f", start[1])}" else "Start"
                            } else {
                                "Start"
                            }
                            val endLocation = if (calculatedRoute.geometry.isNotEmpty()) {
                                val end = calculatedRoute.geometry.last()
                                if (end.size >= 2) "${String.format("%.2f", end[0])}, ${String.format("%.2f", end[1])}" else "End"
                            } else {
                                "End"
                            }
                            val distance = calculatedRoute.distance?.let { String.format("%.1f", it) } ?: "N/A"
                            notificationService.showRouteNotification(
                                title = "Route Ready",
                                message = "Your route from $startLocation to $endLocation is ready! Distance: $distance km",
                            )
                        }

                        // Save to route history
                        // Only save to history if route is valid (has geometry and distance > 0)
                        if (calculatedRoute.geometry.isNotEmpty() && calculatedRoute.distance > 0) {
                            routeHistoryManager?.let { manager ->
                                viewModelScope.launch {
                                    val startLocation = if (calculatedRoute.geometry.isNotEmpty()) {
                                        val start = calculatedRoute.geometry.first()
                                        if (start.size >= 2) {
                                            "${String.format("%.4f", start[0])}, ${String.format("%.4f", start[1])}"
                                        } else {
                                            "Start"
                                        }
                                    } else {
                                        "Start"
                                    }

                                    val endLocation = if (calculatedRoute.geometry.isNotEmpty()) {
                                        val end = calculatedRoute.geometry.last()
                                        if (end.size >= 2) {
                                            "${String.format("%.4f", end[0])}, ${String.format("%.4f", end[1])}"
                                        } else {
                                            "End"
                                        }
                                    } else {
                                        "End"
                                    }

                                    manager.addRoute(
                                        route = calculatedRoute,
                                        startLocation = startLocation,
                                        endLocation = endLocation,
                                        routeType = curvatureLevel,
                                        waypointsCount = waypoints?.size ?: _waypoints.value.size,
                                    )
                                }
                            }
                        } else {
                            android.util.Log.w("MapViewModel", "Not saving invalid route to history: geometry=${calculatedRoute.geometry.size}, distance=${calculatedRoute.distance}m")
                        }
                    } ?: run {
                        android.util.Log.w("MapViewModel", "No route in response")
                        _routeState.value = RouteState.Error("No route found")
                        // Log telemetry for failure
                        telemetryService?.logRouteCalculation(
                            curvatureLevel = curvatureLevel,
                            hasWaypoints = (waypoints ?: _waypoints.value).isNotEmpty(),
                            hasAlternatives = false,
                            success = false,
                            error = "No route found",
                        )
                    }

                    // Load weather for route (multiple points along route)
                    response.route?.let { calculatedRoute ->
                        loadWeatherForRoute(calculatedRoute)
                    }
                },
                onFailure = { error ->
                    val errorMessage = error.message ?: "Failed to calculate route"
                    android.util.Log.e("MapViewModel", "Route calculation failed: $errorMessage", error)
                    android.util.Log.e("MapViewModel", "Error type: ${error::class.simpleName}")
                    android.util.Log.e("MapViewModel", "Error stack trace: ${error.stackTraceToString()}")
                    _routeState.value = RouteState.Error(errorMessage)
                },
            )
        }
    }

    /**
     * Calculate approach route from current location to route start point
     * This is used for Phase 1 of two-phase navigation
     *
     * @return Pair of (Route, Instructions) or null if calculation fails
     */
    suspend fun calculateApproachRoute(
        currentLat: Double,
        currentLng: Double,
        routeStartLat: Double,
        routeStartLng: Double,
    ): Pair<Route, List<RouteInstruction>>? {
        android.util.Log.d("MapViewModel", "Calculating approach route: current=($currentLat, $currentLng), routeStart=($routeStartLat, $routeStartLng)")

        val request = RouteCalculationRequest(
            startLat = currentLat,
            startLng = currentLng,
            endLat = routeStartLat,
            endLng = routeStartLng,
            waypoints = null,
            curvatureLevel = "straight", // Use fastest route to get to start
            avoidOptions = null,
            alternativeRoutes = false, // Alternative routes disabled
            pointsEncoded = false, // High-density polyline for navigation accuracy
            elevation = false,
            details = null,
        )

        val result = routeRepository.calculateRoute(request)

        return result.fold(
            onSuccess = { response ->
                response.route?.let { route ->
                    android.util.Log.d("MapViewModel", "Approach route calculated: ${route.geometry.size} points, ${route.distance}km")
                    val instructions = response.route.instructions ?: emptyList()
                    Pair(route, instructions)
                }
            },
            onFailure = { error ->
                android.util.Log.e("MapViewModel", "Failed to calculate approach route: ${error.message}", error)
                null
            }
        )
    }

    fun calculateSegmentCurvatureRoute(
        startLat: Double,
        startLng: Double,
        endLat: Double,
        endLng: Double,
        segmentCurvature: List<String>,
        avoidOptions: AvoidOptions? = null,
        waypoints: List<Waypoint>? = null,
    ) {
        viewModelScope.launch {
            _routeState.value = RouteState.Loading

            // Log telemetry
            telemetryService?.logSegmentCurvatureCalculation(
                segmentCount = segmentCurvature.size,
                success = true,
            )

            val request = SegmentCurvatureRequest(
                startLat = startLat,
                startLng = startLng,
                endLat = endLat,
                endLng = endLng,
                waypoints = waypoints ?: _waypoints.value.ifEmpty { null },
                segmentCurvature = segmentCurvature,
                avoidOptions = avoidOptions,
            )

            val result = routeRepository.calculateSegmentCurvatureRoute(request)

            result.fold(
                onSuccess = { response ->
                    response.route?.let { calculatedRoute ->
                        _selectedRoute.value = calculatedRoute
                        _routeState.value = RouteState.Success(calculatedRoute)

                        // Log telemetry success
                        telemetryService?.logSegmentCurvatureCalculation(
                            segmentCount = segmentCurvature.size,
                            success = true,
                        )
                    } ?: run {
                        _routeState.value = RouteState.Error("No route found")
                        telemetryService?.logSegmentCurvatureCalculation(
                            segmentCount = segmentCurvature.size,
                            success = false,
                            error = "No route found",
                        )
                    }
                },
                onFailure = { error ->
                    _routeState.value = RouteState.Error(error.message ?: "Failed to calculate route")
                    telemetryService?.logSegmentCurvatureCalculation(
                        segmentCount = segmentCurvature.size,
                        success = false,
                        error = error.message ?: "Unknown error",
                    )
                },
            )
        }
    }

    fun loadWeather(lat: Double, lng: Double) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            _isLoadingWeather.value = true
            try {
                // Validate coordinates before making API call
                if (!lat.isFinite() || !lng.isFinite() || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    android.util.Log.e("MapViewModel", "Invalid coordinates for weather: lat=$lat, lng=$lng")
                    _isLoadingWeather.value = false
                    return@launch
                }
                val result = weatherRepository.getWeather(lat, lng)
                result.fold(
                    onSuccess = { weatherData ->
                        _weather.value = weatherData
                    },
                    onFailure = {
                        android.util.Log.e("MapViewModel", "Failed to load weather: ${it.message}")
                    },
                )
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Exception loading weather: ${e.message}", e)
            } finally {
                _isLoadingWeather.value = false
            }
        }
    }

    fun loadWeatherForRoute(roadId: Long) {
        viewModelScope.launch {
            _isLoadingRouteWeather.value = true
            val result = weatherRepository.getWeatherForRoad(roadId)
            result.fold(
                onSuccess = { weatherData ->
                    _routeWeather.value = weatherData
                },
                onFailure = {
                    android.util.Log.e("MapViewModel", "Failed to load route weather: ${it.message}")
                },
            )
            _isLoadingRouteWeather.value = false
        }
    }

    /**
     * Load weather for multiple points along a route
     * Samples points at regular intervals along the route path
     */
    fun loadWeatherForRoute(route: Route) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            _isLoadingRouteWeather.value = true
            try {
                if (route.geometry.isEmpty()) {
                    android.util.Log.w("MapViewModel", "Route geometry is empty, cannot load weather")
                    _isLoadingRouteWeather.value = false
                    return@launch
                }

                // Sample points along the route (start, 25%, 50%, 75%, end)
                val sampleIndices = listOf(
                    0,
                    route.geometry.size / 4,
                    route.geometry.size / 2,
                    (route.geometry.size * 3) / 4,
                    route.geometry.size - 1,
                ).distinct().filter { it < route.geometry.size }

                val weatherResults = mutableListOf<Weather>()

                // Fetch weather for each sample point
                sampleIndices.forEach { index ->
                    val point = route.geometry[index]
                    if (point.size >= 2) {
                        val lat = point[0]
                        val lng = point[1]
                        // Validate coordinates are valid numbers
                        if (lat.isFinite() && lng.isFinite() && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                            val result = weatherRepository.getWeather(lat, lng)
                            result.fold(
                                onSuccess = { weather ->
                                    weatherResults.add(weather)
                                },
                                onFailure = {
                                    // Continue even if one point fails
                                    android.util.Log.w("MapViewModel", "Failed to get weather for point $index (lat=$lat, lng=$lng): ${it.message}")
                                },
                            )
                        } else {
                            android.util.Log.w("MapViewModel", "Invalid coordinates for point $index: lat=$lat, lng=$lng")
                        }
                    } else {
                        android.util.Log.w("MapViewModel", "Point $index has insufficient coordinates: ${point.size}")
                    }
                }

                // Use average weather or first successful result
                if (weatherResults.isNotEmpty()) {
                    val avgTemp = weatherResults.mapNotNull { it.temperature }.average()
                    val descriptions = weatherResults.mapNotNull { it.description }.distinct()
                    val avgWind = weatherResults.mapNotNull { it.wind_speed }.takeIf { it.isNotEmpty() }?.average()

                    _routeWeather.value = Weather(
                        temperature = avgTemp,
                        condition = descriptions.firstOrNull() ?: "Clear",
                        description = descriptions.firstOrNull() ?: "Clear",
                        wind_speed = avgWind,
                        humidity = weatherResults.firstOrNull()?.humidity,
                    )
                } else {
                    // Fallback to midpoint
                    val midpointIndex = route.geometry.size / 2
                    if (midpointIndex < route.geometry.size) {
                        val midpoint = route.geometry[midpointIndex]
                        if (midpoint.size >= 2) {
                            val lat = midpoint[0]
                            val lng = midpoint[1]
                            if (lat.isFinite() && lng.isFinite() && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                loadWeather(lat, lng)
                            } else {
                                android.util.Log.w("MapViewModel", "Midpoint has invalid coordinates: lat=$lat, lng=$lng")
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Error loading weather for route: ${e.message}", e)
            } finally {
                _isLoadingRouteWeather.value = false
            }
        }
    }

    fun calculateRoundTrip(
        centerLat: Double,
        centerLng: Double,
        distance: Double,
        curvatureLevel: String? = null,
        waypoints: List<Waypoint>? = null,
        savedRoadIds: List<Long>? = null, // IDs of saved roads to include in round trip
    ) {
        viewModelScope.launch {
            _routeState.value = RouteState.Loading

            // Get authentication token for round trip (required by backend)
            val token = _notificationContext?.let { context ->
                com.scenicroutes.app.data.local.TokenManager(context).token.first()
            }

            if (token == null) {
                _routeState.value = RouteState.Error("Authentication required for round trip. Please log in.")
                return@launch
            }

            android.util.Log.d("MapViewModel", "calculateRoundTrip: center=($centerLat, $centerLng), distance=$distance km, curvature=$curvatureLevel, waypoints=${waypoints?.size ?: 0}, savedRoadIds=${savedRoadIds?.size ?: 0}")

            val request = RoundTripRequest(
                startLat = centerLat,
                startLon = centerLng,
                distanceKm = distance,
                curvatureLevel = curvatureLevel,
                waypoints = waypoints,
                savedRoadIds = savedRoadIds,
            )

            val result = routeRepository.calculateRoundTrip(request, token)

            result.fold(
                onSuccess = { response ->
                    response.route?.let { calculatedRoute ->
                        // Validate route before using it
                        if (calculatedRoute.geometry.isNotEmpty() && calculatedRoute.distance > 0) {
                            _selectedRoute.value = calculatedRoute
                            _routeState.value = RouteState.Success(calculatedRoute)
                            
                            // Save round trip to route history
                            routeHistoryManager?.let { manager ->
                                viewModelScope.launch {
                                    val startLocation = if (calculatedRoute.geometry.isNotEmpty()) {
                                        val start = calculatedRoute.geometry.first()
                                        if (start.size >= 2) {
                                            "${String.format("%.4f", start[0])}, ${String.format("%.4f", start[1])}"
                                        } else {
                                            "Start"
                                        }
                                    } else {
                                        "Start"
                                    }

                                    val endLocation = if (calculatedRoute.geometry.isNotEmpty()) {
                                        val end = calculatedRoute.geometry.last()
                                        if (end.size >= 2) {
                                            "${String.format("%.4f", end[0])}, ${String.format("%.4f", end[1])}"
                                        } else {
                                            "End"
                                        }
                                    } else {
                                        "End"
                                    }

                                    manager.addRoute(
                                        route = calculatedRoute,
                                        startLocation = startLocation,
                                        endLocation = endLocation,
                                        routeType = curvatureLevel ?: "round_trip",
                                        waypointsCount = 0,
                                    )
                                    android.util.Log.d("MapViewModel", "Round trip saved to route history")
                                }
                            }
                        } else {
                            android.util.Log.w("MapViewModel", "Round trip calculation returned invalid route: geometry=${calculatedRoute.geometry.size}, distance=${calculatedRoute.distance}m")
                            _routeState.value = RouteState.Error("Invalid route returned: no geometry or zero distance")
                        }
                    } ?: run {
                        _routeState.value = RouteState.Error("No route found")
                    }
                },
                onFailure = { error ->
                    android.util.Log.e("MapViewModel", "Round trip calculation failed: ${error.message}")
                    _routeState.value = RouteState.Error(error.message ?: "Failed to calculate route")
                },
            )
        }
    }

    fun searchPOIs(lat: Double, lng: Double, radius: Double = 5.0, type: String? = null) {
        viewModelScope.launch {
            val result = poiRepository.searchPOIs(lat, lng, radius, type)
            result.fold(
                onSuccess = { poiList ->
                    _pois.value = poiList
                },
                onFailure = {
                    // Handle error silently or show toast
                },
            )
        }
    }

    fun addWaypoint(lat: Double, lng: Double, name: String? = null) {
        val newWaypoints = _waypoints.value + Waypoint(lat, lng, name)
        _waypoints.value = newWaypoints
        // Log telemetry
        telemetryService?.logWaypointAdded(newWaypoints.size)
    }

    fun removeWaypoint(index: Int) {
        val newWaypoints = _waypoints.value.toMutableList()
        newWaypoints.removeAt(index)
        _waypoints.value = newWaypoints
    }

    fun clearRoute() {
        _selectedRoute.value = null
        _routeState.value = RouteState.Idle
        _waypoints.value = emptyList()
    }

    fun clearPOIs() {
        _pois.value = emptyList()
    }

    fun clearRoadSearch() {
        _searchRoads.value = emptyList()
    }

    fun clearAll() {
        clearRoute()
        clearPOIs()
        clearSearchResults()
        clearRoadSearch()
    }

    fun searchLocation(query: String) {
        if (query.isBlank()) {
            _searchResults.value = emptyList()
            return
        }

        viewModelScope.launch {
            _isSearching.value = true
            val results = geocodingService.searchLocation(query)
            _searchResults.value = results
            _isSearching.value = false
        }
    }

    fun clearSearchResults() {
        _searchResults.value = emptyList()
    }

    suspend fun geocodeAddress(address: String): GeocodeResult? {
        return geocodingService.searchLocation(address).firstOrNull()
    }

    /**
     * Search for actual roads in the road network (OpenStreetMap via Overpass API)
     * This is the main "Find Roads" feature - searches for curved/scenic roads matching parameters
     */
    fun searchRoads(
        lat: Double,
        lon: Double,
        radius: Double = 5.0,
        roadType: String = "all",
        curvatureType: String = "all",
        lengthFilter: String = "all",
        minRating: Double? = null,
        sortBy: String = "distance",
    ) {
        viewModelScope.launch {
            android.util.Log.d("MapViewModel", "searchRoads (road network) called: lat=$lat, lon=$lon, radius=$radius, roadType=$roadType, curvatureType=$curvatureType, lengthFilter=$lengthFilter")
            _isSearchingRoads.value = true
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                // Map roadType to API type parameter
                val apiRoadType = when (roadType) {
                    "Primary" -> "primary"
                    "Secondary" -> "secondary"
                    else -> "all"
                }

                // Use searchRoadNetwork to search actual road network (not saved roads)
                val response = try {
                    apiService.searchRoadNetwork(
                        lat = lat,
                        lon = lon,
                        radius = radius,
                        type = apiRoadType,
                    )
                } catch (e: Exception) {
                    android.util.Log.e("MapViewModel", "Road network search API call failed: ${e.message}", e)
                    _isSearchingRoads.value = false
                    _searchRoads.value = emptyList()
                    return@launch
                }
                
                android.util.Log.d("MapViewModel", "Road network search response: code=${response.code()}, isSuccessful=${response.isSuccessful}, hasBody=${response.body() != null}")
                
                if (response.isSuccessful && response.body() != null) {
                    try {
                        var roads = response.body()!!

                        // Client-side filtering by curvature
                        if (curvatureType != "all") {
                            roads = roads.filter { road: com.scenicroutes.app.data.model.RoadNetworkSearch ->
                                when (curvatureType) {
                                    "mellow" -> road.twistiness < 0.0035
                                    "moderate" -> road.twistiness >= 0.0035 && road.twistiness < 0.007
                                    "curvy" -> road.twistiness >= 0.007
                                    else -> true
                                }
                            }
                        }

                        // Client-side filtering by length
                        if (lengthFilter != "all") {
                            roads = roads.filter { road: com.scenicroutes.app.data.model.RoadNetworkSearch ->
                                val lengthKm = road.length / 1000.0
                                when (lengthFilter) {
                                    "short" -> lengthKm < 10
                                    "medium" -> lengthKm >= 10 && lengthKm < 50
                                    "long" -> lengthKm >= 50
                                    else -> true
                                }
                            }
                        }

                        // Client-side sorting
                        val sortedRoads = when (sortBy) {
                            "twistiness" -> roads.sortedByDescending { it.twistiness }
                            "distance" -> roads.sortedByDescending { it.length }
                            "name" -> roads.sortedBy { it.name }
                            else -> roads.sortedByDescending { it.length } // Default: distance
                        }

                        _searchRoads.value = sortedRoads
                        android.util.Log.d("MapViewModel", "Updated searchRoads with ${sortedRoads.size} valid roads (out of ${response.body()!!.size} total)")

                        // Save to search history
                        searchHistoryManager?.let { manager ->
                            viewModelScope.launch {
                                manager.addSearch(
                                    query = null, // Road search doesn't have a text query
                                    lat = lat,
                                    lon = lon,
                                    radius = radius,
                                    roadType = roadType,
                                    curvatureType = curvatureType,
                                )
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("MapViewModel", "Failed to parse road network response: ${e.message}", e)
                        _searchRoads.value = emptyList()
                        _notificationContext?.let { ctx ->
                            val notificationService = com.scenicroutes.app.data.service.NotificationService(ctx)
                            notificationService.showGeneralNotification(
                                title = "API Error",
                                message = "Received malformed data from the server. Please try again later."
                            )
                        }
                    }
                } else {
                    // Handle error response - might be a string or JSON
                    val errorBody = try {
                        response.errorBody()?.string()
                    } catch (e: Exception) {
                        "Unable to read error body: ${e.message}"
                    }
                    android.util.Log.w("MapViewModel", "Road network search failed: ${response.code()} ${response.message()}")
                    android.util.Log.w("MapViewModel", "Error body: $errorBody")
                    _searchRoads.value = emptyList()
                    
                    // Extract user-friendly error message from JSON or raw response
                    val userMessage = try {
                        if (errorBody?.contains("\"error\"") == true) {
                            // Try to parse JSON error message
                            val jsonObject = org.json.JSONObject(errorBody)
                            jsonObject.optString("error", response.message())
                        } else {
                            errorBody ?: response.message() ?: "Unknown error"
                        }
                    } catch (e: Exception) {
                        errorBody ?: response.message() ?: "Unknown error"
                    }
                    
                    // Show error notification if available
                    _notificationContext?.let { ctx ->
                        android.util.Log.d("MapViewModel", "Showing notification for error: code=${response.code()}, message=$userMessage")
                        val notificationService = com.scenicroutes.app.data.service.NotificationService(ctx)
                        
                        // Determine title based on error type
                        val title = when {
                            response.code() == 504 || userMessage.contains("overloaded", ignoreCase = true) -> "API Temporarily Unavailable"
                            response.code() == 503 -> "Service Unavailable"
                            response.code() == 500 -> "Server Error"
                            else -> "Road Search Failed"
                        }
                        
                        // Suggest action based on error type
                        val message = when {
                            response.code() == 504 || userMessage.contains("overloaded", ignoreCase = true) -> 
                                userMessage + "\n\nTip: Try reducing the search radius or retry in a few minutes."
                            else -> 
                                userMessage
                        }
                        
                        android.util.Log.d("MapViewModel", "Notification: title='$title', message='$message'")
                        notificationService.showGeneralNotification(
                            title = title,
                            message = message
                        )
                        if (response.code() == 504 || userMessage.contains("overloaded", ignoreCase = true)) {
                            android.widget.Toast.makeText(
                                ctx,
                                "Road search is temporarily overloaded. Try again in a few minutes or shrink the search radius.",
                                android.widget.Toast.LENGTH_LONG,
                            ).show()
                        }
                        android.util.Log.d("MapViewModel", "Notification shown successfully")
                    } ?: run {
                        android.util.Log.w("MapViewModel", "Cannot show notification: _notificationContext is null")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Error searching road network: ${e.message}", e)
                android.util.Log.e("MapViewModel", "Error type: ${e::class.simpleName}")
                android.util.Log.e("MapViewModel", "Error stack trace: ${e.stackTraceToString()}")
                _searchRoads.value = emptyList()
                // Show error notification
                _notificationContext?.let { ctx ->
                    val notificationService = com.scenicroutes.app.data.service.NotificationService(ctx)
                    notificationService.showGeneralNotification(
                        title = "Road Search Error",
                        message = "Error searching roads: ${e.message ?: "Unknown error"}"
                    )
                }
            } finally {
                _isSearchingRoads.value = false
            }
        }
    }

    /**
     * Search for community/public saved roads (user-created roads marked as public)
     * This is separate from road network search - used for "Community Roads" feature
     */
    fun searchCommunityRoads(
        lat: Double? = null,
        lon: Double? = null,
        radius: Double? = null,
        country: String? = null,
        region: String? = null,
        location: String? = null,
        minRating: Double? = null,
        tags: List<Long>? = null,
        lengthFilter: String? = null,
        curvinessFilter: String? = null,
        sortBy: String? = null,
    ) {
        viewModelScope.launch {
            android.util.Log.d("MapViewModel", "searchCommunityRoads called: lat=$lat, lon=$lon, radius=$radius, country=$country, region=$region, location=$location")
            _isSearchingCommunityRoads.value = true
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val response = apiService.getPublicRoads(
                    lat = lat,
                    lng = lon,
                    radius = radius,
                    country = country,
                    region = region,
                    location = location,
                    tags = tags?.joinToString(","),
                    lengthFilter = lengthFilter,
                    curvinessFilter = curvinessFilter,
                    minRating = minRating,
                    sortBy = sortBy,
                )
                android.util.Log.d("MapViewModel", "Community roads search response: isSuccessful=${response.isSuccessful}, body=${response.body()?.roads?.size ?: 0} roads")
                if (response.isSuccessful && response.body() != null) {
                    val roadsResponse = response.body()!!
                    _communityRoads.value = roadsResponse.roads
                    android.util.Log.d("MapViewModel", "Updated communityRoads with ${roadsResponse.roads.size} roads (total_count=${roadsResponse.total_count})")
                } else {
                    // Handle error response
                    val errorBody = try {
                        response.errorBody()?.string()
                    } catch (e: Exception) {
                        "Unable to read error body"
                    }
                    android.util.Log.w("MapViewModel", "Community roads search failed: ${response.code()} ${response.message()}")
                    android.util.Log.w("MapViewModel", "Error body: $errorBody")
                    _communityRoads.value = emptyList()
                    
                    // Extract user-friendly error message
                    val userMessage = try {
                        if (errorBody?.contains("\"error\"") == true) {
                            JSONObject(errorBody).optString("error", response.message())
                        } else {
                            errorBody ?: response.message() ?: "Unknown error"
                        }
                    } catch (e: Exception) {
                        response.message() ?: "Unknown error"
                    }
                    
                    // Show error notification if available
                    _notificationContext?.let { ctx ->
                        val notificationService = com.scenicroutes.app.data.service.NotificationService(ctx)
                        val title = when {
                            response.code() == 504 -> "API Temporarily Unavailable"
                            response.code() == 503 -> "Service Unavailable"
                            else -> "Community Search Failed"
                        }
                        notificationService.showGeneralNotification(
                            title = title,
                            message = userMessage
                        )
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Error searching community roads: ${e.message}", e)
                _communityRoads.value = emptyList()
                // Show error notification
                _notificationContext?.let { ctx ->
                    val notificationService = com.scenicroutes.app.data.service.NotificationService(ctx)
                    notificationService.showGeneralNotification(
                        title = "Search Error",
                        message = "Error searching roads: ${e.message ?: "Unknown error"}"
                    )
                }
            } finally {
                _isSearchingCommunityRoads.value = false
            }
        }
    }

    // Save route state
    private val _saveRouteState = MutableStateFlow<SaveRouteState>(SaveRouteState.Idle)
    val saveRouteState: StateFlow<SaveRouteState> = _saveRouteState.asStateFlow()

    fun saveRouteAsRoad(
        token: String,
        route: Route,
        name: String,
        isPublic: Boolean = false,
        tags: List<Long>? = null,
    ) {
        viewModelScope.launch {
            android.util.Log.d("MapViewModel", "=== SAVE ROUTE STARTED ===")
            android.util.Log.d("MapViewModel", "Route name: $name, isPublic: $isPublic, tags: $tags")
            android.util.Log.d("MapViewModel", "Route geometry points: ${route.geometry.size}, distance: ${route.distance}m")

            _saveRouteState.value = SaveRouteState.Saving

            // Convert distance from meters to km for backend
            // Backend expects distance in km and will convert to meters (length field)
            val distanceKm = route.distance / 1000.0
            android.util.Log.d("MapViewModel", "Converting distance: ${route.distance}m → ${distanceKm}km")

            val request = SavedRoadRequest(
                road_name = name,
                start_location = "Start",
                end_location = "End",
                geometry = route.geometry,
                distance = distanceKm,
                duration = route.time,
                is_public = isPublic,
                tags = tags,
            )

            val result = savedRoadRepository.saveRoad(token, request)
            result.fold(
                onSuccess = { savedRoad ->
                    android.util.Log.d("MapViewModel", "=== ROUTE SAVED SUCCESSFULLY ===")
                    android.util.Log.d("MapViewModel", "Saved road ID: ${savedRoad.id}, name: ${savedRoad.road_name}")
                    android.util.Log.d("MapViewModel", "User should now navigate to 'My Roads' to see this road")
                    _saveRouteState.value = SaveRouteState.Success(savedRoad)
                    // Reset to idle after 2 seconds
                    kotlinx.coroutines.delay(2000)
                    _saveRouteState.value = SaveRouteState.Idle
                },
                onFailure = { error ->
                    android.util.Log.e("MapViewModel", "=== ROUTE SAVE FAILED ===")
                    android.util.Log.e("MapViewModel", "Error: ${error.message}", error)
                    _saveRouteState.value = SaveRouteState.Error(error.message ?: "Failed to save route")
                    // Reset to idle after 3 seconds
                    kotlinx.coroutines.delay(3000)
                    _saveRouteState.value = SaveRouteState.Idle
                },
            )
        }
    }

    fun saveRoadFromSearch(
        token: String,
        road: SavedRoad,
    ) {
        viewModelScope.launch {
            // If the road already has an ID and user_id, it might already be saved
            // But we can still save it as a new saved road for the current user
            val request = SavedRoadRequest(
                road_name = road.road_name,
                start_location = road.start_location,
                end_location = road.end_location,
                geometry = road.geometry ?: emptyList(),
                distance = road.distance,
                duration = road.duration,
                is_public = false,
                tags = road.tags?.map { it.id },
            )

            val result = savedRoadRepository.saveRoad(token, request)
            result.fold(
                onSuccess = {
                    android.util.Log.d("MapViewModel", "Road saved successfully: ${road.road_name}")
                },
                onFailure = { error ->
                    android.util.Log.e("MapViewModel", "Failed to save road: ${error.message}", error)
                },
            )
        }
    }

    /**
     * Save a road from road network search (RoadNetworkSearch) to user's saved roads
     */
    fun saveRoadNetworkSearch(
        token: String,
        road: com.scenicroutes.app.data.model.RoadNetworkSearch,
    ) {
        viewModelScope.launch {
            // Extract start and end locations from coordinates
            val startLocation = if (road.coordinates.isNotEmpty()) {
                val start = road.coordinates.first()
                "${String.format("%.4f", start[0])}, ${String.format("%.4f", start[1])}"
            } else {
                "Start"
            }

            val endLocation = if (road.coordinates.isNotEmpty()) {
                val end = road.coordinates.last()
                "${String.format("%.4f", end[0])}, ${String.format("%.4f", end[1])}"
            } else {
                "End"
            }

            // Convert length from meters to kilometers for distance
            val distanceKm = road.length / 1000.0

            // Estimate duration based on average speed (assuming 60 km/h average)
            val estimatedDuration = (distanceKm / 60.0 * 3600.0).toLong() // in seconds

            val request = SavedRoadRequest(
                road_name = road.name,
                start_location = startLocation,
                end_location = endLocation,
                geometry = road.coordinates,
                distance = distanceKm,
                duration = estimatedDuration,
                is_public = false,
                tags = null,
            )

            val result = savedRoadRepository.saveRoad(token, request)
            result.fold(
                onSuccess = {
                    android.util.Log.d("MapViewModel", "Road network search result saved successfully: ${road.name}")
                },
                onFailure = { error ->
                    android.util.Log.e("MapViewModel", "Failed to save road network search result: ${error.message}", error)
                },
            )
        }
    }

    /**
     * Get full road details including reviews and comments
     */
    suspend fun getRoadDetails(token: String, roadId: Long): Result<SavedRoad> {
        return savedRoadRepository.getSavedRoad(token, roadId)
    }

    /**
     * Add review to a road
     */
    fun addRoadReview(
        token: String,
        roadId: Long,
        rating: Int,
        comment: String? = null,
    ) {
        viewModelScope.launch {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val request = com.scenicroutes.app.data.api.ReviewRequest(
                    rating = rating,
                    comment = comment,
                )
                val response = apiService.addReview(token, roadId, request)
                if (response.isSuccessful) {
                    android.util.Log.d("MapViewModel", "Review added successfully")
                } else {
                    android.util.Log.e("MapViewModel", "Failed to add review: ${response.code()}")
                }
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Error adding review: ${e.message}", e)
            }
        }
    }

    /**
     * Add comment to a road
     */
    fun addRoadComment(
        token: String,
        roadId: Long,
        comment: String,
    ) {
        viewModelScope.launch {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val request = com.scenicroutes.app.data.api.CommentRequest(comment = comment)
                val response = apiService.addComment(token, roadId, request)
                if (response.isSuccessful) {
                    android.util.Log.d("MapViewModel", "Comment added successfully")
                } else {
                    android.util.Log.e("MapViewModel", "Failed to add comment: ${response.code()}")
                }
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Error adding comment: ${e.message}", e)
            }
        }
    }

    /**
     * Share a route
     */
    fun shareRoute(
        token: String?,
        route: Route,
        routeName: String = "Shared Route",
        routeDescription: String? = null,
    ) {
        viewModelScope.launch {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val routeData = mapOf(
                    "coordinates" to route.geometry,
                    "distance" to route.distance,
                    "time" to route.time,
                )
                val request = com.scenicroutes.app.data.api.RouteShareRequest(
                    route = routeData,
                    route_name = routeName,
                    route_description = routeDescription,
                )
                val response = if (token != null) {
                    apiService.shareRoute(token, request)
                } else {
                    apiService.shareRoute(null, request)
                }
                if (response.isSuccessful) {
                    val shareResponse = response.body()
                    val shareUrl = shareResponse?.get("share_url") as? String ?: shareResponse?.get("url") as? String
                    android.util.Log.d("MapViewModel", "Route shared: $shareUrl")
                } else {
                    android.util.Log.e("MapViewModel", "Failed to share route: ${response.code()}")
                }
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Error sharing route: ${e.message}", e)
            }
        }
    }

    /**
     * Update a saved road
     */
    fun updateRoad(
        token: String,
        roadId: Long,
        roadName: String,
        isPublic: Boolean,
    ) {
        viewModelScope.launch {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                // First get the road to preserve geometry
                val getResponse = apiService.getSavedRoad("Bearer $token", roadId)
                if (getResponse.isSuccessful && getResponse.body() != null) {
                    val existingRoad = getResponse.body()!!
                    val request = com.scenicroutes.app.data.model.SavedRoadRequest(
                        road_name = roadName,
                        start_location = existingRoad.start_location,
                        end_location = existingRoad.end_location,
                        geometry = existingRoad.geometry ?: emptyList(),
                        distance = existingRoad.distance,
                        duration = existingRoad.duration,
                        is_public = isPublic,
                        tags = existingRoad.tags?.map { tag: com.scenicroutes.app.data.model.Tag -> tag.id },
                    )
                    val updateResponse = apiService.updateSavedRoad("Bearer $token", roadId, request)
                    if (updateResponse.isSuccessful) {
                        android.util.Log.d("MapViewModel", "Road updated successfully")
                    } else {
                        android.util.Log.e("MapViewModel", "Failed to update road: ${updateResponse.code()}")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("MapViewModel", "Error updating road: ${e.message}", e)
            }
        }
    }
}

sealed class RouteState {
    object Idle : RouteState()
    object Loading : RouteState()
    data class Success(val route: Route) : RouteState()
    data class Error(val message: String) : RouteState()
}

sealed class SaveRouteState {
    object Idle : SaveRouteState()
    object Saving : SaveRouteState()
    data class Success(val savedRoad: SavedRoad) : SaveRouteState()
    data class Error(val message: String) : SaveRouteState()
}
