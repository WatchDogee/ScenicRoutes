package com.scenicroutes.app.ui.sheets

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Route
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.model.SavedRoad
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import kotlin.math.max
import kotlin.math.min
import kotlin.math.cos
import kotlin.math.PI

/**
 * Route selection sheet for downloading offline maps around saved routes
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RouteSelectionSheet(
    savedRoads: List<SavedRoad>,
    currentRoute: List<GeoPoint>?,
    onDismiss: () -> Unit,
    onRouteSelected: (bounds: BoundingBox, name: String, radiusKm: Double) -> Unit,
) {
    var selectedBufferKm by remember { mutableStateOf(5.0) }
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxHeight(0.8f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            Text(
                text = "Select Route for Offline Download",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                text = "Choose a saved route or current trip to download offline maps around",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            // Buffer radius selection
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Download radius: ${selectedBufferKm.toInt()} km around route",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    
                    Slider(
                        value = selectedBufferKm.toFloat(),
                        onValueChange = { selectedBufferKm = it.toDouble() },
                        valueRange = 1f..25f,
                        steps = 23,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("1 km", style = MaterialTheme.typography.labelSmall)
                        Text("25 km", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            
            // Routes list
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Current trip (if available)
                if (currentRoute != null && currentRoute.size >= 2) {
                    item {
                        RouteCard(
                            name = "Current Trip",
                            description = "Active route in navigation",
                            pointCount = currentRoute.size,
                            icon = Icons.Default.DirectionsWalk,
                            onClick = {
                                val bounds = calculateBoundsFromRoute(currentRoute, selectedBufferKm)
                                onRouteSelected(bounds, "Current Trip", selectedBufferKm)
                            }
                        )
                    }
                }
                
                // Saved roads
                items(savedRoads) { road ->
                    val geometry = road.geometry
                    if (geometry != null && geometry.isNotEmpty()) {
                        val points = geometry.map { coord ->
                            GeoPoint(coord[1], coord[0]) // lat, lon
                        }
                        
                        RouteCard(
                            name = road.road_name,
                            description = "${road.start_location} → ${road.end_location}",
                            pointCount = points.size,
                            distance = road.distance,
                            icon = Icons.Default.Route,
                            onClick = {
                                val bounds = calculateBoundsFromRoute(points, selectedBufferKm)
                                onRouteSelected(bounds, road.road_name, selectedBufferKm)
                            }
                        )
                    }
                }
            }
            
            // Cancel button
            TextButton(
                onClick = onDismiss,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
            ) {
                Text("Cancel")
            }
        }
    }
}

@Composable
private fun RouteCard(
    name: String,
    description: String,
    pointCount: Int,
    distance: Double? = null,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Row(
                    modifier = Modifier.padding(top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "$pointCount points",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    if (distance != null) {
                        Text(
                            text = "%.1f km".format(distance),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

/**
 * Calculate bounding box from route points with a buffer
 */
private fun calculateBoundsFromRoute(points: List<GeoPoint>, bufferKm: Double): BoundingBox {
    if (points.isEmpty()) {
        // Return default bounds if no points
        return BoundingBox(0.0, 0.0, 0.0, 0.0)
    }
    
    // Find min/max lat/lon from route
    var minLat = points[0].latitude
    var maxLat = points[0].latitude
    var minLon = points[0].longitude
    var maxLon = points[0].longitude
    
    for (point in points) {
        minLat = min(minLat, point.latitude)
        maxLat = max(maxLat, point.latitude)
        minLon = min(minLon, point.longitude)
        maxLon = max(maxLon, point.longitude)
    }
    
    // Add buffer (approximate: 1 degree latitude ≈ 111 km)
    val bufferDegrees = bufferKm / 111.0
    val centerLat = (minLat + maxLat) / 2
    val bufferDegreesLon = bufferKm / (111.0 * cos(centerLat * PI / 180.0))
    
    val north = (maxLat + bufferDegrees).coerceAtMost(85.0)
    val south = (minLat - bufferDegrees).coerceAtLeast(-85.0)
    val east = (maxLon + bufferDegreesLon).coerceAtMost(180.0)
    val west = (minLon - bufferDegreesLon).coerceAtLeast(-180.0)
    
    return BoundingBox(north, east, south, west)
}
