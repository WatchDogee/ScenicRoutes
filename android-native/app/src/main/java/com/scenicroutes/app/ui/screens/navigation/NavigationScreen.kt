package com.scenicroutes.app.ui.screens.navigation

import android.graphics.Point
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.data.model.RouteInstruction
import com.scenicroutes.app.data.service.FeatureAccessService
import com.scenicroutes.app.data.service.NavigationService
import com.scenicroutes.app.data.service.RerouteState
import com.scenicroutes.app.ui.components.FeatureGate
import com.scenicroutes.app.ui.components.OSMMapView
import com.scenicroutes.app.ui.components.* // Import all extension functions including addRoute
import com.scenicroutes.app.ui.viewmodel.MapViewModel
import com.scenicroutes.app.utils.SettingsManager
import com.scenicroutes.app.utils.DistanceFormatter
import com.scenicroutes.app.utils.calculateHaversineDistance
import com.scenicroutes.app.BuildConfig
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationScreen(
    navController: NavController,
    onNavigateBack: () -> Unit = { navController.popBackStack() },
) {
    // Use activity-scoped ViewModel to share state with MapScreen
    val context = LocalContext.current
    val activity = context as? androidx.activity.ComponentActivity
    val viewModel: MapViewModel = if (activity != null) {
        viewModel(viewModelStoreOwner = activity)
    } else {
        viewModel() // Fallback to default scoping
    }
    val selectedRoute by viewModel.selectedRoute.collectAsState()
    val routeState by viewModel.routeState.collectAsState()

    android.util.Log.d("NavigationScreen", "NavigationScreen created, selectedRoute: ${selectedRoute != null}")
    if (selectedRoute != null) {
        android.util.Log.d("NavigationScreen", "Route found: distance=${selectedRoute!!.distance}m, geometry points=${selectedRoute!!.geometry.size}")
    }

    // If no route is selected, show loading state
    val route = selectedRoute ?: run {
        android.util.Log.w("NavigationScreen", "No route selected")
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Navigation") },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                        }
                    },
                )
            },
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    CircularProgressIndicator()
                    Text(
                        text = "Loading route for navigation...",
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
            }
        }
        return
    }

    val routeWithInstructions = remember(route) {
        if (route.instructions.isNullOrEmpty() && route.geometry.isNotEmpty()) {
            // Generate simple instructions from geometry
            val generatedInstructions = mutableListOf<RouteInstruction>()
            var totalDistance = 0.0
            var segmentStartIndex = 0

            // Create instructions at major direction changes
            for (i in 1 until route.geometry.size - 1) {
                val prev = route.geometry[i - 1]
                val curr = route.geometry[i]
                val next = route.geometry[i + 1]

                if (prev.size >= 2 && curr.size >= 2 && next.size >= 2) {
                    val bearing1 = calculateBearing(prev[0], prev[1], curr[0], curr[1])
                    val bearing2 = calculateBearing(curr[0], curr[1], next[0], next[1])
                    val angleChange = Math.abs(bearing2 - bearing1)
                    val normalizedAngle = if (angleChange > 180.0) 360.0 - angleChange else angleChange

                    // Create instruction at significant turns (> 30 degrees)
                    if (normalizedAngle > 30) {
                        val segmentDistance = calculateSegmentDistance(route.geometry, segmentStartIndex, i)
                        totalDistance += segmentDistance
                        val instructionText = when {
                            normalizedAngle > 150 -> "Turn around"
                            normalizedAngle > 90 -> if (bearing2 > bearing1) "Turn right" else "Turn left"
                            normalizedAngle > 60 -> if (bearing2 > bearing1) "Bear right" else "Bear left"
                            else -> "Continue"
                        }
                        generatedInstructions.add(
                            RouteInstruction(
                                text = instructionText,
                                distance = segmentDistance,
                                time = (segmentDistance / 1000.0 / 60.0 * 3600.0 * 1000).toLong(),
                                geometry = null,
                            )
                        )
                        segmentStartIndex = i
                    }
                }
            }

            // Add final instruction
            if (segmentStartIndex < route.geometry.size - 1) {
                val finalDistance = calculateSegmentDistance(route.geometry, segmentStartIndex, route.geometry.size - 1)
                totalDistance += finalDistance
                generatedInstructions.add(
                    RouteInstruction(
                        text = "Arrive at destination",
                        distance = finalDistance,
                        time = (finalDistance / 1000.0 / 60.0 * 3600.0 * 1000).toLong(),
                        geometry = null,
                    )
                )
            }

            // If no significant turns, create a simple "Continue" instruction
            if (generatedInstructions.isEmpty()) {
                generatedInstructions.add(
                    RouteInstruction(
                        text = "Continue straight",
                        distance = route.distance,
                        time = route.time,
                        geometry = null,
                    )
                )
            }

            route.copy(instructions = generatedInstructions)
        } else {
            route
        }
    }

    val navigationService = remember { NavigationService(context) }
    val featureAccessService = remember { FeatureAccessService(context) }
    val coroutineScope = rememberCoroutineScope()

    val currentLocation by navigationService.currentLocation.collectAsState()
    val currentBearing by navigationService.currentBearing.collectAsState()
    val currentInstructionIndex by navigationService.currentInstructionIndex.collectAsState()
    val navigationUIState by navigationService.navigationUIState.collectAsState()
    val distanceToNextTurn by navigationService.distanceToNextTurn.collectAsState()
    val distanceRemaining by navigationService.distanceRemaining.collectAsState()
    val isNavigating by navigationService.isNavigating.collectAsState()
    val navigationPhase by navigationService.navigationPhase.collectAsState()
    val distanceToRouteStart by navigationService.distanceToRouteStart.collectAsState()
    val approachRouteGeometry by navigationService.approachRouteGeometry.collectAsState()
    val scenicRouteGeometry by navigationService.scenicRouteGeometry.collectAsState()
    val currentSpeed by navigationService.currentSpeed.collectAsState()
    val currentSpeedLimit by navigationService.currentSpeedLimit.collectAsState()
    
    // Rerouting state
    val isOffRoute by navigationService.isOffRoute.collectAsState()
    val offRouteDistance by navigationService.offRouteDistance.collectAsState()
    val isRerouting by navigationService.isRerouting.collectAsState()
    val rerouteState by navigationService.rerouteState.collectAsState()
    val directPathGeometry by navigationService.directPathGeometry.collectAsState()

    var isMuted by remember { mutableStateOf(false) }
    var hasAccess by remember { mutableStateOf(false) }
    var mapViewRef by remember { mutableStateOf<MapView?>(null) }
    // Pixel offset to position marker in lower map area, above bottom ETA card
    val centerOffsetPx = with(LocalDensity.current) { 180.dp.toPx().toInt() }
    var showPermissionDialog by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) } // For expandable FAB menu
    var rerouteStatus by remember { mutableStateOf<String?>(null) } // For reroute feedback banners
    var shouldFollowUser by remember { mutableStateOf(true) } // Auto-follow user during navigation
    var isProgrammaticMove by remember { mutableStateOf(false) } // Track if we're doing a programmatic setCenter

    // Background ride recording
    val backgroundRecordingManager = remember { com.scenicroutes.app.data.service.BackgroundRideRecordingManager(context) }
    val isBackgroundRecording by backgroundRecordingManager.isRecording.collectAsState()
    val recordingElapsedTime by backgroundRecordingManager.elapsedTime.collectAsState()
    var showSaveRecordingDialog by remember { mutableStateOf(false) }
    var showStartRecordingDialog by remember { mutableStateOf(false) } // Ask user to record when starting nav
    var wasRecordingBeforeNavigation by remember { mutableStateOf(false) } // Track if recording before nav started
    var showPostSaveChoice by remember { mutableStateOf(false) } // After save: Continue vs Exit
    var showDiscardConfirm by remember { mutableStateOf(false) } // Confirm discarding unsaved recording
    var pendingRecordedRide by remember { mutableStateOf<com.scenicroutes.app.data.service.BackgroundRecordedRide?>(null) }
    var rideName by remember { mutableStateOf("") }
    var isSavingRide by remember { mutableStateOf(false) }
    var showNavigationSummary by remember { mutableStateOf(false) }
    var navigationStartTime by remember { mutableStateOf(System.currentTimeMillis()) }
    
    // Debug rerouting test state
    val isDebugBuild = BuildConfig.DEBUG
    var isDebugTesting by remember { mutableStateOf(false) }
    var debugTestStage by remember { mutableStateOf(0) }
    var debugTestMessage by remember { mutableStateOf("") }
    var showDebugOverlay by remember { mutableStateOf(false) }
    var manualLatInput by remember { mutableStateOf("") }
    var manualLonInput by remember { mutableStateOf("") }

    val currentInstruction = routeWithInstructions.instructions?.getOrNull(currentInstructionIndex)

    // Automated Debug Test Function
    suspend fun runAutomatedRerouteTest() {
        isDebugTesting = true
        showDebugOverlay = true
        val currentLoc = navigationService.currentLocation.value
        
        if (currentLoc == null) {
            debugTestMessage = "❌ No GPS location - start navigation first"
            kotlinx.coroutines.delay(3000)
            isDebugTesting = false
            return
        }
        
        // Stop car simulation if running - it blocks reroute logic
        if (navigationService.isSimulating()) {
            android.util.Log.d("NavigationScreen", "Stopping car simulation for debug test")
            navigationService.stopSimulation()
            kotlinx.coroutines.delay(1000) // Let it fully stop
        }

        try {
            // Test 1: Stage 1 - Minor Drift (< 75m) - Gradual movement
            debugTestStage = 1
            debugTestMessage = "🧪 TEST 1/3: Minor Drift (~55m)\nGradually moving off-route..."
            kotlinx.coroutines.delay(2000)
            
            // Move in 5 steps to 55m (11m per step) at ~60 km/h = 16.7 m/s
            val stepLat1 = 0.0001  // ~11m per step
            for (step in 1..5) {
                navigationService.injectMockLocation(
                    currentLoc.latitude + (stepLat1 * step),
                    currentLoc.longitude,
                    currentLoc.altitude,
                    16.7f,  // 60 km/h
                    currentBearing ?: 0f
                )
                kotlinx.coroutines.delay(650)  // Smooth movement
            }
            
            debugTestMessage = "✓ Stage 1: Moved 55m off-route\n⏳ Waiting 9s for detection..."
            kotlinx.coroutines.delay(9000)  // Wait for 8s off-route + 1s buffer
            
            debugTestMessage = if (rerouteState == RerouteState.CLOSEST_POINT_RECOVERY || rerouteState == RerouteState.NONE) {
                "✅ PASS: Stage 1 worked!\n" +
                "Distance: ${offRouteDistance.toInt()}m\n" +
                "State: $rerouteState\n⏳ Moving to Test 2..."
            } else {
                "⚠️ WARN: Stage 1 unexpected state\n" +
                "Expected: CLOSEST_POINT_RECOVERY\n" +
                "Got: $rerouteState (${offRouteDistance.toInt()}m)"
            }
            kotlinx.coroutines.delay(3000)

            // Test 2: Stage 2 - Medium Detour (130m) - Gradual movement
            debugTestStage = 2
            debugTestMessage = "🧪 TEST 2/3: Medium Detour (~130m)\nGradually moving off-route..."
            kotlinx.coroutines.delay(2000)
            
            // Move in 8 steps to 130m (~16m per step)
            val stepLat2 = 0.00015
            val stepLon2 = 0.000075
            for (step in 1..8) {
                navigationService.injectMockLocation(
                    currentLoc.latitude + (stepLat2 * step),
                    currentLoc.longitude + (stepLon2 * step),
                    currentLoc.altitude,
                    16.7f,
                    currentBearing ?: 0f
                )
                kotlinx.coroutines.delay(900)
            }
            
            debugTestMessage = "✓ Stage 2: Moved 130m off-route\n⏳ Waiting 9s for detection..."
            kotlinx.coroutines.delay(9000)  // Wait for 8s off-route + 1s buffer
            
            debugTestMessage = if (rerouteState == RerouteState.DIRECT_PATH_GUIDANCE) {
                "✅ PASS: Stage 2 triggered!\n" +
                "Distance: ${offRouteDistance.toInt()}m\n" +
                "Orange path visible on map\n⏳ Moving to Test 3..."
            } else {
                "⚠️ WARN: Stage 2 state mismatch\n" +
                "Expected: DIRECT_PATH_GUIDANCE\n" +
                "Got: $rerouteState (${offRouteDistance.toInt()}m)"
            }
            kotlinx.coroutines.delay(3000)

            // Test 3: Stage 3 - Major Detour (600m) - Gradual movement
            debugTestStage = 3
            debugTestMessage = "🧪 TEST 3/3: Major Detour (~600m)\nGradually moving far off-route...\n\n⚠️ Requires internet!"
            kotlinx.coroutines.delay(2000)
            
            // Move in 15 steps to 600m (~40m per step) 
            val stepLat3 = 0.000367
            val stepLon3 = 0.000367
            for (step in 1..15) {
                navigationService.injectMockLocation(
                    currentLoc.latitude + (stepLat3 * step),
                    currentLoc.longitude + (stepLon3 * step),
                    currentLoc.altitude,
                    16.7f,
                    currentBearing ?: 0f
                )
                debugTestMessage = "🚗 Moving... ${(step * 40)}m off-route"
                kotlinx.coroutines.delay(2400)  // 2.4s per step for smooth ~60 km/h
            }
            
            debugTestMessage = "✓ Stage 3: Moved 600m off-route\n⏳ Waiting 9s + API time..."
            kotlinx.coroutines.delay(9000)  // Wait for 8s off-route + 1s buffer
            
            // Check if API was called (state will be NONE after success or REROUTE_FAILED after error)
            val apiAttempted = rerouteState == RerouteState.API_REROUTING || rerouteState == RerouteState.NONE || rerouteState == RerouteState.REROUTE_FAILED
            
            debugTestMessage = when {
                rerouteState == RerouteState.NONE && offRouteDistance < 100 -> 
                    "✅ PASS: Stage 3 reroute successful!\n" +
                    "New route loaded\n⏳ Finalizing..."
                rerouteState == RerouteState.REROUTE_FAILED ->
                    "⚠️ INFO: API reroute failed\n" +
                    "Reason: Check internet/auth\n" +
                    "(Expected if offline)\n⏳ Finalizing..."
                rerouteState == RerouteState.API_REROUTING ->
                    "⏳ API rerouting in progress...\n" +
                    "Waiting for completion..."
                apiAttempted ->
                    "✅ INFO: API was triggered\n" +
                    "State: $rerouteState\n⏳ Finalizing..."
                else ->
                    "⚠️ WARN: Stage 3 not triggered\n" +
                    "Expected: API_REROUTING\n" +
                    "Got: $rerouteState (${offRouteDistance.toInt()}m)"
            }
            
            kotlinx.coroutines.delay(5000)

            // Final summary
            val stage1Status = if (rerouteState == RerouteState.CLOSEST_POINT_RECOVERY || rerouteState == RerouteState.NONE) "✓" else "?"
            val stage2Status = if (rerouteState == RerouteState.DIRECT_PATH_GUIDANCE) "✓" else "?"
            val stage3Status = if (rerouteState == RerouteState.REROUTE_FAILED || offRouteDistance < 100) "✓" else "?"
            
            debugTestMessage = """
                🎯 TEST COMPLETE
                ━━━━━━━━━━━━━━━━━━━━━━
                $stage1Status Stage 1: Minor Drift
                $stage2Status Stage 2: Direct Path
                $stage3Status Stage 3: API Reroute
                ━━━━━━━━━━━━━━━━━━━━━━
                Final state: $rerouteState
                Distance: ${offRouteDistance.toInt()}m
                
                📋 See logcat for details
            """.trimIndent()
            
            kotlinx.coroutines.delay(5000)
            
        } catch (e: Exception) {
            debugTestMessage = "❌ Test failed\n\n${e.message}"
            android.util.Log.e("NavigationScreen", "Test exception", e)
            kotlinx.coroutines.delay(3000)
        } finally {
            isDebugTesting = false
            debugTestStage = 0
            showDebugOverlay = false
        }
    }


    // Haptic feedback for speeding (vibrate once when exceeding limit)
    val vibrator = remember { context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as? android.os.Vibrator }
    var lastSpeedingState by remember { mutableStateOf(false) }

    LaunchedEffect(currentSpeed, currentSpeedLimit) {
        currentSpeedLimit?.let { limit ->
            val isSpeeding = currentSpeed > limit
            // Trigger vibration only on transition from not-speeding to speeding
            if (isSpeeding && !lastSpeedingState && currentSpeed >= 5f) { // Min speed 5 km/h to avoid false triggers
                vibrator?.let {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        it.vibrate(android.os.VibrationEffect.createOneShot(150, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        it.vibrate(150)
                    }
                }
            }
            lastSpeedingState = isSpeeding
        }
    }

    // Helper function to start two-phase navigation with approach route calculation
    suspend fun startTwoPhaseNavigationWithApproach() {
        android.util.Log.d("NavigationScreen", "Starting two-phase navigation with approach route calculation...")

        // Get current location - wait up to 5 seconds for GPS fix if needed
        var currentLoc = navigationService.currentLocation.value
        if (currentLoc == null) {
            android.util.Log.d("NavigationScreen", "No GPS fix yet, waiting for location...")
            // Wait for GPS fix with timeout
            var waitTime = 0
            while (currentLoc == null && waitTime < 5000) {
                kotlinx.coroutines.delay(500)
                currentLoc = navigationService.currentLocation.value
                waitTime += 500
                android.util.Log.d("NavigationScreen", "Waiting for GPS fix... ${waitTime}ms")
            }
            if (currentLoc != null) {
                android.util.Log.d("NavigationScreen", "GPS fix acquired after ${waitTime}ms")
            } else {
                android.util.Log.w("NavigationScreen", "GPS fix timeout after ${waitTime}ms - starting without approach route")
            }
        }

        // Zoom out before navigation starts to show route overview
        mapViewRef?.let { mapView ->
            mapView.controller.setZoom(15.0) // Slightly zoomed out for overview
        }

        // Calculate approach route if user is not at route start
        var approachRoute: Route? = null
        var approachInstructions: List<com.scenicroutes.app.data.model.RouteInstruction>? = null

        if (currentLoc != null && routeWithInstructions.geometry.isNotEmpty()) {
            val routeStart = routeWithInstructions.geometry.first()
            if (routeStart.size >= 2) {
                val distanceToStart = com.scenicroutes.app.utils.calculateHaversineDistance(
                    currentLoc.latitude, currentLoc.longitude,
                    routeStart[0], routeStart[1]
                )

                android.util.Log.d("NavigationScreen", "Distance to route start: ${distanceToStart.toInt()}m")

                // If more than 50m away, calculate approach route
                if (distanceToStart > 50.0) {
                    android.util.Log.d("NavigationScreen", "User is ${distanceToStart.toInt()}m from route start, calculating approach route...")

                    val approachResult = viewModel.calculateApproachRoute(
                        currentLat = currentLoc.latitude,
                        currentLng = currentLoc.longitude,
                        routeStartLat = routeStart[0],
                        routeStartLng = routeStart[1]
                    )

                    if (approachResult != null) {
                        approachRoute = approachResult.first
                        approachInstructions = approachResult.second
                        android.util.Log.d("NavigationScreen", "Approach route calculated: ${approachRoute.geometry.size} points, ${approachRoute.distance}km")
                    } else {
                        android.util.Log.w("NavigationScreen", "Failed to calculate approach route, will navigate directly to scenic route")
                    }
                } else {
                    android.util.Log.d("NavigationScreen", "User is already at route start (${distanceToStart.toInt()}m), skipping approach route")
                }
            }
        } else {
            android.util.Log.w("NavigationScreen", "No current location available, starting navigation without approach route")
        }

        // Start two-phase navigation
        navigationService.startTwoPhaseNavigation(
            scenicRoute = routeWithInstructions,
            scenicInstructions = routeWithInstructions.instructions,
            approachRoute = approachRoute,
            approachInstructions = approachInstructions
        )
        // Zoom back to navigation zoom after starting
        mapViewRef?.let { mapView ->
            mapView.controller.setZoom(17.5) // Default navigation zoom
        }
        
        // If not already recording, ask user if they want to record this ride
        if (!isBackgroundRecording) {
            wasRecordingBeforeNavigation = false
            showStartRecordingDialog = true
        } else {
            wasRecordingBeforeNavigation = true // Remember that recording was active before nav
        }
        
        android.util.Log.d("NavigationScreen", "Two-phase navigation started successfully - zoom reset to 17.5")
    }

    // Location permission launcher
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { isGranted ->
        android.util.Log.d("NavigationScreen", "Location permission result: $isGranted")
        if (isGranted) {
            // Permission granted, start navigation
            coroutineScope.launch {
                android.util.Log.d("NavigationScreen", "Location permission granted, starting navigation...")
                startTwoPhaseNavigationWithApproach()
                android.util.Log.d("NavigationScreen", "Navigation started successfully after permission grant")
            }
        } else {
            android.util.Log.w("NavigationScreen", "Location permission denied")
            android.widget.Toast.makeText(
                context,
                "Location permission is required for navigation. Please enable it in app settings.",
                android.widget.Toast.LENGTH_LONG,
            ).show()
        }
        showPermissionDialog = false
    }

    // Check feature access and start navigation
    LaunchedEffect(Unit) {
        android.util.Log.d("NavigationScreen", "=== NavigationScreen LaunchedEffect started ===")
        android.util.Log.d("NavigationScreen", "Route: distance=${routeWithInstructions.distance}m, instructions=${routeWithInstructions.instructions?.size ?: 0}")

        // Check feature access (suspend function)
        hasAccess = featureAccessService.hasFeatureAccess("turn_by_turn")
        android.util.Log.d("NavigationScreen", "Feature access check result: $hasAccess")

        if (!hasAccess) {
            android.util.Log.w("NavigationScreen", "User does not have access to turn_by_turn feature")
            android.widget.Toast.makeText(
                context,
                "Turn-by-turn navigation requires a premium subscription",
                android.widget.Toast.LENGTH_LONG,
            ).show()
            // Immediately navigate back so the user is not kept in this screen
            onNavigateBack()
            return@LaunchedEffect
        }

        val hasLocationPermission = navigationService.hasLocationPermission()
        android.util.Log.d("NavigationScreen", "Location permission check result: $hasLocationPermission")

        if (!hasLocationPermission) {
            android.util.Log.w("NavigationScreen", "Location permission not granted, requesting...")
            showPermissionDialog = true
            locationPermissionLauncher.launch(android.Manifest.permission.ACCESS_FINE_LOCATION)
            return@LaunchedEffect
        }

        // NOTE: Do NOT auto-start navigation here. User must explicitly click "Start Navigation" button
        // (previously this code was calling startTwoPhaseNavigationWithApproach() automatically)
        android.util.Log.d("NavigationScreen", "Permission checks passed. Waiting for user to click Start Navigation...")
        // Set up reroute callback (use CoroutineScope to launch on main dispatcher)
        navigationService.setRerouteCallback { currentPos, destination, profile ->
            CoroutineScope(Dispatchers.Main).launch {
                android.util.Log.d("NavigationScreen", "Reroute callback triggered: from (${currentPos.latitude}, ${currentPos.longitude}) to (${destination.latitude}, ${destination.longitude}), profile=$profile")
                try {
                    // Calculate new route from current position to destination using the provided profile
                    // Use "balanced" instead of "extra_curvy" to avoid authentication requirement during rerouting
                    // CRITICAL: Use high-density geometry to prevent jagged sparse polylines
                    viewModel.calculateRoute(
                        startLat = currentPos.latitude,
                        startLng = currentPos.longitude,
                        endLat = destination.latitude,
                        endLng = destination.longitude,
                        curvatureLevel = if (profile == "scenic") "balanced" else null, // Use balanced instead of extra_curvy for rerouting
                        avoidOptions = null,
                        waypoints = null,
                        savedRoadIds = null,
                        clearExistingRoute = false,
                        highDensityPolyline = true, // Enable high-density geometry for smooth reroutes (prevents sparse 34-point routes)
                    )

                    // Wait for route calculation to complete by observing route state
                    var attempts = 0
                    while (attempts < 30) { // Wait up to 3 seconds
                        kotlinx.coroutines.delay(100)
                        val currentRouteState = viewModel.routeState.value
                        val calculatedRoute = viewModel.selectedRoute.value

                        if (currentRouteState is com.scenicroutes.app.ui.viewmodel.RouteState.Success && calculatedRoute != null) {
                            android.util.Log.d("NavigationScreen", "Reroute successful: ${calculatedRoute.geometry.size} points")
                            navigationService.completeReroute(
                                newRoute = calculatedRoute,
                                newInstructions = calculatedRoute.instructions ?: emptyList()
                            )
                            return@launch
                        } else if (currentRouteState is com.scenicroutes.app.ui.viewmodel.RouteState.Error) {
                            val errorMsg = currentRouteState.message
                            android.util.Log.w("NavigationScreen", "Reroute failed: $errorMsg")
                            navigationService.rerouteFailed()
                            return@launch
                        }
                        attempts++
                    }

                    // Timeout
                    android.util.Log.w("NavigationScreen", "Reroute timeout")
                    navigationService.rerouteFailed()
                } catch (e: Exception) {
                    android.util.Log.e("NavigationScreen", "Error during reroute: ${e.message}", e)
                    rerouteStatus = "Reroute error" // Show error banner
                    // Auto-hide error banner after 3 seconds
                    kotlinx.coroutines.delay(3000)
                    rerouteStatus = null
                }
            }
        }
    }

    // Cleanup on dispose
    DisposableEffect(Unit) {
        onDispose {
            navigationService.cleanup()
        }
    }

    // Update muted state
    LaunchedEffect(isMuted) {
        navigationService.setMuted(isMuted)
    }

    // Store user location marker reference
    var userLocationMarker by remember { mutableStateOf<Marker?>(null) }

    // Draw route on map (initial draw) - only when NOT in two-phase navigation
    LaunchedEffect(mapViewRef, routeWithInstructions, navigationPhase) {
        // Only draw the scenic route initially if we're NOT in Phase 1 (approaching start)
        // Phase 1 dual route visualization is handled by a separate LaunchedEffect below
        if (navigationPhase != com.scenicroutes.app.data.service.NavigationPhase.APPROACHING_START) {
            mapViewRef?.let { mapView ->
                // Clear previous route overlays
                mapView.overlays.removeAll { overlay ->
                    overlay is Polyline && (
                        overlay.color == android.graphics.Color.parseColor("#2196F3") ||
                        overlay.color == android.graphics.Color.parseColor("#5B7C99") ||
                        overlay.color == android.graphics.Color.parseColor("#9C27B0") ||
                        overlay.color == android.graphics.Color.parseColor("#7B6B8E") ||
                        overlay.color == android.graphics.Color.parseColor("#64B5F6") ||
                        overlay.color == android.graphics.Color.parseColor("#7FA8C9") ||
                        overlay.color == android.graphics.Color.GRAY
                    )
                }

                // Draw full route initially (will be split into traveled/remaining as user moves)
                if (routeWithInstructions.geometry.isNotEmpty()) {
                    mapView.addRoute(
                        coordinates = routeWithInstructions.geometry,
                        color = android.graphics.Color.parseColor("#5B7C99"), // Muted slate blue for navigation route
                        width = 14f,
                    )

                    android.util.Log.d("NavigationScreen", "Route drawn on map (Phase: $navigationPhase)")
                }
            }
        }
    }

    // Update route visualization based on current location (traveled vs remaining)
    LaunchedEffect(mapViewRef, currentLocation, routeWithInstructions) {
        val location = currentLocation // Store in local variable to avoid smart cast issues
        if (location != null && isNavigating) {
            mapViewRef?.let { mapView ->
                // Find closest point on route to current location
                var closestIndex = 0
                var minDistance = Double.MAX_VALUE

                routeWithInstructions.geometry.forEachIndexed { index, coord ->
                    if (coord.size >= 2) {
                        val distance = calculateHaversineDistance(
                            location.latitude, location.longitude,
                            coord[0], coord[1]
                        )
                        if (distance < minDistance) {
                            minDistance = distance
                            closestIndex = index
                        }
                    }
                }

                // Clear previous route overlays (keep approach route if phase 1)
                mapView.overlays.removeAll { overlay ->
                    overlay is Polyline && (
                        overlay.color == android.graphics.Color.parseColor("#2196F3") ||
                        overlay.color == android.graphics.Color.parseColor("#5B7C99") ||
                        overlay.color == android.graphics.Color.GRAY ||
                        overlay.color == android.graphics.Color.parseColor("#757575") // Semi-transparent gray
                    )
                }

                // NEW APPROACH: Draw full route in blue first (base layer)
                if (routeWithInstructions.geometry.isNotEmpty()) {
                    mapView.addRoute(
                        coordinates = routeWithInstructions.geometry,
                        color = android.graphics.Color.parseColor("#5B7C99"), // Muted slate blue for full route
                        width = 14f,
                    )
                }

                // Then overlay traveled portion in gray with slightly narrower width to avoid seam
                // We use closestIndex directly (not +1) to avoid graying out current segment
                if (closestIndex > 0) {
                    val traveledPortion = routeWithInstructions.geometry.subList(0, closestIndex)
                    if (traveledPortion.isNotEmpty()) {
                        mapView.addRoute(
                            coordinates = traveledPortion,
                            color = android.graphics.Color.parseColor("#757575"), // Gray overlay for traveled portion
                            width = 13f, // Slightly narrower to prevent seam/gap issues
                        )
                    }
                }

                mapView.invalidate()
            }
        }
    }

    // Draw both approach and scenic routes when in Phase 1 (two-phase navigation)
    // When transitioning to Phase 2, clear approach route and draw scenic route
    LaunchedEffect(mapViewRef, navigationPhase, approachRouteGeometry, scenicRouteGeometry) {
        android.util.Log.d("NavigationScreen", "Route drawing LaunchedEffect triggered: phase=$navigationPhase, approachGeometry=${approachRouteGeometry.size} points, scenicGeometry=${scenicRouteGeometry.size} points, mapView=${mapViewRef != null}")

        mapViewRef?.let { mapView ->
            when (navigationPhase) {
                com.scenicroutes.app.data.service.NavigationPhase.APPROACHING_START -> {
                    android.util.Log.d("NavigationScreen", "Phase 1 drawing: approachGeometry=${approachRouteGeometry.size}, scenicGeometry=${scenicRouteGeometry.size}")

                    // Phase 1: Draw both approach route (muted purple) and scenic route preview (muted light blue)
                    // Clear previous route overlays
                    mapView.overlays.removeAll { overlay ->
                        overlay is Polyline && (
                            overlay.color == android.graphics.Color.parseColor("#2196F3") ||
                            overlay.color == android.graphics.Color.parseColor("#5B7C99") ||
                            overlay.color == android.graphics.Color.parseColor("#9C27B0") ||
                            overlay.color == android.graphics.Color.parseColor("#7B6B8E") ||
                            overlay.color == android.graphics.Color.parseColor("#64B5F6") ||
                            overlay.color == android.graphics.Color.parseColor("#7FA8C9") ||
                            overlay.color == android.graphics.Color.GRAY
                        )
                    }

                    // Draw approach route (muted purple - different from scenic route)
                    if (approachRouteGeometry.isNotEmpty()) {
                        android.util.Log.d("NavigationScreen", "Drawing approach route with ${approachRouteGeometry.size} points")
                        mapView.addRoute(
                            coordinates = approachRouteGeometry,
                            color = android.graphics.Color.parseColor("#7B6B8E"), // Muted purple for approach route
                            width = 10f,
                        )
                        android.util.Log.d("NavigationScreen", "Phase 1: Approach route drawn: ${approachRouteGeometry.size} points")
                    } else {
                        android.util.Log.w("NavigationScreen", "Phase 1: Approach route geometry is EMPTY - cannot draw!")
                    }

                    // Draw scenic route (muted light blue - to show it's upcoming)
                    if (scenicRouteGeometry.isNotEmpty()) {
                        android.util.Log.d("NavigationScreen", "Drawing scenic route preview with ${scenicRouteGeometry.size} points")
                        mapView.addRoute(
                            coordinates = scenicRouteGeometry,
                            color = android.graphics.Color.parseColor("#7FA8C9"), // Muted light blue for upcoming scenic route
                            width = 8f,
                        )
                        android.util.Log.d("NavigationScreen", "Phase 1: Scenic route preview drawn: ${scenicRouteGeometry.size} points")
                    } else {
                        android.util.Log.w("NavigationScreen", "Phase 1: Scenic route geometry is EMPTY - cannot draw!")
                    }

                    mapView.invalidate()
                }
                com.scenicroutes.app.data.service.NavigationPhase.ON_ROUTE -> {
                    // Phase 2: Clear approach route, draw scenic route in muted blue
                    // This is handled by the main route drawing LaunchedEffect above
                    // Just clear the approach route (muted purple) and muted light blue preview
                    mapView.overlays.removeAll { overlay ->
                        overlay is Polyline && (
                            overlay.color == android.graphics.Color.parseColor("#9C27B0") ||
                            overlay.color == android.graphics.Color.parseColor("#7B6B8E") ||
                            overlay.color == android.graphics.Color.parseColor("#64B5F6") ||
                            overlay.color == android.graphics.Color.parseColor("#7FA8C9")
                        )
                    }
                    android.util.Log.d("NavigationScreen", "Phase 2: Cleared approach route, scenic route will be drawn by main LaunchedEffect")
                    mapView.invalidate()
                }
                else -> {
                    // IDLE or other states - no special handling needed
                }
            }
        }
    }

    // Update user location marker continuously
    LaunchedEffect(mapViewRef, currentLocation, currentBearing) {
        mapViewRef?.let { mapView ->
            currentLocation?.let { location ->
                // Remove old marker
                userLocationMarker?.let { mapView.overlays.remove(it) }

                // Create simple blue dot marker with directional indicator
                val bearing = currentBearing ?: 0f
                
                val marker = Marker(mapView).apply {
                    position = GeoPoint(location.latitude, location.longitude)
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                    title = "Your Location"

                    // Create simple blue dot with direction indicator
                    val size = 56
                    val bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888)
                    val canvas = android.graphics.Canvas(bitmap)
                    
                    val cx = size / 2f
                    val cy = size / 2f
                    val radius = 16f
                    
                    // Blue dot (current location)
                    val dotPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        style = android.graphics.Paint.Style.FILL
                        color = android.graphics.Color.parseColor("#1976D2") // Google blue
                    }
                    
                    val outlinePaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        style = android.graphics.Paint.Style.STROKE
                        strokeWidth = 3f
                        color = android.graphics.Color.WHITE
                    }
                    
                    // Draw direction indicator (small triangle pointing in bearing direction)
                    val directionPath = android.graphics.Path().apply {
                        val angle = Math.toRadians(bearing.toDouble()).toFloat()
                        val tipX = cx + (radius + 8f) * kotlin.math.sin(angle)
                        val tipY = cy - (radius + 8f) * kotlin.math.cos(angle)
                        moveTo(tipX, tipY)
                        lineTo(cx - 3f, cy)
                        lineTo(cx + 3f, cy)
                        close()
                    }
                    
                    val directionPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        style = android.graphics.Paint.Style.FILL
                        color = android.graphics.Color.parseColor("#1976D2")
                    }
                    canvas.drawPath(directionPath, directionPaint)
                    
                    // Draw main blue dot
                    canvas.drawCircle(cx, cy, radius, dotPaint)
                    // Draw white outline
                    canvas.drawCircle(cx, cy, radius, outlinePaint)
                    
                    icon = android.graphics.drawable.BitmapDrawable(context.resources, bitmap)
                    setInfoWindow(null)
                }

                mapView.overlays.add(marker)
                userLocationMarker = marker
                mapView.invalidate()
            }
        }
    }

    // Check for off-route and handle rerouting
    LaunchedEffect(currentLocation, isNavigating) {
        val location = currentLocation
        if (location != null && isNavigating) {
            navigationService.checkAndHandleOffRoute(location)
        }
    }
    
    // Handle direct path visualization
    LaunchedEffect(mapViewRef, directPathGeometry, rerouteState) {
        mapViewRef?.let { mapView ->
            // Clear old direct path
            mapView.overlays.removeAll { overlay ->
                overlay is org.osmdroid.views.overlay.Polyline && 
                overlay.color == android.graphics.Color.parseColor("#FF9800") // Orange for temporary path
            }
            
            // Draw new direct path if showing medium detour guidance
            if (directPathGeometry.isNotEmpty() && rerouteState == RerouteState.DIRECT_PATH_GUIDANCE) {
                mapView.addRoute(
                    coordinates = directPathGeometry,
                    color = android.graphics.Color.parseColor("#FF9800"), // Orange for temporary guidance
                    width = 8f
                )
            }
        }
    }
    var lastCenteredLocation by remember { mutableStateOf<GeoPoint?>(null) }

    // Apply a fixed screen-space center offset so marker sits above the bottom card
    LaunchedEffect(mapViewRef) {
        mapViewRef?.setMapCenterOffset(0, centerOffsetPx)
    }

    // Auto-zoom and follow current location during navigation (Google Maps style)
    // Follow works even when paused so marker stays on screen
    LaunchedEffect(mapViewRef, currentLocation, shouldFollowUser, currentBearing) {
        val location = currentLocation // Store in local variable to avoid smart cast issues
        if (location != null && shouldFollowUser) {
            mapViewRef?.let { mapView ->
                // Offset map center slightly in direction of travel so marker appears in lower-center of screen
                val bearing = currentBearing ?: 0f
                val offsetDistance = 0.0 // No forward offset; marker centered on current location

                // Calculate offset in direction of bearing
                val bearingRad = Math.toRadians(bearing.toDouble())
                val latOffset = offsetDistance * Math.cos(bearingRad)
                val lonOffset = offsetDistance * Math.sin(bearingRad)

                val targetGeo = GeoPoint(location.latitude + latOffset, location.longitude + lonOffset)

                android.util.Log.d(
                    "NavigationScreen",
                    "Following user: lat=${String.format("%.6f", location.latitude)}, lon=${String.format("%.6f", location.longitude)}, bearing=${bearing.toInt()}°"
                )

                // Use setCenter for immediate update without animation (smoother during simulation)
                isProgrammaticMove = true
                mapView.controller.setCenter(targetGeo)
                mapView.controller.setZoom(16.5) // Slightly closer zoom to keep marker visible above card
                isProgrammaticMove = false

                lastCenteredLocation = targetGeo
            }
        } else if (location == null && isNavigating) {
            // Navigation started but no location yet - center on route start
            mapViewRef?.let { mapView ->
                if (routeWithInstructions.geometry.isNotEmpty()) {
                    val firstPoint = routeWithInstructions.geometry.first()
                    if (firstPoint.size >= 2) {
                        val startPoint = GeoPoint(firstPoint[0], firstPoint[1])
                        mapView.controller.animateTo(startPoint)
                        mapView.controller.setZoom(17.5)
                        android.util.Log.d("NavigationScreen", "No location yet, centering on route start: ${firstPoint[0]}, ${firstPoint[1]}")
                    }
                }
            }
        }
    }

    // Heading-up map rotation during navigation (Google Maps style)
    LaunchedEffect(mapViewRef, currentBearing, isNavigating, shouldFollowUser) {
        if (isNavigating && currentBearing != null && shouldFollowUser) {
            mapViewRef?.let { mapView ->
                // OSMDroid mapOrientation rotates the map CLOCKWISE
                // To make the travel direction point UP, we NEGATE the bearing
                // Example: if traveling NORTH (0°), map rotates 0° (no rotation needed)
                // If traveling EAST (90°), map rotates -90° to make east face up
                val targetOrientation = -currentBearing!!

                // Set map orientation to negate bearing (makes travel direction point up)
                mapView.mapOrientation = targetOrientation
                mapView.invalidate()
                android.util.Log.d("NavigationScreen", "Rotated map: bearing=${currentBearing}°, orientation=${targetOrientation}°")
            }
        }
    }

    // Collapsible trip summary state
    var isTripSummaryExpanded by remember { mutableStateOf(true) }

    FeatureGate(
        feature = "turn_by_turn",
        fallback = { requiredTier ->
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Navigation") },
                        navigationIcon = {
                            IconButton(onClick = onNavigateBack) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                            }
                        },
                    )
                },
            ) { padding ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    com.scenicroutes.app.ui.components.UpgradePrompt(
                        requiredTier = requiredTier,
                        feature = "turn_by_turn",
                        navController = navController,
                    )
                }
            }
        },
        content = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("navigation_title"),
            ) {
                // Map overlay - full screen background with stable 3D tilt effect
                OSMMapView(
                    modifier = Modifier
                        .fillMaxSize(),
                    center = routeWithInstructions.geometry.firstOrNull()?.let {
                        if (it.size >= 2) GeoPoint(it[0], it[1]) else null
                    },
                    zoomLevel = 13.0,
                    overscanMultiplier = 6.0f,
                    applyTilt = true,
                    onMapReady = { mapView ->
                        mapViewRef = mapView
                        // Disable any map move listeners during initial setup
                    },
                    onMapMoved = {
                        if (!isProgrammaticMove) {
                            // User interacted with the map (not programmatic): pause auto-follow until they tap recenter
                            shouldFollowUser = false
                        }
                    }
                )

                // Calimoto-style Controls - Only essential buttons visible
                Column(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .zIndex(10f),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Back button (always visible)
                    FloatingActionButton(
                        onClick = {
                            // If recording, stop and show save dialog
                            if (isBackgroundRecording) {
                                val recordedRide = backgroundRecordingManager.stopBackgroundRecording()
                                if (recordedRide != null) {
                                    pendingRecordedRide = recordedRide
                                    showSaveRecordingDialog = true
                                }
                            } else {
                                onNavigateBack()
                            }
                        },
                        modifier = Modifier
                            .size(56.dp)
                            .testTag("navigation_back_button"),
                        containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                        shape = CircleShape,
                    ) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onSurface,
                        )
                    }

                    // Pause/Resume button (always visible)
                    FloatingActionButton(
                        onClick = {
                            if (isNavigating) {
                                navigationService.pauseNavigation()
                            } else {
                                navigationService.resumeNavigation()
                            }
                        },
                        modifier = Modifier
                            .size(56.dp)
                            .testTag(if (isNavigating) "navigation_pause_button" else "navigation_resume_button"),
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                        shape = CircleShape,
                    ) {
                        Icon(
                            if (isNavigating) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isNavigating) "Pause" else "Resume",
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }

                    // Recenter button (shows when auto-follow disabled via manual map drag)
                    androidx.compose.animation.AnimatedVisibility(
                        visible = !shouldFollowUser && isNavigating,
                        enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.scaleIn(),
                        exit = androidx.compose.animation.fadeOut() + androidx.compose.animation.scaleOut(),
                    ) {
                        FloatingActionButton(
                            onClick = {
                                shouldFollowUser = true

                                // Immediately recenter when the user taps recenter
                                val loc = currentLocation
                                if (loc != null) {
                                    val targetGeo = org.osmdroid.util.GeoPoint(loc.latitude, loc.longitude)
                                    isProgrammaticMove = true
                                    mapViewRef?.controller?.setCenter(targetGeo)
                                    mapViewRef?.controller?.setZoom(17.5)
                                    isProgrammaticMove = false
                                    lastCenteredLocation = targetGeo
                                }
                            },
                            modifier = Modifier
                                .size(56.dp)
                                .testTag("navigation_recenter_button"),
                            containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                            shape = CircleShape,
                        ) {
                            Icon(
                                Icons.Default.MyLocation,
                                contentDescription = "Recenter",
                                tint = MaterialTheme.colorScheme.onTertiaryContainer,
                            )
                        }
                    }

                    // Menu button (expandable - contains secondary actions)
                    Column(
                        horizontalAlignment = Alignment.End,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        FloatingActionButton(
                            onClick = { showMenu = !showMenu },
                            modifier = Modifier
                                .size(56.dp)
                                .testTag("navigation_menu_button"),
                            containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                            shape = CircleShape,
                        ) {
                            Icon(
                                if (showMenu) Icons.Default.Close else Icons.Default.MoreVert,
                                contentDescription = if (showMenu) "Close menu" else "Menu",
                                tint = MaterialTheme.colorScheme.onSurface,
                            )
                        }

                        // Menu items (secondary actions)
                        androidx.compose.animation.AnimatedVisibility(
                            visible = showMenu,
                            enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInVertically(),
                            exit = androidx.compose.animation.fadeOut() + androidx.compose.animation.slideOutVertically(),
                        ) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                horizontalAlignment = Alignment.End,
                            ) {
                                // Mute/Unmute
                                FloatingActionButton(
                                    onClick = {
                                        isMuted = !isMuted
                                        showMenu = false
                                    },
                                    modifier = Modifier.size(48.dp),
                                    containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                                    shape = CircleShape,
                                ) {
                                    Icon(
                                        if (isMuted) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                                        contentDescription = if (isMuted) "Unmute" else "Mute",
                                        tint = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }

                                // Reroute
                                FloatingActionButton(
                                    onClick = {
                                        rerouteStatus = "Rerouting..."
                                        navigationService.reroute()
                                        showMenu = false
                                        coroutineScope.launch {
                                            kotlinx.coroutines.delay(5000)
                                            if (rerouteStatus == "Rerouting...") {
                                                rerouteStatus = null
                                            }
                                        }
                                    },
                                    modifier = Modifier.size(48.dp),
                                    containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                                    shape = CircleShape,
                                ) {
                                    Icon(
                                        Icons.Default.Refresh,
                                        contentDescription = "Reroute",
                                        tint = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }

                                // Record Ride - Toggle start/stop with save dialog on stop
                                FloatingActionButton(
                                    onClick = {
                                        if (!isBackgroundRecording) {
                                            // Start recording
                                            backgroundRecordingManager.startBackgroundRecording()
                                            android.widget.Toast.makeText(
                                                context,
                                                "Ride recording started",
                                                android.widget.Toast.LENGTH_SHORT,
                                            ).show()
                                        } else {
                                            // Stop recording and show save dialog
                                            val recordedRide = backgroundRecordingManager.stopBackgroundRecording()
                                            if (recordedRide != null) {
                                                pendingRecordedRide = recordedRide
                                                showSaveRecordingDialog = true
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Ride recording stopped",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                            }
                                        }
                                        showMenu = false
                                    },
                                    modifier = Modifier.size(48.dp),
                                    containerColor = if (isBackgroundRecording) {
                                        MaterialTheme.colorScheme.errorContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceContainerHighest
                                    },
                                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                                    shape = CircleShape,
                                ) {
                                    Icon(
                                        Icons.Default.Brightness1,
                                        contentDescription = if (isBackgroundRecording) "Stop Recording" else "Record Ride",
                                        tint = if (isBackgroundRecording) {
                                            MaterialTheme.colorScheme.error
                                        } else {
                                            MaterialTheme.colorScheme.onSurface
                                        },
                                        modifier = Modifier.size(20.dp),
                                    )
                                }

                                if (isDebugBuild) {
                                    // Car Debug Mode (Simulate Location)
                                    FloatingActionButton(
                                        onClick = {
                                            if (navigationService.isSimulating()) {
                                                navigationService.stopSimulation()
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Stopped car debug simulation",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                            } else {
                                                navigationService.startSimulation()
                                                shouldFollowUser = true // Enable auto-follow when simulation starts
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Started car debug mode - simulating movement",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                            }
                                            showMenu = false
                                        },
                                        modifier = Modifier.size(48.dp),
                                        containerColor = if (navigationService.isSimulating()) {
                                            android.graphics.Color.parseColor("#D32F2F").let { androidx.compose.ui.graphics.Color(it) } // Bright red when active
                                        } else {
                                            android.graphics.Color.parseColor("#8B0000").let { androidx.compose.ui.graphics.Color(it) } // Dark red when inactive
                                        },
                                        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = if (navigationService.isSimulating()) 8.dp else 0.dp),
                                        shape = CircleShape,
                                    ) {
                                        Icon(
                                            Icons.Default.DirectionsCar,
                                            contentDescription = "Car Debug Mode",
                                            tint = androidx.compose.ui.graphics.Color.White,
                                            modifier = Modifier.size(20.dp),
                                        )
                                    }

                                    // Manual Reroute Panel
                                    FloatingActionButton(
                                        onClick = {
                                            showDebugOverlay = true
                                            if (debugTestMessage.isEmpty()) {
                                                debugTestMessage = "Manual reroute controls"
                                            }
                                            isDebugTesting = false
                                            showMenu = false
                                        },
                                        modifier = Modifier.size(48.dp),
                                        containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                                        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp),
                                        shape = CircleShape,
                                    ) {
                                        Icon(
                                            Icons.Default.Tune,
                                            contentDescription = "Manual Reroute Panel",
                                            tint = MaterialTheme.colorScheme.onSurface,
                                            modifier = Modifier.size(20.dp),
                                        )
                                    }

                                    // Automated Reroute Test (Debug Only)
                                    FloatingActionButton(
                                        onClick = {
                                            if (!isDebugTesting) {
                                                coroutineScope.launch {
                                                    runAutomatedRerouteTest()
                                                }
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Starting automated reroute test...",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                            } else {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Test already running...",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                            }
                                            showMenu = false
                                        },
                                        modifier = Modifier.size(48.dp),
                                        containerColor = if (isDebugTesting) {
                                            android.graphics.Color.parseColor("#FF9800").let { androidx.compose.ui.graphics.Color(it) } // Orange when active
                                        } else {
                                            android.graphics.Color.parseColor("#FF6F00").let { androidx.compose.ui.graphics.Color(it) } // Dark orange when inactive
                                        },
                                        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = if (isDebugTesting) 8.dp else 0.dp),
                                        shape = CircleShape,
                                    ) {
                                        if (isDebugTesting) {
                                            androidx.compose.material3.CircularProgressIndicator(
                                                modifier = Modifier.size(20.dp),
                                                strokeWidth = 2.dp,
                                                color = androidx.compose.ui.graphics.Color.White
                                            )
                                        } else {
                                            Icon(
                                                Icons.Default.BugReport,
                                                contentDescription = "Test Rerouting",
                                                tint = androidx.compose.ui.graphics.Color.White,
                                                modifier = Modifier.size(20.dp),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (isDebugBuild) {
                    // Debug Test Overlay (shows test progress)
                    if (showDebugOverlay && debugTestMessage.isNotEmpty()) {
                        Card(
                            modifier = Modifier
                                .align(Alignment.Center)
                                .padding(24.dp)
                                .widthIn(max = 320.dp)
                                .zIndex(100f),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // Title
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        Icons.Default.BugReport,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Text(
                                        "Reroute Test Runner",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                            }

                            androidx.compose.material3.HorizontalDivider()

                            // Progress indicator
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                repeat(3) { index ->
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .background(
                                                color = when {
                                                    index + 1 < debugTestStage -> MaterialTheme.colorScheme.primary
                                                    index + 1 == debugTestStage -> MaterialTheme.colorScheme.secondary
                                                    else -> MaterialTheme.colorScheme.surfaceVariant
                                                },
                                                shape = CircleShape
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            "${index + 1}",
                                            color = when {
                                                index + 1 <= debugTestStage -> MaterialTheme.colorScheme.onPrimary
                                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                                            },
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }
                                }
                            }

                            // Test message
                            Text(
                                debugTestMessage,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )

                            // Current state info
                            if (isOffRoute) {
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f)
                                    ),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(12.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            "Distance: ${offRouteDistance.toInt()}m",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSecondaryContainer
                                        )
                                        Text(
                                            "State: $rerouteState",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSecondaryContainer
                                        )
                                    }
                                }
                            }

                            // Manual reroute controls (works while simulating)
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    "Manual reroute controls",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        value = manualLatInput,
                                        onValueChange = { manualLatInput = it },
                                        label = { Text("Lat (optional)") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true
                                    )
                                    OutlinedTextField(
                                        value = manualLonInput,
                                        onValueChange = { manualLonInput = it },
                                        label = { Text("Lon (optional)") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Button(
                                        onClick = {
                                            val manualLocation = if (manualLatInput.isNotBlank() && manualLonInput.isNotBlank()) {
                                                val lat = manualLatInput.toDoubleOrNull()
                                                val lon = manualLonInput.toDoubleOrNull()
                                                if (lat != null && lon != null) GeoPoint(lat, lon) else null
                                            } else {
                                                null
                                            }

                                            val targetLocation = manualLocation ?: navigationService.currentLocation.value
                                            if (targetLocation != null) {
                                                navigationService.triggerManualRerouteStage(
                                                    RerouteState.CLOSEST_POINT_RECOVERY,
                                                    GeoPoint(targetLocation.latitude, targetLocation.longitude)
                                                )
                                                debugTestMessage = "Manual Stage 1 triggered"
                                            } else {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "No location available",
                                                    android.widget.Toast.LENGTH_SHORT
                                                ).show()
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Stage 1")
                                    }

                                    Button(
                                        onClick = {
                                            val manualLocation = if (manualLatInput.isNotBlank() && manualLonInput.isNotBlank()) {
                                                val lat = manualLatInput.toDoubleOrNull()
                                                val lon = manualLonInput.toDoubleOrNull()
                                                if (lat != null && lon != null) GeoPoint(lat, lon) else null
                                            } else {
                                                null
                                            }

                                            val targetLocation = manualLocation ?: navigationService.currentLocation.value
                                            if (targetLocation != null) {
                                                navigationService.triggerManualRerouteStage(
                                                    RerouteState.DIRECT_PATH_GUIDANCE,
                                                    GeoPoint(targetLocation.latitude, targetLocation.longitude)
                                                )
                                                debugTestMessage = "Manual Stage 2 triggered"
                                            } else {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "No location available",
                                                    android.widget.Toast.LENGTH_SHORT
                                                ).show()
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Stage 2")
                                    }

                                    Button(
                                        onClick = {
                                            val manualLocation = if (manualLatInput.isNotBlank() && manualLonInput.isNotBlank()) {
                                                val lat = manualLatInput.toDoubleOrNull()
                                                val lon = manualLonInput.toDoubleOrNull()
                                                if (lat != null && lon != null) GeoPoint(lat, lon) else null
                                            } else {
                                                null
                                            }

                                            val targetLocation = manualLocation ?: navigationService.currentLocation.value
                                            if (targetLocation != null) {
                                                navigationService.triggerManualRerouteStage(
                                                    RerouteState.API_REROUTING,
                                                    GeoPoint(targetLocation.latitude, targetLocation.longitude),
                                                    forceApiCall = true
                                                )
                                                debugTestMessage = "Manual Stage 3 (API) triggered"
                                            } else {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "No location available",
                                                    android.widget.Toast.LENGTH_SHORT
                                                ).show()
                                            }
                                        },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Stage 3")
                                    }
                                }

                                Text(
                                    "Stage 1/2 work offline. Stage 3 needs internet (GraphHopper).",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

                // Speed Display Badge (Bottom-Right Corner) with Speed Limit
                if (isNavigating && currentSpeed >= 3f) {
                    Card(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(bottom = 120.dp, end = 16.dp)
                            .zIndex(10f),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerHighest
                        ),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp, 8.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Current speed
                            Text(
                                text = "${currentSpeed.toInt()}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (currentSpeedLimit != null && currentSpeed > currentSpeedLimit!!) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.onSurface
                                },
                                fontSize = 28.sp
                            )
                            Text(
                                text = " km/h",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(start = 4.dp)
                            )

                            // Speed limit (if available)
                            currentSpeedLimit?.let { limit ->
                                Divider(
                                    modifier = Modifier
                                        .height(24.dp)
                                        .width(1.dp)
                                        .padding(horizontal = 8.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant
                                )
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(
                                            color = if (currentSpeed > limit) {
                                                MaterialTheme.colorScheme.error.copy(alpha = 0.2f)
                                            } else {
                                                MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                            },
                                            shape = RoundedCornerShape(4.dp)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = limit.toString(),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = if (currentSpeed > limit) {
                                            MaterialTheme.colorScheme.error
                                        } else {
                                            MaterialTheme.colorScheme.primary
                                        },
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // Calimoto-style recording indicator - Compact pill with timer
                androidx.compose.animation.AnimatedVisibility(
                    visible = isBackgroundRecording,
                    enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInVertically(initialOffsetY = { -it }),
                    exit = androidx.compose.animation.fadeOut() + androidx.compose.animation.slideOutVertically(targetOffsetY = { -it }),
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 8.dp)
                        .zIndex(25f)
                ) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        ),
                        shape = RoundedCornerShape(24.dp), // Pill shape
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Recording dot (blinking)
                            val infiniteTransition = rememberInfiniteTransition(label = "rec_blink")
                            val alpha = infiniteTransition.animateFloat(
                                initialValue = 1f,
                                targetValue = 0.3f,
                                animationSpec = infiniteRepeatable(
                                    animation = tween(durationMillis = 800, easing = androidx.compose.animation.core.EaseInOut),
                                    repeatMode = androidx.compose.animation.core.RepeatMode.Reverse
                                ),
                                label = "blink_alpha"
                            )

                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .background(
                                        color = MaterialTheme.colorScheme.error.copy(alpha = alpha.value),
                                        shape = CircleShape
                                    )
                            )

                            // REC label + timer in HH:MM:SS format
                            val hours = (recordingElapsedTime / 3600000).toInt()
                            val minutes = ((recordingElapsedTime % 3600000) / 60000).toInt()
                            val seconds = ((recordingElapsedTime % 60000) / 1000).toInt()
                            val timeString = if (hours > 0) {
                                String.format("%d:%02d:%02d", hours, minutes, seconds)
                            } else {
                                String.format("%02d:%02d", minutes, seconds)
                            }

                            Text(
                                text = "REC $timeString",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }

                // Reroute status banner
                androidx.compose.animation.AnimatedVisibility(
                    visible = rerouteStatus != null,
                    enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInVertically(),
                    exit = androidx.compose.animation.fadeOut() + androidx.compose.animation.slideOutVertically(),
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 16.dp)
                        .zIndex(20f)
                ) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = when (rerouteStatus) {
                                "Rerouting..." -> MaterialTheme.colorScheme.primaryContainer
                                "Route updated" -> MaterialTheme.colorScheme.secondaryContainer
                                else -> MaterialTheme.colorScheme.errorContainer
                            }
                        ),
                        shape = RoundedCornerShape(24.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            when (rerouteStatus) {
                                "Rerouting..." -> {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        strokeWidth = 2.dp
                                    )
                                    Icon(
                                        Icons.Default.Refresh,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                "Route updated" -> Icon(
                                    Icons.Default.Check,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                    modifier = Modifier.size(16.dp)
                                )
                                else -> Icon(
                                    Icons.Default.Error,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                            Text(
                                text = rerouteStatus ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = when (rerouteStatus) {
                                    "Rerouting..." -> MaterialTheme.colorScheme.onPrimaryContainer
                                    "Route updated" -> MaterialTheme.colorScheme.onSecondaryContainer
                                    else -> MaterialTheme.colorScheme.onErrorContainer
                                }
                            )
                        }
                    }
                }

                // PREVIEW State - Route summary before navigation starts
                if (navigationUIState == com.scenicroutes.app.data.service.NavigationUIState.PREVIEW && currentInstructionIndex == 0) {
                    Card(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 48.dp, start = 16.dp, end = 16.dp)
                            .fillMaxWidth(0.85f)
                            .animateContentSize(
                                animationSpec = spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessLow
                                )
                            ),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.98f),
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Header
                            Text(
                                "Ready to navigate",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )

                            // First instruction preview
                            routeWithInstructions?.instructions?.firstOrNull()?.let { firstInstruction ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Turn icon
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .background(
                                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                                shape = CircleShape
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            getTurnIcon(firstInstruction.text),
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }

                                    // Turn info
                                    Column(
                                        modifier = Modifier.weight(1f),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(
                                            firstInstruction.text,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            maxLines = 2,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                        )
                                        Text(
                                            DistanceFormatter.formatDistance(firstInstruction.distance),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }

                            // Route stats
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    DistanceFormatter.formatDistance(routeWithInstructions?.distance ?: 0.0),
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.weight(1f),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                                Text(
                                    "|",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.outlineVariant,
                                )
                                Text(
                                    routeWithInstructions?.time?.let {
                                        java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                                            .format(java.util.Date(System.currentTimeMillis() + it))
                                    } ?: "--:--",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.weight(1f),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }

                            // Route characteristics (curvature, elevation)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Curvature level
                                routeWithInstructions?.curvatureLevel?.let { curvature ->
                                    Surface(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(32.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        color = when (curvature.lowercase()) {
                                            "straightest" -> MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                            "mellow" -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f)
                                            "curved" -> MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.2f)
                                            "extra_curvy" -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.2f)
                                            else -> MaterialTheme.colorScheme.surfaceVariant
                                        }
                                    ) {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = when (curvature.lowercase()) {
                                                    "straightest" -> "🛣️ Straightest"
                                                    "mellow" -> "🏞️ Mellow"
                                                    "curved" -> "🏍️ Curved"
                                                    "extra_curvy" -> "🎢 Extra Curvy"
                                                    else -> curvature
                                                },
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.Medium,
                                                color = MaterialTheme.colorScheme.onSurface,
                                                maxLines = 1,
                                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                                fontSize = 11.sp
                                            )
                                        }
                                    }
                                }

                            }

                            // Start button
                            Button(
                                onClick = {
                                    coroutineScope.launch {
                                        startTwoPhaseNavigationWithApproach()
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                ),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Start Navigation",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                )
                            }
                        }
                    }
                }

                // Enhanced Current Instruction Panel (Top-Center) - Modern Google Maps/Waze style
                // Only shown during ACTIVE navigation
                if (navigationUIState != com.scenicroutes.app.data.service.NavigationUIState.PREVIEW || currentInstructionIndex > 0) {
                    Card(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 8.dp, start = 8.dp, end = 72.dp)
                        .fillMaxWidth(0.9f)
                        .zIndex(15f) // Increased z-index to be highest priority
                        .animateContentSize(
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioMediumBouncy,
                                stiffness = Spring.StiffnessLow
                            )
                        ),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.98f), // Increased opacity for better contrast
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp), // Reduced shadow strength
                    shape = RoundedCornerShape(14.dp), // Reduced corner radius
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)) // Added subtle border
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        // Phase indicator banner with gradient background
                        if (navigationPhase == com.scenicroutes.app.data.service.NavigationPhase.APPROACHING_START) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        brush = Brush.horizontalGradient(
                                            colors = listOf(
                                                MaterialTheme.colorScheme.primaryContainer,
                                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.8f)
                                            )
                                        )
                                    )
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(32.dp)
                                                .background(
                                                    color = MaterialTheme.colorScheme.primary,
                                                    shape = CircleShape
                                                ),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                Icons.Default.Flag,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.onPrimary,
                                                modifier = Modifier.size(18.dp),
                                            )
                                        }
                                        Text(
                                            text = "Navigating to route start",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        )
                                    }
                                    distanceToRouteStart?.let { distance ->
                                        Box(
                                            modifier = Modifier
                                                .background(
                                                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                                                    shape = RoundedCornerShape(12.dp)
                                                )
                                                .padding(horizontal = 12.dp, vertical = 6.dp)
                                        ) {
                                            Text(
                                                text = DistanceFormatter.formatDistanceWithSettings(distance),
                                                style = MaterialTheme.typography.titleSmall,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.primary,
                                            )
                                        }
                                    }
                                }
                            }
                        } else if (navigationPhase == com.scenicroutes.app.data.service.NavigationPhase.ON_ROUTE) {
                            // Reduced height scenic route badge - moved to small indicator
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(32.dp) // Reduced from previous height
                                    .background(
                                        brush = Brush.horizontalGradient(
                                            colors = listOf(
                                                MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.7f),
                                                MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f)
                                            )
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Icon(
                                        Icons.Default.Landscape,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                        modifier = Modifier.size(14.dp),
                                    )
                                    Text(
                                        text = "Scenic Route",
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onTertiaryContainer,
                                    )
                                }
                            }
                        }

                        // Main instruction content - reduced padding for compact design
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 12.dp), // Reduced from 16dp
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top, // Changed to Top for better distance/instruction alignment
                        ) {
                            // Left side: Calimoto-style instruction hierarchy
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                if (currentInstruction != null) {
                                    // Distance countdown - HUGE and most prominent (Tier 1 priority)
                                    distanceToNextTurn?.let { distance ->
                                        Text(
                                            text = DistanceFormatter.formatDistanceWithSettings(distance).uppercase(),
                                            style = MaterialTheme.typography.headlineLarge.copy(fontSize = 40.sp), // Massive font
                                            fontWeight = FontWeight.Black, // Extra bold
                                            color = MaterialTheme.colorScheme.primary,
                                            letterSpacing = 1.sp,
                                        )
                                    }

                                    // Main instruction - bold but secondary (Tier 2 priority)
                                    Text(
                                        text = currentInstruction.text,
                                        style = MaterialTheme.typography.titleMedium, // Reduced from titleLarge
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 2,
                                    )

                                    // Road name - tertiary info (Tier 3 priority)
                                    val roadName = extractRoadName(currentInstruction.text)
                                    if (roadName.isNotEmpty()) {
                                        Text(
                                            text = roadName,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                            fontWeight = FontWeight.Normal,
                                        )
                                    }
                                } else {
                                    Text(
                                        text = if (routeWithInstructions.instructions.isNullOrEmpty()) {
                                            "No instructions available"
                                        } else {
                                            "Navigation Complete"
                                        },
                                        style = MaterialTheme.typography.headlineSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                            }

                            // Right side: Enhanced turn icon with directional styling
                            currentInstruction?.let {
                                Box(
                                    modifier = Modifier.size(64.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        getTurnIcon(currentInstruction.text),
                                        contentDescription = "Turn direction",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(36.dp), // Increased size for thicker stroke appearance
                                    )
                                }
                            }
                        }

                        // Upcoming turn preview - ultra-minimal (Tier 4 - least prominent)
                        routeWithInstructions.instructions?.let { instructions ->
                            val nextInstructions = instructions.drop(currentInstructionIndex + 1).take(1) // Limit to 1 step
                            if (nextInstructions.isNotEmpty()) {
                                Divider(
                                    modifier = Modifier.padding(horizontal = 20.dp),
                                    color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f) // Barely visible
                                )
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 8.dp), // Reduced from 12dp
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    nextInstructions.forEach { instruction ->
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Icon(
                                                getTurnIcon(instruction.text),
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f), // Very muted
                                                modifier = Modifier.size(12.dp),
                                            )
                                            Text(
                                                text = "Then ${instruction.text.lowercase()}", // Added "Then" prefix for context
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), // Very muted
                                                maxLines = 1,
                                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                            )
                                        }
                                        Text(
                                            text = DistanceFormatter.formatDistanceWithSettings(instruction.distance),
                                            style = MaterialTheme.typography.labelSmall, // Smallest font
                                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f), // Very muted
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Enhanced Trip Summary Bar (Bottom) - Modern design with better visual hierarchy
                Card(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .zIndex(10f),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.98f),
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                ) {
                    Column {
                        // Off-Route Warning Banner (shows above instruction card when off-route)
                        if (isOffRoute) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 12.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = when (rerouteState) {
                                        RerouteState.REROUTE_FAILED -> MaterialTheme.colorScheme.errorContainer
                                        RerouteState.API_REROUTING -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.7f)
                                        else -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.7f)
                                    }
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Warning icon
                                    Icon(
                                        when {
                                            rerouteState == RerouteState.API_REROUTING -> Icons.Default.Sync
                                            rerouteState == RerouteState.REROUTE_FAILED -> Icons.Default.Warning
                                            else -> Icons.Default.LocationOff
                                        },
                                        contentDescription = null,
                                        tint = when (rerouteState) {
                                            RerouteState.REROUTE_FAILED -> MaterialTheme.colorScheme.error
                                            else -> MaterialTheme.colorScheme.onSecondaryContainer
                                        },
                                        modifier = Modifier.size(20.dp)
                                    )
                                    
                                    // Status text
                                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(
                                            text = when (rerouteState) {
                                                RerouteState.CLOSEST_POINT_RECOVERY -> "Recovering to route"
                                                RerouteState.DIRECT_PATH_GUIDANCE -> "You're off-route"
                                                RerouteState.API_REROUTING -> "Calculating new route..."
                                                RerouteState.REROUTE_FAILED -> "Reroute failed, tap to retry"
                                                else -> "Off-route"
                                            },
                                            style = MaterialTheme.typography.labelLarge,
                                            fontWeight = FontWeight.SemiBold,
                                            color = when (rerouteState) {
                                                RerouteState.REROUTE_FAILED -> MaterialTheme.colorScheme.error
                                                else -> MaterialTheme.colorScheme.onSecondaryContainer
                                            }
                                        )
                                        Text(
                                            text = "${offRouteDistance.toInt()}m from route",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = when (rerouteState) {
                                                RerouteState.REROUTE_FAILED -> MaterialTheme.colorScheme.onErrorContainer
                                                else -> MaterialTheme.colorScheme.onSecondaryContainer
                                            }
                                        )
                                    }
                                    
                                    // Show loading indicator if rerouting
                                    if (rerouteState == RerouteState.API_REROUTING) {
                                        androidx.compose.material3.CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            strokeWidth = 2.dp,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }
                        
// Calimoto-style trip summary - Collapsed: Distance + ETA only
                // Enhanced compact summary bar with better spacing and visual elements
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { isTripSummaryExpanded = !isTripSummaryExpanded }
                        .padding(horizontal = 24.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Distance remaining - Primary info
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Straight,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = distanceRemaining?.let {
                                    com.scenicroutes.app.utils.DistanceFormatter.formatDistance(
                                        it,
                                        com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()
                                    )
                                } ?: com.scenicroutes.app.utils.DistanceFormatter.formatDistance(
                                    routeWithInstructions.distance.toDouble(),
                                    com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()
                                ),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Text(
                            text = "remaining",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    // Visual separator
                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(32.dp)
                            .background(
                                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                            )
                    )

                    // ETA - Primary info
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                                    .format(java.util.Date(System.currentTimeMillis() + routeWithInstructions.time)),
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Text(
                            text = "ETA",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    // Expand/collapse indicator
                    Icon(
                        if (isTripSummaryExpanded) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowUp,
                        contentDescription = if (isTripSummaryExpanded) "Collapse" else "Expand",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        modifier = Modifier.size(20.dp)
                            )
                        }

                        // Enhanced expanded details with better styling
                        if (isTripSummaryExpanded) {
                            Divider(
                                modifier = Modifier.padding(horizontal = 24.dp),
                                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                thickness = 1.dp
                            )
                            Column(
                                modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                // Route statistics in a more visual format
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Route,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Text(
                                            "Total Distance",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .background(
                                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                                shape = RoundedCornerShape(8.dp)
                                            )
                                            .padding(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            com.scenicroutes.app.utils.DistanceFormatter.formatDistance(
                                                routeWithInstructions.distance.toDouble(),
                                                com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()
                                            ),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }

                                // Estimated arrival time
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.AccessTime,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.secondary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Text(
                                            "ETA",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .background(
                                                color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f),
                                                shape = RoundedCornerShape(8.dp)
                                            )
                                            .padding(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                                                .format(java.util.Date(System.currentTimeMillis() + routeWithInstructions.time)),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.secondary
                                        )
                                    }
                                }
                            }
                        }

                        // Navigation Controls - Integrated into bottom bar
                        // Show "Skip to Scenic Route" button if in Phase 1
                        if (navigationPhase == com.scenicroutes.app.data.service.NavigationPhase.APPROACHING_START) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.Center,
                            ) {
                                Button(
                                    onClick = {
                                        android.util.Log.d("NavigationScreen", "Skip to Scenic Route button clicked")
                                        navigationService.skipToScenicRoute()
                                        android.widget.Toast.makeText(
                                            context,
                                            "Switched to scenic route navigation",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    },
                                    modifier = Modifier.fillMaxWidth(0.8f),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.tertiary,
                                    ),
                                    shape = RoundedCornerShape(12.dp),
                                ) {
                                    Icon(Icons.Default.FastForward, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Skip to Scenic Route")
                                }
                            }
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp)
                                .testTag("navigation_controls_row"),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            OutlinedButton(
                                onClick = { navigationService.speakCurrentInstruction() },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("navigation_repeat_button"),
                                enabled = currentInstruction != null,
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Icon(Icons.Default.VolumeUp, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Repeat")
                            }
                            Button(
                                onClick = {
                                    android.util.Log.d("NavigationScreen", "End Navigation button clicked - showing summary")
                                    showNavigationSummary = true
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("navigation_end_button"),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error,
                                ),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("End Navigation")
                            }
                        }
                    }
                }
                }  // Close the conditional if for navigationUIState
            }
        },
    )

    // Save Recorded Ride Dialog
    if (showSaveRecordingDialog && pendingRecordedRide != null) {
        val ride = pendingRecordedRide!!

        // Auto-generate a default name on first show
        LaunchedEffect(Unit) {
            if (rideName.isEmpty()) {
                val dateFormat = java.text.SimpleDateFormat("MMM d, yyyy 'at' h:mm a", java.util.Locale.getDefault())
                rideName = "Ride on ${dateFormat.format(java.util.Date(ride.startTime))}"
            }
        }

        AlertDialog(
            onDismissRequest = { /* Prevent dismiss to avoid data loss */ },
            title = { Text("Save Recorded Ride") },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Name input field
                    OutlinedTextField(
                        value = rideName,
                        onValueChange = { rideName = it },
                        label = { Text("Ride Name") },
                        placeholder = { Text("Enter a name for this ride") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isSavingRide,
                    )

                    Text(
                        "Ride Statistics:",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = RoundedCornerShape(8.dp)
                            )
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Route,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    DistanceFormatter.formatDistance(ride.totalDistance),
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(top = 4.dp)
                            ) {
                                Icon(
                                    Icons.Default.Timer,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    formatDuration(ride.durationMs),
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                            if (ride.speedStats != null) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Speed,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp),
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        "Avg: ${String.format("%.1f", ride.speedStats.averageSpeed)} km/h",
                                        style = MaterialTheme.typography.labelLarge
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (rideName.isBlank()) {
                            android.widget.Toast.makeText(
                                context,
                                "Please enter a name for the ride",
                                android.widget.Toast.LENGTH_SHORT,
                            ).show()
                            return@Button
                        }

                        // Save the ride to backend
                        isSavingRide = true
                        coroutineScope.launch(Dispatchers.IO) {
                            try {
                                val repository = com.scenicroutes.app.data.repository.SavedRoadRepository()
                                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                val token = tokenManager.token.first()

                                if (token == null) {
                                    throw Exception("Not authenticated")
                                }

                                // Convert ride points to geometry format [[lat, lng], ...]
                                val geometry = ride.points.map { point ->
                                    listOf(point.latitude, point.longitude)
                                }

                                // Calculate start and end locations
                                val startLocation = if (ride.points.isNotEmpty()) {
                                    "${String.format("%.4f", ride.points.first().latitude)}, ${String.format("%.4f", ride.points.first().longitude)}"
                                } else {
                                    "Unknown"
                                }

                                val endLocation = if (ride.points.isNotEmpty()) {
                                    "${String.format("%.4f", ride.points.last().latitude)}, ${String.format("%.4f", ride.points.last().longitude)}"
                                } else {
                                    "Unknown"
                                }

                                val request = com.scenicroutes.app.data.model.SavedRoadRequest(
                                    road_name = rideName,
                                    start_location = startLocation,
                                    end_location = endLocation,
                                    geometry = geometry,
                                    distance = ride.totalDistance,
                                    duration = ride.durationMs,
                                    is_public = false,
                                    avg_speed = ride.speedStats?.averageSpeed,
                                    max_speed = ride.speedStats?.maxSpeed,
                                    elevation_gain = ride.elevationStats?.gain,
                                    elevation_loss = ride.elevationStats?.loss,
                                    max_elevation = ride.elevationStats?.max,
                                    min_elevation = ride.elevationStats?.min,
                                    corner_count = ride.cornerCount,
                                    route_type = "ride", // Mark as recorded ride
                                )

                                val result = repository.saveRoad(token, request)

                                kotlinx.coroutines.withContext(Dispatchers.Main) {
                                    isSavingRide = false
                                    if (result.isSuccess) {
                                        android.widget.Toast.makeText(
                                            context,
                                            "Ride saved successfully!",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                        showSaveRecordingDialog = false
                                        pendingRecordedRide = null
                                        rideName = ""
                                        showPostSaveChoice = true
                                    } else {
                                        android.widget.Toast.makeText(
                                            context,
                                            "Error: ${result.exceptionOrNull()?.message ?: "Failed to save ride"}",
                                            android.widget.Toast.LENGTH_LONG,
                                        ).show()
                                    }
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("NavigationScreen", "Error saving ride", e)
                                kotlinx.coroutines.withContext(Dispatchers.Main) {
                                    isSavingRide = false
                                    android.widget.Toast.makeText(
                                        context,
                                        "Error saving ride: ${e.message}",
                                        android.widget.Toast.LENGTH_LONG,
                                    ).show()
                                }
                            }
                        }
                    },
                    enabled = !isSavingRide,
                ) {
                    if (isSavingRide) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(if (isSavingRide) "Saving..." else "Save Ride")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDiscardConfirm = true
                    },
                    enabled = !isSavingRide,
                ) {
                    Text("Discard")
                }
            },
        )
    }

    // Discard confirmation dialog
    if (showDiscardConfirm) {
        AlertDialog(
            onDismissRequest = { showDiscardConfirm = false },
            title = { Text("Discard recording?") },
            text = { Text("This will delete the recorded ride permanently. Navigation will continue.") },
            confirmButton = {
                TextButton(onClick = {
                    showDiscardConfirm = false
                    showSaveRecordingDialog = false
                    pendingRecordedRide = null
                    rideName = ""
                    // Only discard recording, don't end navigation
                    backgroundRecordingManager.stopBackgroundRecording()
                    android.widget.Toast.makeText(
                        context,
                        "Recording discarded. Navigation continues.",
                        android.widget.Toast.LENGTH_SHORT,
                    ).show()
                }) { Text("Discard Recording") }
            },
            dismissButton = {
                Button(onClick = { showDiscardConfirm = false }) { Text("Cancel") }
            },
        )
    }

    // Start Recording Prompt (shown when navigation starts and not already recording)
    if (showStartRecordingDialog) {
        AlertDialog(
            onDismissRequest = { showStartRecordingDialog = false },
            title = { Text("Record this ride?") },
            text = { Text("Do you want to start recording this ride while navigating?") },
            confirmButton = {
                Button(onClick = {
                    backgroundRecordingManager.startBackgroundRecording()
                    showStartRecordingDialog = false
                    wasRecordingBeforeNavigation = true
                    android.widget.Toast.makeText(
                        context,
                        "Ride recording started",
                        android.widget.Toast.LENGTH_SHORT,
                    ).show()
                }) { Text("Start Recording") }
            },
            dismissButton = {
                TextButton(onClick = { showStartRecordingDialog = false }) { Text("Not now") }
            },
        )
    }

    // Navigation Summary Dialog (after End Navigation)
    if (showNavigationSummary) {
        val totalDistance = routeWithInstructions.distance.toDouble() // in meters
        val elapsedTimeMs = System.currentTimeMillis() - navigationStartTime
        val elapsedMinutes = (elapsedTimeMs / 60000).toInt()
        val hours = elapsedMinutes / 60
        val minutes = elapsedMinutes % 60
        val avgSpeed = if (elapsedTimeMs > 0) (totalDistance / 1000.0) / (elapsedTimeMs / 3600000.0) else 0.0

        AlertDialog(
            onDismissRequest = { /* Prevent dismiss by tapping outside */ },
            title = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        Icons.Default.Flag,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Navigation Complete",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Stats cards
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Distance card
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.Route,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    DistanceFormatter.formatDistance(totalDistance),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                                Text(
                                    "Distance",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }

                        // Duration card
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.Schedule,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer
                                )
                                Text(
                                    "Duration",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer
                                )
                            }
                        }
                    }

                    // Average speed card (full width)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.tertiaryContainer
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Speed,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "${String.format("%.1f", avgSpeed)} km/h",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Avg Speed",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onTertiaryContainer
                            )
                        }
                    }

                    // Ride recording prompt
                    if (isBackgroundRecording) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.FitnessCenter,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Ride is still recording",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (isBackgroundRecording) {
                        TextButton(onClick = {
                            // Keep recording outside navigation
                            showNavigationSummary = false
                            navigationService.stopNavigation()
                            viewModel.clearRoute()
                            navController.navigate("map") {
                                launchSingleTop = true
                                popUpTo("navigation") { inclusive = true }
                            }
                            android.widget.Toast.makeText(
                                context,
                                "Continuing recording",
                                android.widget.Toast.LENGTH_SHORT,
                            ).show()
                        }) { Text("Keep Recording") }
                    }
                    Button(onClick = {
                        showNavigationSummary = false
                        if (isBackgroundRecording) {
                            val recordedRide = backgroundRecordingManager.stopBackgroundRecording()
                            if (recordedRide != null) {
                                pendingRecordedRide = recordedRide
                                showSaveRecordingDialog = true
                            }
                        } else {
                            navigationService.stopNavigation()
                            viewModel.clearRoute()
                            navController.navigate("map") {
                                launchSingleTop = true
                                popUpTo("navigation") { inclusive = true }
                            }
                        }
                    }) { Text(if (isBackgroundRecording) "Save Ride" else "Finish") }
                }
            },
            dismissButton = {
                if (isBackgroundRecording) {
                    TextButton(
                        onClick = {
                            showNavigationSummary = false
                            showPostSaveChoice = false
                            // Only discard recording, continue navigation
                            backgroundRecordingManager.stopBackgroundRecording()
                            android.widget.Toast.makeText(
                                context,
                                "Recording discarded. Navigation continues.",
                                android.widget.Toast.LENGTH_SHORT,
                            ).show()
                        },
                    ) {
                        Text("Discard Recording")
                    }
                } else {
                    null
                }
            },
        )
    }

    // Post-save choice dialog: Continue navigating or exit to map
    if (showPostSaveChoice) {
        AlertDialog(
            onDismissRequest = { showPostSaveChoice = false },
            title = { Text("Recording Saved") },
            text = { Text("What would you like to do next?") },
            confirmButton = {
                Button(onClick = { showPostSaveChoice = false }) { Text("Continue Navigating") }
            },
            dismissButton = {
                TextButton(onClick = {
                    showPostSaveChoice = false
                    navigationService.stopNavigation()
                    viewModel.clearRoute()
                    navController.navigate("map") {
                        launchSingleTop = true
                        popUpTo("navigation") { inclusive = true }
                    }
                }) { Text("Exit to Map") }
            },
        )
    }

    // Permission dialog
    if (showPermissionDialog) {
        AlertDialog(
            onDismissRequest = { showPermissionDialog = false },
            title = { Text("Location Permission Required") },
            text = { Text("ScenicRoutes needs location permission to provide turn-by-turn navigation. Please grant location permission.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        locationPermissionLauncher.launch(android.Manifest.permission.ACCESS_FINE_LOCATION)
                    },
                ) {
                    Text("Grant Permission")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPermissionDialog = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}


// Helper function to format duration in milliseconds
private fun formatDuration(durationMs: Long): String {
    val totalSeconds = durationMs / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60

    return when {
        hours > 0 -> String.format("%d:%02d:%02d", hours, minutes, seconds)
        minutes > 0 -> String.format("%d:%02d", minutes, seconds)
        else -> String.format("%ds", seconds)
    }
}

// Helper function to get appropriate turn icon based on instruction text
private fun getTurnIcon(instructionText: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when {
        instructionText.contains("sharp left", ignoreCase = true) -> Icons.Default.TurnSharpLeft
        instructionText.contains("slight left", ignoreCase = true) -> Icons.Default.TurnSlightLeft
        instructionText.contains("left", ignoreCase = true) -> Icons.Default.TurnLeft
        instructionText.contains("sharp right", ignoreCase = true) -> Icons.Default.TurnSharpRight
        instructionText.contains("slight right", ignoreCase = true) -> Icons.Default.TurnSlightRight
        instructionText.contains("right", ignoreCase = true) -> Icons.Default.TurnRight
        instructionText.contains("straight", ignoreCase = true) ||
        instructionText.contains("continue", ignoreCase = true) -> Icons.Default.Straight
        instructionText.contains("around", ignoreCase = true) ||
        instructionText.contains("u-turn", ignoreCase = true) -> Icons.Default.Undo
        instructionText.contains("roundabout", ignoreCase = true) -> Icons.Default.Refresh
        instructionText.contains("merge", ignoreCase = true) -> Icons.Default.Merge
        instructionText.contains("exit", ignoreCase = true) -> Icons.Default.ExitToApp
        instructionText.contains("arrive", ignoreCase = true) ||
        instructionText.contains("destination", ignoreCase = true) -> Icons.Default.Flag
        else -> Icons.Default.Navigation
    }
}

// Helper function to extract road name from instruction text
private fun extractRoadName(instructionText: String): String {
    // Common patterns for road names in navigation instructions
    val patterns = listOf(
        "onto (.+?)(?=\\s*(?:towards|then|and|$))",
        "on (.+?)(?=\\s*(?:towards|then|and|$))",
        "Take (.+?)(?=\\s*(?:towards|then|and|$))",
        "Continue on (.+?)(?=\\s*(?:towards|then|and|$))"
    )

    for (pattern in patterns) {
        val regex = Regex(pattern, RegexOption.IGNORE_CASE)
        val match = regex.find(instructionText)
        if (match != null) {
            return match.groupValues[1].trim()
        }
    }

    return "" // Return empty if no road name found
}

// Helper functions for generating instructions
private fun calculateBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val dLon = Math.toRadians(lon2 - lon1)
    val lat1Rad = Math.toRadians(lat1)
    val lat2Rad = Math.toRadians(lat2)

    val y = Math.sin(dLon) * Math.cos(lat2Rad)
    val x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

    val bearing = Math.toDegrees(Math.atan2(y, x))
    return (bearing + 360) % 360
}

private fun calculateSegmentDistance(geometry: List<List<Double>>, startIndex: Int, endIndex: Int): Double {
    var totalDistance = 0.0
    for (i in startIndex until endIndex) {
        if (i + 1 < geometry.size) {
            val p1 = geometry[i]
            val p2 = geometry[i + 1]
            if (p1.size >= 2 && p2.size >= 2) {
                totalDistance += calculateHaversineDistance(p1[0], p1[1], p2[0], p2[1])
            }
        }
    }
    return totalDistance
}
