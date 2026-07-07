package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.model.AvoidOptions
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.service.FeatureAccessService
import com.scenicroutes.app.ui.components.FeatureGate
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.first

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutePlanningSheet(
    onDismiss: () -> Unit,
    onCalculateRoute: (
        startLat: Double,
        startLng: Double,
        endLat: Double,
        endLng: Double,
        curvatureLevel: String?,
        avoidOptions: AvoidOptions?,
        waypoints: List<com.scenicroutes.app.data.model.Waypoint>?,
        savedRoadIds: List<Long>?, // IDs of saved roads to include in route
    ) -> Unit,
    onCalculateRoundTrip: ((
        centerLat: Double,
        centerLng: Double,
        distanceKm: Double,
        curvatureLevel: String?,
        waypoints: List<com.scenicroutes.app.data.model.Waypoint>?,
        savedRoadIds: List<Long>?, // IDs of saved roads to include in round trip
    ) -> Unit)? = null,
    onCalculateSegmentCurvatureRoute: (
        (
            startLat: Double,
            startLng: Double,
            endLat: Double,
            endLng: Double,
            segmentCurvature: List<String>,
            avoidOptions: AvoidOptions?,
            waypoints: List<com.scenicroutes.app.data.model.Waypoint>?,
        ) -> Unit
    )? = null,
    startLocation: String? = null,
    endLocation: String? = null,
    initialWaypoints: List<com.scenicroutes.app.data.model.Waypoint>? = null,
    navController: NavController? = null,
) {
    val context = LocalContext.current
    val featureAccessService = remember { FeatureAccessService(context) }
    val coroutineScope = rememberCoroutineScope()
    var hasExtraCurvyAccess by remember { mutableStateOf(false) }
    var hasRoundTripAccess by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        hasExtraCurvyAccess = featureAccessService.hasFeatureAccess("extra_curvy")
        hasRoundTripAccess = featureAccessService.hasFeatureAccess("round_trip_unlimited")
    }
    var startText by remember { mutableStateOf(startLocation ?: "") }
    var endText by remember { mutableStateOf(endLocation ?: "") }
    var selectedCurvature by remember { mutableStateOf<String?>("straightest") } // Default to straightest
    var isRoundTrip by remember { mutableStateOf(false) }
    var roundTripDistance by remember { mutableStateOf("100") } // Default 100km
    var roundTripDistanceError by remember { mutableStateOf<String?>(null) }
    var avoidHighways by remember { mutableStateOf(false) }
    var avoidUnpaved by remember { mutableStateOf(false) }
    var avoidTolls by remember { mutableStateOf(false) }
    var avoidFerries by remember { mutableStateOf(false) }
    var geocodeError by remember { mutableStateOf<String?>(null) }
    var waypoints by remember { mutableStateOf(initialWaypoints ?: emptyList()) }

    // Geocoding service for autocomplete
    val geocodingService = remember { com.scenicroutes.app.data.service.GeocodingService() }
    
    // Remember the updated dismiss callback to ensure it's always current
    val updatedOnDismiss = rememberUpdatedState(onDismiss)

    var sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = { updatedOnDismiss.value() },
        sheetState = sheetState,
        modifier = Modifier.fillMaxHeight(0.9f),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        dragHandle = { BottomSheetDefaults.DragHandle() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Plan Route",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.testTag("plan_route_title"),
                )
                IconButton(
                    onClick = {
                        android.util.Log.d("RoutePlanningSheet", "Close button clicked - calling onDismiss")
                        updatedOnDismiss.value()
                    },
                    modifier = Modifier.testTag("close_route_planning_button"),
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            val coroutineScope = rememberCoroutineScope()

            // Start location with autocomplete
            var startSuggestions by remember { mutableStateOf<List<com.scenicroutes.app.data.service.GeocodeResult>>(emptyList()) }
            var showStartSuggestions by remember { mutableStateOf(false) }

            LaunchedEffect(startText) {
                if (startText.isNotBlank() && startText.length > 2) {
                    kotlinx.coroutines.delay(300)
                    coroutineScope.launch {
                        startSuggestions = geocodingService.searchLocation(startText).take(5)
                        showStartSuggestions = startSuggestions.isNotEmpty()
                    }
                } else {
                    startSuggestions = emptyList()
                    showStartSuggestions = false
                }
            }

            Column {
                OutlinedTextField(
                    value = startText,
                    onValueChange = { startText = it },
                    label = { Text("Start location") },
                    leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("start_location_input"),
                    singleLine = true,
                )

                // Start location suggestions
                if (showStartSuggestions && startSuggestions.isNotEmpty()) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                        ),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 200.dp),
                        ) {
                            startSuggestions.forEach { suggestion ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            startText = suggestion.displayName
                                            showStartSuggestions = false
                                        }
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp),
                                    )
                                    Text(
                                        text = suggestion.displayName,
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // End location with autocomplete
            var endSuggestions by remember { mutableStateOf<List<com.scenicroutes.app.data.service.GeocodeResult>>(emptyList()) }
            var showEndSuggestions by remember { mutableStateOf(false) }

            LaunchedEffect(endText) {
                if (endText.isNotBlank() && endText.length > 2) {
                    kotlinx.coroutines.delay(300)
                    coroutineScope.launch {
                        endSuggestions = geocodingService.searchLocation(endText).take(5)
                        showEndSuggestions = endSuggestions.isNotEmpty()
                    }
                } else {
                    endSuggestions = emptyList()
                    showEndSuggestions = false
                }
            }

            // End location (hidden when round trip is enabled)
            if (!isRoundTrip) {
                Column {
                    OutlinedTextField(
                        value = endText,
                        onValueChange = { endText = it },
                        label = { Text("End location") },
                        leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("end_location_input"),
                        singleLine = true,
                    )

                    // End location suggestions
                    if (showEndSuggestions && endSuggestions.isNotEmpty()) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface,
                            ),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 200.dp),
                            ) {
                                endSuggestions.forEach { suggestion ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                endText = suggestion.displayName
                                                showEndSuggestions = false
                                            }
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(
                                            Icons.Default.LocationOn,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(20.dp),
                                        )
                                        Text(
                                            text = suggestion.displayName,
                                            style = MaterialTheme.typography.bodySmall,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Waypoints section (moved between start and end to match website)
            var showWaypointInput by remember { mutableStateOf(false) }
            var waypointText by remember { mutableStateOf("") }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Waypoints",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    TextButton(
                        onClick = { showWaypointInput = !showWaypointInput },
                        modifier = Modifier.testTag("add_waypoint_button"),
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add")
                    }
                }

                // Waypoint input
                if (showWaypointInput) {
                    var waypointSuggestions by remember { mutableStateOf<List<com.scenicroutes.app.data.service.GeocodeResult>>(emptyList()) }
                    var showWaypointSuggestions by remember { mutableStateOf(false) }

                    LaunchedEffect(waypointText) {
                        if (waypointText.isNotBlank() && waypointText.length > 2) {
                            kotlinx.coroutines.delay(300)
                            coroutineScope.launch {
                                val geocodingService = com.scenicroutes.app.data.service.GeocodingService()
                                waypointSuggestions = geocodingService.searchLocation(waypointText).take(5)
                                showWaypointSuggestions = waypointSuggestions.isNotEmpty()
                            }
                        } else {
                            waypointSuggestions = emptyList()
                            showWaypointSuggestions = false
                        }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = waypointText,
                            onValueChange = { waypointText = it },
                            label = { Text("Waypoint location") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("waypoint_input"),
                            leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null) },
                            trailingIcon = {
                                if (waypointText.isNotBlank()) {
                                    IconButton(onClick = { waypointText = "" }) {
                                        Icon(Icons.Default.Clear, contentDescription = "Clear")
                                    }
                                }
                            },
                        )

                        // Suggestions
                        if (showWaypointSuggestions && waypointSuggestions.isNotEmpty()) {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                ),
                            ) {
                                Column {
                                    waypointSuggestions.forEach { suggestion ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    waypoints = waypoints + com.scenicroutes.app.data.model.Waypoint(
                                                        lat = suggestion.lat,
                                                        lng = suggestion.lon,
                                                        name = suggestion.displayName,
                                                    )
                                                    waypointText = ""
                                                    showWaypointInput = false
                                                }
                                                .padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                                        ) {
                                            Icon(
                                                Icons.Default.LocationOn,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.primary,
                                            )
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = suggestion.displayName,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                )
                                                Text(
                                                    text = "${suggestion.lat}, ${suggestion.lon}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                        if (suggestion != waypointSuggestions.last()) {
                                            Divider()
                                        }
                                    }
                                }
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { showWaypointInput = false },
                                modifier = Modifier.weight(1f),
                            ) {
                                Text("Cancel")
                            }
                        }
                    }
                }

                // Waypoints list
                if (waypoints.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "${waypoints.size} waypoint${if (waypoints.size > 1) "s" else ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (waypoints.size > 1) {
                                TextButton(onClick = { waypoints = emptyList() }) {
                                    Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Clear All", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }

                        waypoints.forEachIndexed { index, waypoint ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                                ),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                                ),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Row(
                                        modifier = Modifier.weight(1f),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    ) {
                                        // Waypoint number badge
                                        Surface(
                                            shape = androidx.compose.foundation.shape.CircleShape,
                                            color = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(32.dp),
                                        ) {
                                            Box(
                                                modifier = Modifier.fillMaxSize(),
                                                contentAlignment = Alignment.Center,
                                            ) {
                                                Text(
                                                    text = "${index + 1}",
                                                    style = MaterialTheme.typography.labelMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.onPrimary,
                                                )
                                            }
                                        }
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = waypoint.name ?: "Waypoint ${index + 1}",
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Medium,
                                            )
                                            Text(
                                                text = "${waypoint.lat}, ${waypoint.lng}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }

                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        if (index > 0) {
                                            IconButton(
                                                onClick = {
                                                    val newWaypoints = waypoints.toMutableList()
                                                    newWaypoints[index] = waypoints[index - 1]
                                                    newWaypoints[index - 1] = waypoints[index]
                                                    waypoints = newWaypoints
                                                },
                                                modifier = Modifier.size(36.dp),
                                            ) {
                                                Icon(
                                                    Icons.Default.ArrowUpward,
                                                    contentDescription = "Move Up",
                                                    modifier = Modifier.size(18.dp),
                                                )
                                            }
                                        }
                                        if (index < waypoints.size - 1) {
                                            IconButton(
                                                onClick = {
                                                    val newWaypoints = waypoints.toMutableList()
                                                    newWaypoints[index] = waypoints[index + 1]
                                                    newWaypoints[index + 1] = waypoints[index]
                                                    waypoints = newWaypoints
                                                },
                                                modifier = Modifier.size(36.dp),
                                            ) {
                                                Icon(
                                                    Icons.Default.ArrowDownward,
                                                    contentDescription = "Move Down",
                                                    modifier = Modifier.size(18.dp),
                                                )
                                            }
                                        }

                                        IconButton(
                                            onClick = { waypoints = waypoints.filterIndexed { i, _ -> i != index } },
                                            modifier = Modifier.size(36.dp),
                                        ) {
                                            Icon(
                                                Icons.Default.Delete,
                                                contentDescription = "Remove",
                                                modifier = Modifier.size(18.dp),
                                                tint = MaterialTheme.colorScheme.error,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Text(
                        text = "No waypoints added. Tap 'Add' to add waypoints to your route.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Saved Roads selection
            var selectedSavedRoadIds by remember { mutableStateOf<Set<Long>>(emptySet()) }
            var showSavedRoadsDialog by remember { mutableStateOf(false) }
            var savedRoads by remember { mutableStateOf<List<com.scenicroutes.app.data.model.SavedRoad>>(emptyList()) }
            var isLoadingSavedRoads by remember { mutableStateOf(false) }

            // Load saved roads when dialog opens
            LaunchedEffect(showSavedRoadsDialog) {
                if (showSavedRoadsDialog && savedRoads.isEmpty() && !isLoadingSavedRoads) {
                    isLoadingSavedRoads = true
                    coroutineScope.launch {
                        try {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            val token = tokenManager.token.first()
                            if (token != null) {
                                val repository = com.scenicroutes.app.data.repository.SavedRoadRepository()
                                repository.getSavedRoads(token).fold(
                                    onSuccess = { roads ->
                                        savedRoads = roads
                                        isLoadingSavedRoads = false
                                    },
                                    onFailure = {
                                        android.util.Log.e("RoutePlanningSheet", "Failed to load saved roads: ${it.message}")
                                        isLoadingSavedRoads = false
                                    }
                                )
                            } else {
                                isLoadingSavedRoads = false
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("RoutePlanningSheet", "Error loading saved roads: ${e.message}")
                            isLoadingSavedRoads = false
                        }
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Saved Roads",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    TextButton(
                        onClick = { showSavedRoadsDialog = true },
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Select")
                    }
                }

                if (selectedSavedRoadIds.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        selectedSavedRoadIds.forEach { roadId ->
                            val road = savedRoads.find { it.id == roadId }
                            road?.let {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                                    ),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = it.road_name,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Medium,
                                            )
                                            Text(
                                                text = "${it.start_location} → ${it.end_location}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        IconButton(
                                            onClick = { selectedSavedRoadIds = selectedSavedRoadIds - roadId },
                                            modifier = Modifier.size(36.dp),
                                        ) {
                                            Icon(
                                                Icons.Default.Close,
                                                contentDescription = "Remove",
                                                modifier = Modifier.size(18.dp),
                                                tint = MaterialTheme.colorScheme.error,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Text(
                        text = "No saved roads selected. Tap 'Select' to add saved roads to your route.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }
            }

            // Saved Roads Selection Dialog
            if (showSavedRoadsDialog) {
                AlertDialog(
                    onDismissRequest = { showSavedRoadsDialog = false },
                    title = { Text("Select Saved Roads") },
                    text = {
                        if (isLoadingSavedRoads) {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                CircularProgressIndicator()
                            }
                        } else if (savedRoads.isEmpty()) {
                            Text("No saved roads available. Save roads from the map first.")
                        } else {
                            LazyColumn(
                                modifier = Modifier.heightIn(max = 400.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                items(savedRoads) { road ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                selectedSavedRoadIds = if (road.id in selectedSavedRoadIds) {
                                                    selectedSavedRoadIds - road.id
                                                } else {
                                                    selectedSavedRoadIds + road.id
                                                }
                                            }
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = road.road_name,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Medium,
                                            )
                                            Text(
                                                text = "${road.start_location} → ${road.end_location}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                        Checkbox(
                                            checked = road.id in selectedSavedRoadIds,
                                            onCheckedChange = {
                                                selectedSavedRoadIds = if (road.id in selectedSavedRoadIds) {
                                                    selectedSavedRoadIds - road.id
                                                } else {
                                                    selectedSavedRoadIds + road.id
                                                }
                                            },
                                        )
                                    }
                                }
                            }
                        }
                    },
                    confirmButton = {
                        TextButton(onClick = { showSavedRoadsDialog = false }) {
                            Text("Done")
                        }
                    },
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Curvature level
            Text(
                text = "Route Type",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            
            // Reset selectedCurvature if extra_curvy selected but no access
            LaunchedEffect(hasExtraCurvyAccess, selectedCurvature, isRoundTrip) {
                if (selectedCurvature == "extra_curvy" && !hasExtraCurvyAccess) {
                    selectedCurvature = "straightest"
                }
            }
            
            // Map UI labels to backend values
            val curvatureOptions = mapOf(
                "Straightest" to "straightest",
                "Mellow" to "balanced",
                "Curved" to "curvy",
                "Extra Curved" to "extra_curvy"
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                curvatureOptions.forEach { (label, backendValue) ->
                    val isExtraCurvy = backendValue == "extra_curvy"
                    val hasAccess = !isExtraCurvy || hasExtraCurvyAccess

                    if (hasAccess) {
                        FilterChip(
                            selected = selectedCurvature == backendValue,
                            onClick = {
                                selectedCurvature = if (selectedCurvature == backendValue) {
                                    null
                                } else {
                                    backendValue
                                }
                            },
                            label = { Text(label) },
                            modifier = Modifier.testTag("curvature_${backendValue}"),
                        )
                    } else {
                        // Show locked chip for extra curvy
                        FilterChip(
                            selected = false,
                            onClick = {
                                // Show upgrade prompt
                                navController?.navigate("subscription") {
                                    launchSingleTop = true
                                }
                            },
                            label = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(label)
                                }
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            ),
                            modifier = Modifier.testTag("curvature_${backendValue}"),
                        )
                    }
                }
            }

            // Avoid options
            Text(
                text = "Avoid",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = avoidHighways,
                    onClick = { avoidHighways = !avoidHighways },
                    label = { Text("Highways") },
                    modifier = Modifier.testTag("avoid_highways"),
                )
                FilterChip(
                    selected = avoidUnpaved,
                    onClick = { avoidUnpaved = !avoidUnpaved },
                    label = { Text("Unpaved") },
                    modifier = Modifier.testTag("avoid_unpaved"),
                )
                FilterChip(
                    selected = avoidTolls,
                    onClick = { avoidTolls = !avoidTolls },
                    label = { Text("Tolls") },
                    modifier = Modifier.testTag("avoid_tolls"),
                )
                FilterChip(
                    selected = avoidFerries,
                    onClick = { avoidFerries = !avoidFerries },
                    label = { Text("Ferries") },
                    modifier = Modifier.testTag("avoid_ferries"),
                )
            }

            // Section-Specific Curvature - HIDDEN (same as website)
            // This feature is not displayed on the website, so it's hidden on Android too

            // Round Trip Option
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                ),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Round Trip",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = if (hasRoundTripAccess) {
                                    "Create a circular route"
                                } else {
                                    "Free tier: up to 300km. Premium: unlimited"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Switch(
                            checked = isRoundTrip,
                            onCheckedChange = { newValue ->
                                if (newValue && !hasRoundTripAccess) {
                                    // Check distance limit for free tier
                                    val distance = roundTripDistance.toDoubleOrNull() ?: 0.0
                                    coroutineScope.launch {
                                        val (allowed, maxDistance) = featureAccessService.canUseRoundTrip(distance)
                                        if (!allowed) {
                                            roundTripDistanceError = "Round trips are limited to ${maxDistance?.toInt()}km for free tier. Upgrade to Premium for unlimited."
                                            isRoundTrip = false
                                        } else {
                                            isRoundTrip = newValue
                                            roundTripDistanceError = null
                                        }
                                    }
                                } else {
                                    isRoundTrip = newValue
                                    roundTripDistanceError = null
                                }
                            },
                            enabled = true, // Always enabled, but will check limits
                            modifier = Modifier.testTag("round_trip_toggle"),
                        )
                    }
                    
                    // Round trip distance input (shown when round trip is enabled)
                    if (isRoundTrip) {
                        OutlinedTextField(
                            value = roundTripDistance,
                            onValueChange = { newValue ->
                                // Only allow numbers and decimal point
                                if (newValue.matches(Regex("^\\d*\\.?\\d*$"))) {
                                    roundTripDistance = newValue
                                    roundTripDistanceError = null
                                    
                                    // Validate distance limit
                                    val distance = newValue.toDoubleOrNull() ?: 0.0
                                    if (distance > 0) {
                                        coroutineScope.launch {
                                            val (allowed, maxDistance) = featureAccessService.canUseRoundTrip(distance)
                                            if (!allowed) {
                                                roundTripDistanceError = "Round trips are limited to ${maxDistance?.toInt()}km for free tier. Upgrade to Premium for unlimited."
                                            }
                                        }
                                    }
                                }
                            },
                            label = { Text("Distance (km)") },
                            leadingIcon = { Icon(Icons.Default.Straighten, contentDescription = null) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("round_trip_distance_input"),
                            singleLine = true,
                            isError = roundTripDistanceError != null,
                            supportingText = roundTripDistanceError?.let { { Text(it) } },
                        )
                        
                        // Show upgrade prompt if user doesn't have unlimited access
                        if (!hasRoundTripAccess) {
                            TextButton(
                                onClick = {
                                    navController?.navigate("subscription") {
                                        launchSingleTop = true
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Upgrade to Premium for unlimited round trips")
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))


            // Geocoding state (for final route calculation)
            var isGeocoding by remember { mutableStateOf(false) }
            var geocodeError by remember { mutableStateOf<String?>(null) }

            // Calculate button
            Button(
                onClick = {
                    if (isRoundTrip) {
                        // Handle round trip calculation
                        isGeocoding = true
                        geocodeError = null
                        roundTripDistanceError = null

                        coroutineScope.launch {
                            try {
                                val distance = roundTripDistance.toDoubleOrNull()
                                if (distance == null || distance <= 0) {
                                    roundTripDistanceError = "Please enter a valid distance"
                                    isGeocoding = false
                                    return@launch
                                }

                                // Check subscription limits
                                val (allowed, maxDistance) = featureAccessService.canUseRoundTrip(distance)
                                if (!allowed) {
                                    roundTripDistanceError = "Round trips are limited to ${maxDistance?.toInt()}km for free tier. Upgrade to Premium for unlimited."
                                    isGeocoding = false
                                    return@launch
                                }

                                // Get center location (use start location as center)
                                val centerResult = geocodingService.searchLocation(startText).firstOrNull()
                                if (centerResult == null) {
                                    geocodeError = "Could not find center location. Please check your input."
                                    isGeocoding = false
                                    return@launch
                                }

                                // Call round trip calculation
                                onCalculateRoundTrip?.invoke(
                                    centerResult.lat,
                                    centerResult.lon,
                                    distance,
                                    selectedCurvature,
                                    null, // TODO: Add UI for round trip waypoints
                                    selectedSavedRoadIds.takeIf { it.isNotEmpty() }?.toList()
                                )
                                isGeocoding = false
                                onDismiss()
                            } catch (e: Exception) {
                                geocodeError = "Error: ${e.message}"
                                isGeocoding = false
                            }
                        }
                    } else {
                        // Handle regular route calculation
                        isGeocoding = true
                        geocodeError = null

                        coroutineScope.launch {
                            try {
                                val startResult = geocodingService.searchLocation(startText).firstOrNull()
                                val endResult = geocodingService.searchLocation(endText).firstOrNull()

                                if (startResult == null || endResult == null) {
                                    geocodeError = "Could not find location. Please check your input."
                                    isGeocoding = false
                                    return@launch
                                }

                                val avoidOptions = if (avoidHighways || avoidUnpaved || avoidTolls || avoidFerries) {
                                    AvoidOptions(
                                        highways = avoidHighways,
                                        unpaved = avoidUnpaved,
                                        tolls = avoidTolls,
                                        ferries = avoidFerries,
                                    )
                                } else {
                                    null
                                }

                                onCalculateRoute(
                                    startResult.lat,
                                    startResult.lon,
                                    endResult.lat,
                                    endResult.lon,
                                    selectedCurvature,
                                    avoidOptions,
                                    waypoints.takeIf { it.isNotEmpty() } ?: null,
                                    selectedSavedRoadIds.takeIf { it.isNotEmpty() }?.toList()
                                )
                                isGeocoding = false
                                onDismiss()
                            } catch (e: Exception) {
                                geocodeError = "Error: ${e.message}"
                                isGeocoding = false
                            }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("calculate_route_button"),
                enabled = when {
                    isRoundTrip -> startText.isNotBlank() && roundTripDistance.isNotBlank() && !isGeocoding && roundTripDistanceError == null
                    else -> startText.isNotBlank() && endText.isNotBlank() && !isGeocoding
                },
            ) {
                if (isGeocoding) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isRoundTrip) "Calculating round trip..." else "Finding locations...",
                        fontWeight = FontWeight.SemiBold,
                    )
                } else {
                    Icon(
                        Icons.Default.Route,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isRoundTrip) "Calculate Round Trip" else "Calculate Route",
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            // Error message
            geocodeError?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}
