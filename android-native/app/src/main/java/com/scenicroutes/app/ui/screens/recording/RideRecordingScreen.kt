package com.scenicroutes.app.ui.screens.recording

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.service.FeatureAccessService
import com.scenicroutes.app.ui.components.FeatureGate
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RideRecordingScreen(
    navController: NavController,
    linkedRouteId: String? = null,
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val locationTrackingService = remember { com.scenicroutes.app.data.service.LocationTrackingService(context) }
    val featureAccessService = remember { FeatureAccessService(context) }
    
    // Store route ID when component is created
    LaunchedEffect(linkedRouteId) {
        if (linkedRouteId != null && !locationTrackingService.isTracking.value) {
            // Route geometry would need to be passed separately if needed for comparison
            // For now, we just store the route ID
        }
    }

    val isTracking by locationTrackingService.isTracking.collectAsState()
    val isPaused by locationTrackingService.isPaused.collectAsState()
    val trackedPoints by locationTrackingService.trackedPoints.collectAsState()
    val totalDistance by locationTrackingService.totalDistance.collectAsState()
    val currentLocation by locationTrackingService.currentLocation.collectAsState()
    val cornerCount by locationTrackingService.cornerCount.collectAsState()
    val elevationStats by locationTrackingService.elevationStats.collectAsState()
    val speedStats by locationTrackingService.speedStats.collectAsState()

    var startTime by remember { mutableStateOf<Long?>(null) }
    var showSaveDialog by remember { mutableStateOf(false) }
    var showExportDialog by remember { mutableStateOf(false) }
    var hasAccess by remember { mutableStateOf(false) }

    // Check feature access
    LaunchedEffect(Unit) {
        android.util.Log.d("RideRecordingScreen", "LaunchedEffect(Unit) - Checking feature access")
        try {
            hasAccess = featureAccessService.hasFeatureAccess("ride_recording")
            android.util.Log.d("RideRecordingScreen", "Feature access check completed: hasAccess=$hasAccess")
        } catch (e: Exception) {
            android.util.Log.e("RideRecordingScreen", "Error checking feature access", e)
            hasAccess = false
        }
    }

    // Update start time when tracking starts
    LaunchedEffect(isTracking) {
        if (isTracking && startTime == null) {
            startTime = System.currentTimeMillis()
        } else if (!isTracking) {
            startTime = null
        }
    }

    android.util.Log.d("RideRecordingScreen", "About to compose Scaffold")
    
    Scaffold(
        topBar = {
            android.util.Log.d("RideRecordingScreen", "Composing TopAppBar")
            TopAppBar(
                title = { 
                    android.util.Log.d("RideRecordingScreen", "Composing title text")
                    Text("Ride Recording", modifier = Modifier.testTag("ride_recording_title")) 
                },
                navigationIcon = {
                    android.util.Log.d("RideRecordingScreen", "Composing back button")
                    IconButton(
                        onClick = { 
                            android.util.Log.d("RideRecordingScreen", "Back button clicked, popping back stack")
                            navController.popBackStack() 
                        }, 
                        modifier = Modifier.testTag("ride_recording_back_button")
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        android.util.Log.d("RideRecordingScreen", "Scaffold content lambda called, padding=$padding")
        FeatureGate(
            feature = "ride_recording",
            fallback = { requiredTier ->
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
                        feature = "ride_recording",
                        navController = navController,
                    )
                }
            },
            content = {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Recording Status Card
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("ride_recording_status_card"),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isTracking && !isPaused) {
                                MaterialTheme.colorScheme.errorContainer
                            } else if (isPaused) {
                                MaterialTheme.colorScheme.tertiaryContainer
                            } else {
                                MaterialTheme.colorScheme.surfaceVariant
                            },
                        ),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            Icon(
                                when {
                                    isTracking && !isPaused -> Icons.Default.RadioButtonChecked
                                    isPaused -> Icons.Default.Pause
                                    else -> Icons.Default.RadioButtonUnchecked
                                },
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = when {
                                    isTracking && !isPaused -> MaterialTheme.colorScheme.error
                                    isPaused -> MaterialTheme.colorScheme.tertiary
                                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                            Text(
                                text = when {
                                    isTracking && !isPaused -> "Recording..."
                                    isPaused -> "Paused"
                                    else -> "Not Recording"
                                },
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            
                            // Show route linking indicator if recording from a route
                            if (linkedRouteId != null) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            Icons.Default.Navigation,
                                            contentDescription = null,
                                            modifier = Modifier.size(16.dp),
                                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                        )
                                        Text(
                                            text = "Recording from route",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        )
                                    }
                                }
                            }

                            if (isTracking && startTime != null) {
                                val elapsedTime = remember(startTime) {
                                    (System.currentTimeMillis() - (startTime ?: 0)) / 1000
                                }
                                var displayTime by remember { mutableStateOf(elapsedTime) }

                                LaunchedEffect(isTracking, isPaused) {
                                    while (isTracking && !isPaused) {
                                        kotlinx.coroutines.delay(1000)
                                        displayTime = (System.currentTimeMillis() - (startTime ?: 0)) / 1000
                                    }
                                }

                                Text(
                                    text = "${displayTime / 60}:${String.format("%02d", displayTime % 60)}",
                                    style = MaterialTheme.typography.displaySmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }

                            // Current location info
                            currentLocation?.let { location ->
                                Text(
                                    text = "${String.format("%.6f", location.latitude)}, ${String.format("%.6f", location.longitude)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }

                    // Stats - Row 1: Distance and Duration
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(
                                    text = "${String.format("%.2f", totalDistance / 1000)} km",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text("Distance", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                val currentStartTime = startTime
                                if (currentStartTime != null && isTracking) {
                                    val elapsedSeconds = (System.currentTimeMillis() - currentStartTime) / 1000
                                    val hours = elapsedSeconds / 3600
                                    val minutes = (elapsedSeconds % 3600) / 60
                                    val seconds = elapsedSeconds % 60
                                    Text(
                                        text = if (hours > 0) {
                                            "${hours}h ${minutes}m"
                                        } else {
                                            "${minutes}m ${seconds}s"
                                        },
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                } else {
                                    Text(
                                        text = "--:--",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                                Text("Duration", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                    
                    // Stats - Row 2: Speed and Elevation
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                val currentSpeedStats = speedStats
                                Text(
                                    text = currentSpeedStats?.let {
                                        "${String.format("%.1f", it.averageSpeed)} km/h"
                                    } ?: "-- km/h",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text("Avg Speed", style = MaterialTheme.typography.bodySmall)
                                currentSpeedStats?.let { stats ->
                                    Text(
                                        text = "Max: ${String.format("%.1f", stats.maxSpeed)} km/h",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                val currentElevationStats = elevationStats
                                Text(
                                    text = currentElevationStats?.let {
                                        "${it.gain.toInt()} m"
                                    } ?: "-- m",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text("Elevation Gain", style = MaterialTheme.typography.bodySmall)
                                currentElevationStats?.let { stats ->
                                    Text(
                                        text = "Loss: ${stats.loss.toInt()} m",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                    
                    // Stats - Row 3: Corners
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text = "$cornerCount",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Text("Corners Detected", style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    // Control Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        if (!isTracking) {
                            Button(
                                onClick = {
                                    if (locationTrackingService.hasLocationPermission()) {
                                        // Start tracking with route linking if route ID is available
                                        locationTrackingService.startTracking(
                                            routeId = linkedRouteId,
                                            routeGeometry = null // Could pass route geometry if available
                                        )
                                    } else {
                                        android.widget.Toast.makeText(
                                            context,
                                            "Location permission required",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("ride_recording_start_button"),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error,
                                ),
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Start Recording", style = MaterialTheme.typography.titleMedium)
                            }
                        } else {
                            Button(
                                onClick = {
                                    locationTrackingService.stopTracking()
                                    // Show notification
                                    val notificationService = com.scenicroutes.app.data.service.NotificationService(context)
                                    val distanceKm = String.format("%.2f", totalDistance / 1000.0)
                                    val durationMin = startTime?.let { (System.currentTimeMillis() - it) / 1000 / 60 } ?: 0
                                    notificationService.showGeneralNotification(
                                        title = "Ride Recording Stopped",
                                        message = "Recording saved. Distance: $distanceKm km, Duration: $durationMin min",
                                    )
                                    if (trackedPoints.isNotEmpty()) {
                                        showSaveDialog = true
                                    }
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("ride_recording_stop_button"),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error,
                                ),
                            ) {
                                Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Stop Recording", style = MaterialTheme.typography.titleMedium)
                            }
                            
                            OutlinedButton(
                                onClick = {
                                    locationTrackingService.pauseTracking()
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("ride_recording_pause_button"),
                            ) {
                                Icon(Icons.Default.Pause, contentDescription = null, modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Pause", style = MaterialTheme.typography.titleMedium)
                            }
                        }
                    }

                    if (isPaused) {
                        // Resume option after pausing
                        Button(
                            onClick = {
                                if (locationTrackingService.hasLocationPermission()) {
                                    locationTrackingService.resumeTracking()
                                } else {
                                    android.widget.Toast.makeText(
                                        context,
                                        "Location permission required",
                                        android.widget.Toast.LENGTH_SHORT,
                                    ).show()
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("ride_recording_resume_button"),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error,
                            ),
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Resume Recording", style = MaterialTheme.typography.titleMedium)
                        }
                        
                    }
                    
                    if (trackedPoints.isNotEmpty() && !isTracking && !isPaused) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            OutlinedButton(
                                onClick = { showSaveDialog = true },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("ride_recording_save_button"),
                            ) {
                                Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Save Ride")
                            }
                            OutlinedButton(
                                onClick = { showExportDialog = true },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("ride_recording_export_button"),
                            ) {
                                Icon(Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Export GPX")
                            }
                        }
                    }

                    // Save Ride Dialog
                    if (showSaveDialog) {
                        SaveRideDialog(
                            trackedPoints = trackedPoints,
                            totalDistance = totalDistance,
                            duration = startTime?.let { System.currentTimeMillis() - it } ?: 0L,
                            onDismiss = { showSaveDialog = false },
                            navController = navController,
                            onSave = { name, description, isPublic ->
                                showSaveDialog = false
                                coroutineScope.launch {
                                    try {
                                        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                        val token = tokenManager.token.first()
                                        if (token == null) {
                                            android.widget.Toast.makeText(
                                                context,
                                                "Please log in to save rides",
                                                android.widget.Toast.LENGTH_SHORT,
                                            ).show()
                                            return@launch
                                        }

                                        // Convert GeoPoints to geometry format (List<List<Double>>)
                                        val geometry = trackedPoints.map { geoPoint ->
                                            listOf(geoPoint.longitude, geoPoint.latitude) // [lon, lat] format
                                        }

                                        // Calculate start and end locations
                                        val startLocation = if (trackedPoints.isNotEmpty()) {
                                            val start = trackedPoints.first()
                                            "${String.format("%.4f", start.latitude)}, ${String.format("%.4f", start.longitude)}"
                                        } else {
                                            "Start"
                                        }

                                        val endLocation = if (trackedPoints.isNotEmpty()) {
                                            val end = trackedPoints.last()
                                            "${String.format("%.4f", end.latitude)}, ${String.format("%.4f", end.longitude)}"
                                        } else {
                                            "End"
                                        }

                                        // Convert distance from meters to kilometers
                                        val distanceKm = totalDistance / 1000.0

                                        // Calculate duration in seconds
                                        val durationSeconds = (startTime?.let { System.currentTimeMillis() - it } ?: 0L) / 1000

                                        // Get statistics
                                        val elevationStats = locationTrackingService.elevationStats.value
                                        val speedStats = locationTrackingService.speedStats.value
                                        val linkedRouteId = locationTrackingService.getLinkedRouteId()
                                        
                                        // Create SavedRoadRequest with enhanced statistics
                                        val request = com.scenicroutes.app.data.model.SavedRoadRequest(
                                            road_name = name,
                                            start_location = startLocation,
                                            end_location = endLocation,
                                            geometry = geometry,
                                            distance = distanceKm,
                                            duration = durationSeconds,
                                            is_public = isPublic,
                                            // Enhanced statistics
                                            avg_speed = speedStats?.averageSpeed,
                                            max_speed = speedStats?.maxSpeed,
                                            elevation_gain = elevationStats?.gain,
                                            elevation_loss = elevationStats?.loss,
                                            max_elevation = elevationStats?.max,
                                            min_elevation = elevationStats?.min,
                                            corner_count = locationTrackingService.cornerCount.value.takeIf { it > 0 },
                                            route_id = linkedRouteId,
                                            route_type = "ride", // Mark as recorded ride
                                        )

                                        // Save via repository
                                        val savedRoadRepository = com.scenicroutes.app.data.repository.SavedRoadRepository()
                                        val result = savedRoadRepository.saveRoad(token, request)

                                        result.fold(
                                            onSuccess = { savedRoad ->
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Ride saved successfully!",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                                // Show notification
                                                val notificationService = com.scenicroutes.app.data.service.NotificationService(context)
                                                notificationService.showGeneralNotification(
                                                    title = "Ride Saved",
                                                    message = "$name has been saved to your trips",
                                                )
                                                // Clear tracked points after successful save
                                                locationTrackingService.clearTrack()
                                            },
                                            onFailure = { error ->
                                                android.util.Log.e("RideRecording", "Failed to save ride: ${error.message}", error)
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Failed to save ride: ${error.message}",
                                                    android.widget.Toast.LENGTH_LONG,
                                                ).show()
                                            },
                                        )
                                    } catch (e: Exception) {
                                        android.util.Log.e("RideRecording", "Error saving ride: ${e.message}", e)
                                        android.widget.Toast.makeText(
                                            context,
                                            "Error: ${e.message}",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                }
                            },
                        )
                    }

                    // Export GPX Dialog
                    if (showExportDialog) {
                        ExportRideGPXDialog(
                            trackedPoints = trackedPoints,
                            onDismiss = { showExportDialog = false },
                            onExport = {
                                showExportDialog = false
                                // Export functionality will be in dialog
                            },
                        )
                    }
                } // Close Column content
            }, // Close FeatureGate content lambda
        ) // Close FeatureGate
        android.util.Log.d("RideRecordingScreen", "Scaffold composition completed successfully")
    } // Close Scaffold content lambda
    android.util.Log.d("RideRecordingScreen", "=== RideRecordingScreen COMPOSITION COMPLETE ===")
} // Close function
