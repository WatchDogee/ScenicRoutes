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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.model.POI
import com.scenicroutes.app.data.model.POIType
import com.scenicroutes.app.data.model.Route
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.*

data class POIWithDistance(
    val poi: POI,
    val distanceFromRoute: Double, // in km
    val status: String, // "on_route", "near_route", "far_from_route"
)

// Helper function for haversine distance calculation
private fun haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double, R: Double): Double {
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2) +
        cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
        sin(dLon / 2).pow(2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c
}

// Calculate distance from point to route line
private fun distanceFromRoute(poiLat: Double, poiLng: Double, routeGeometry: List<List<Double>>): Double {
    if (routeGeometry.isEmpty()) return Double.MAX_VALUE

    var minDistance = Double.MAX_VALUE
    val R = 6371.0 // Earth radius in km

    // Check distance to each segment of the route
    for (i in 0 until routeGeometry.size - 1) {
        val p1 = routeGeometry[i]
        val p2 = routeGeometry[i + 1]

        if (p1.size < 2 || p2.size < 2) continue

        val lat1 = p1[0]
        val lon1 = p1[1]
        val lat2 = p2[0]
        val lon2 = p2[1]

        // Calculate distance from POI to line segment endpoints
        val dist1 = haversineDistance(poiLat, poiLng, lat1, lon1, R)
        val dist2 = haversineDistance(poiLat, poiLng, lat2, lon2, R)

        minDistance = minOf(minDistance, dist1, dist2)
    }

    return minDistance
}

/**
 * Enhanced POI Along Route Sheet
 * Shows POIs along a calculated route with distance calculations and filtering
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POIAlongRouteSheet(
    route: Route?,
    onDismiss: () -> Unit,
    onAddWaypoint: (Double, Double, String?) -> Unit,
    onRecalculateRoute: () -> Unit = {},
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var poisAlongRoute by remember { mutableStateOf<List<POIWithDistance>>(emptyList()) }
    var filteredPois by remember { mutableStateOf<List<POIWithDistance>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var selectedCategories by remember { mutableStateOf(setOf(POIType.FUEL, POIType.CHARGING, POIType.TOURISM)) }
    var maxDistanceFromRoute by remember { mutableStateOf(5.0) } // km

    // Fetch POIs along route
    LaunchedEffect(route, selectedCategories, maxDistanceFromRoute) {
        if (route == null || route.geometry.isEmpty()) {
            poisAlongRoute = emptyList()
            filteredPois = emptyList()
            return@LaunchedEffect
        }

        isLoading = true

        coroutineScope.launch {
            try {
                val poiRepository = com.scenicroutes.app.data.repository.POIRepository()
                val allPois = mutableListOf<POI>()
                val searchRadius = 10.0 // km

                // Sample points along route (every 20th point, max 20 points)
                val sampleInterval = maxOf(1, route.geometry.size / 20)
                val searchPoints = mutableListOf<Pair<Double, Double>>()

                for (i in route.geometry.indices step sampleInterval) {
                    val coord = route.geometry[i]
                    if (coord.size >= 2) {
                        searchPoints.add(Pair(coord[0], coord[1]))
                    }
                }

                // Fetch POIs at each search point
                for ((lat, lng) in searchPoints) {
                    if (selectedCategories.contains(POIType.FUEL)) {
                        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                            poiRepository.searchPOIs(lat, lng, searchRadius, "fuel").fold(
                                onSuccess = { pois -> allPois.addAll(pois) },
                                onFailure = { },
                            )
                        }
                    }
                    if (selectedCategories.contains(POIType.CHARGING)) {
                        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                            poiRepository.searchPOIs(lat, lng, searchRadius, "charging").fold(
                                onSuccess = { pois -> allPois.addAll(pois) },
                                onFailure = { },
                            )
                        }
                    }
                    if (selectedCategories.contains(POIType.TOURISM)) {
                        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                            poiRepository.searchPOIs(lat, lng, searchRadius, "tourism").fold(
                                onSuccess = { pois -> allPois.addAll(pois) },
                                onFailure = { },
                            )
                        }
                    }
                }

                // Remove duplicates
                val uniquePois = allPois.distinctBy { it.id ?: "${it.lat}_${it.lng}" }

                // Calculate distance from route for each POI
                val poisWithDistance = uniquePois.map { poi ->
                    val distance = distanceFromRoute(poi.lat, poi.lng, route.geometry)
                    val status = when {
                        distance < 0.5 -> "on_route"
                        distance < 2.0 -> "near_route"
                        else -> "far_from_route"
                    }
                    POIWithDistance(poi, distance, status)
                }

                // Filter by max distance
                val filtered = poisWithDistance.filter { it.distanceFromRoute <= maxDistanceFromRoute }
                    .sortedBy { it.distanceFromRoute }

                poisAlongRoute = filtered
                filteredPois = filtered
            } catch (e: Exception) {
                android.util.Log.e("POIAlongRoute", "Error fetching POIs: ${e.message}", e)
            } finally {
                isLoading = false
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxHeight(0.9f),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
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
                    text = "POIs Along Route",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            if (route == null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Default.Route,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = "No route calculated",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            text = "Calculate a route first to see POIs along the way",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            } else {
                // Filters
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                    ),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(
                            text = "Filter by Category",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            FilterChip(
                                selected = selectedCategories.contains(POIType.FUEL),
                                onClick = {
                                    selectedCategories = if (selectedCategories.contains(POIType.FUEL)) {
                                        selectedCategories - POIType.FUEL
                                    } else {
                                        selectedCategories + POIType.FUEL
                                    }
                                },
                                label = { Text("Fuel") },
                                leadingIcon = {
                                    Icon(Icons.Default.LocalGasStation, null, modifier = Modifier.size(18.dp))
                                },
                            )
                            FilterChip(
                                selected = selectedCategories.contains(POIType.CHARGING),
                                onClick = {
                                    selectedCategories = if (selectedCategories.contains(POIType.CHARGING)) {
                                        selectedCategories - POIType.CHARGING
                                    } else {
                                        selectedCategories + POIType.CHARGING
                                    }
                                },
                                label = { Text("Charging") },
                                leadingIcon = {
                                    Icon(Icons.Default.ElectricCar, null, modifier = Modifier.size(18.dp))
                                },
                            )
                            FilterChip(
                                selected = selectedCategories.contains(POIType.TOURISM),
                                onClick = {
                                    selectedCategories = if (selectedCategories.contains(POIType.TOURISM)) {
                                        selectedCategories - POIType.TOURISM
                                    } else {
                                        selectedCategories + POIType.TOURISM
                                    }
                                },
                                label = { Text("Tourism") },
                                leadingIcon = {
                                    Icon(Icons.Default.Place, null, modifier = Modifier.size(18.dp))
                                },
                            )
                        }

                        Divider()

                        Text(
                            text = "Max Distance from Route: ${String.format("%.1f", maxDistanceFromRoute)} km",
                            style = MaterialTheme.typography.labelMedium,
                        )
                        Slider(
                            value = maxDistanceFromRoute.toFloat(),
                            onValueChange = { maxDistanceFromRoute = it.toDouble() },
                            valueRange = 0.5f..20f,
                            steps = 39,
                        )
                    }
                }

                // POI List
                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (filteredPois.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                Icons.Default.Place,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = "No POIs found",
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                text = "Try adjusting filters or increasing max distance",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                } else {
                    Text(
                        text = "Found ${filteredPois.size} POI${if (filteredPois.size != 1) "s" else ""}",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )

                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(filteredPois) { poiWithDistance ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = when (poiWithDistance.status) {
                                        "on_route" -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                                        "near_route" -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
                                        else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                                    },
                                ),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            onAddWaypoint(
                                                poiWithDistance.poi.lat,
                                                poiWithDistance.poi.lng,
                                                poiWithDistance.poi.name,
                                            )
                                            onRecalculateRoute()
                                            onDismiss()
                                        }
                                        .padding(16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        imageVector = when (poiWithDistance.poi.type) {
                                            POIType.TOURISM -> Icons.Default.Place
                                            POIType.FUEL -> Icons.Default.LocalGasStation
                                            POIType.CHARGING -> Icons.Default.ElectricCar
                                        },
                                        contentDescription = null,
                                        modifier = Modifier.size(32.dp),
                                        tint = MaterialTheme.colorScheme.primary,
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = poiWithDistance.poi.name,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                        Text(
                                            text = poiWithDistance.poi.address ?: "${String.format("%.4f", poiWithDistance.poi.lat)}, ${String.format("%.4f", poiWithDistance.poi.lng)}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = when (poiWithDistance.status) {
                                                    "on_route" -> MaterialTheme.colorScheme.primary
                                                    "near_route" -> MaterialTheme.colorScheme.secondary
                                                    else -> MaterialTheme.colorScheme.surfaceVariant
                                                },
                                            ) {
                                                Text(
                                                    text = when (poiWithDistance.status) {
                                                        "on_route" -> "On Route"
                                                        "near_route" -> "Near Route"
                                                        else -> "Far from Route"
                                                    },
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = when (poiWithDistance.status) {
                                                        "on_route" -> MaterialTheme.colorScheme.onPrimary
                                                        "near_route" -> MaterialTheme.colorScheme.onSecondary
                                                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                                                    },
                                                )
                                            }
                                            Text(
                                                text = "${String.format("%.1f", poiWithDistance.distanceFromRoute)} km from route",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = "Add as waypoint",
                                        tint = MaterialTheme.colorScheme.primary,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
