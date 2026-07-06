package com.scenicroutes.app.ui.screens.map

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.RoadNetworkSearch
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoadNetworkDetailsSheet(
    road: RoadNetworkSearch,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onNavigate: () -> Unit = {},
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var matchingSavedRoad by remember { mutableStateOf<SavedRoad?>(null) }
    var isLoadingMatchingRoad by remember { mutableStateOf(false) }

    // Try to find a matching saved road by searching nearby public roads
    LaunchedEffect(road.id) {
        isLoadingMatchingRoad = true
        coroutineScope.launch {
            try {
                val apiService = NetworkModule.apiService
                // Get center point of road
                val centerLat = road.coordinates.map { it[0] }.average()
                val centerLon = road.coordinates.map { it[1] }.average()

                // Search for public roads nearby
                val response = apiService.getPublicRoads(
                    lat = centerLat,
                    lng = centerLon,
                    radius = 1.0, // 1km radius
                )

                if (response.isSuccessful && response.body() != null) {
                    val publicRoads = response.body()!!.roads
                    // Try to find a road with similar geometry
                    matchingSavedRoad = publicRoads.firstOrNull { savedRoad: com.scenicroutes.app.data.model.SavedRoad ->
                        // Simple matching: check if road names are similar or if geometries overlap
                        savedRoad.road_name.equals(road.name, ignoreCase = true) ||
                            (
                                savedRoad.geometry != null && savedRoad.geometry.isNotEmpty() &&
                                    road.coordinates.isNotEmpty() &&
                                    // Check if start/end points are close
                                    savedRoad.geometry.firstOrNull()?.let { savedStart: List<Double> ->
                                        road.coordinates.firstOrNull()?.let { roadStart: List<Double> ->
                                            val distance = calculateDistance(
                                                savedStart[0], savedStart[1],
                                                roadStart[0], roadStart[1],
                                            )
                                            distance < 100 // Within 100m
                                        } ?: false
                                    } ?: false
                                )
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("RoadNetworkDetails", "Error finding matching saved road: ${e.message}", e)
            } finally {
                isLoadingMatchingRoad = false
            }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxHeight(0.8f),
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
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = road.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    if (road.isConnected) {
                        Text(
                            text = "Connected road segments",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            Divider()

            // Road Photos (if matching saved road found)
            matchingSavedRoad?.photos?.let { photos ->
                if (photos.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "Photos (${photos.size})",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                        )
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            itemsIndexed(photos) { index, photo ->
                                Card(
                                    modifier = Modifier.size(120.dp),
                                    shape = RoundedCornerShape(12.dp),
                                ) {
                                    AsyncImage(
                                        model = photo.url,
                                        contentDescription = "Photo ${index + 1}",
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Rating and Review Count (if matching saved road found)
            matchingSavedRoad?.let { savedRoad ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    savedRoad.rating?.let { rating ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = String.format("%.1f", rating),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            if (savedRoad.review_count > 0) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "(${savedRoad.review_count} reviews)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }

            // Road Info - Distance and Analytics
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                InfoCard(
                    icon = Icons.Default.Straighten,
                    label = "Distance",
                    value = "${String.format("%.1f", road.length / 1000.0)} km",
                    modifier = Modifier.weight(1f),
                )
                InfoCard(
                    icon = Icons.Default.TrendingUp,
                    label = "Twistiness",
                    value = String.format("%.4f", road.twistiness),
                    modifier = Modifier.weight(1f),
                )
            }

            // Rating/Review info if this road has been saved and reviewed
            // This would need to be fetched separately if available

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                InfoCard(
                    icon = Icons.Default.TurnRight,
                    label = "Corners",
                    value = "${road.corner_count}",
                    modifier = Modifier.weight(1f),
                )
                if (road.min_elevation != null && road.max_elevation != null) {
                    InfoCard(
                        icon = Icons.Default.Terrain,
                        label = "Elevation",
                        value = "${road.min_elevation?.toInt()}m - ${road.max_elevation?.toInt()}m",
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            // Elevation gain/loss if available
            if (road.elevation_gain != null || road.elevation_loss != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    road.elevation_gain?.let {
                        InfoCard(
                            icon = Icons.Default.ArrowUpward,
                            label = "Elevation Gain",
                            value = "${it.toInt()} m",
                            modifier = Modifier.weight(1f),
                        )
                    }
                    road.elevation_loss?.let {
                        InfoCard(
                            icon = Icons.Default.ArrowDownward,
                            label = "Elevation Loss",
                            value = "${it.toInt()} m",
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            // Curvature level indicator
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = when {
                        road.twistiness > 0.007 -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                        road.twistiness > 0.0035 -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
                        else -> MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
                    },
                ),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = when {
                            road.twistiness > 0.007 -> Icons.Default.TrendingUp
                            road.twistiness > 0.0035 -> Icons.Default.TrendingUp
                            else -> Icons.Default.TrendingFlat
                        },
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = when {
                                road.twistiness > 0.007 -> "Very Curved"
                                road.twistiness > 0.0035 -> "Moderately Curved"
                                else -> "Mellow"
                            },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = "Curvature level based on twistiness",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onNavigate,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Navigate")
                }
                Button(
                    onClick = onSave,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Save Road")
                }
            }
        }
    }
}

// Helper function to calculate distance between two points (Haversine formula)
private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val earthRadius = 6371000.0 // meters
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
        kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) *
        kotlin.math.sin(dLon / 2) * kotlin.math.sin(dLon / 2)
    val c = 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
    return earthRadius * c
}
