package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.data.model.Weather
import com.scenicroutes.app.utils.SettingsManager
import com.scenicroutes.app.utils.DistanceFormatter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun RouteInfoCard(
    route: Route,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    onShare: () -> Unit,
    onNavigate: () -> Unit,
    alternativeRoutes: List<Route> = emptyList(),
    onShowAlternatives: () -> Unit = {},
    routeWeather: Weather? = null,
    isLoadingWeather: Boolean = false,
    onEditRoute: (() -> Unit)? = null,
    onStartRecording: (() -> Unit)? = null, // Optional callback for starting recording with route
    saveRouteState: com.scenicroutes.app.ui.viewmodel.SaveRouteState = com.scenicroutes.app.ui.viewmodel.SaveRouteState.Idle, // Save state for animated feedback
) {
    var showShareDialog by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Route",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(
                    onClick = {
                        android.util.Log.d("RouteInfoCard", "Close button clicked - calling onDismiss")
                        onDismiss()
                    },
                    modifier = Modifier,
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            // Route info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                RouteInfoItem(
                    icon = Icons.Default.Straighten,
                    label = "Distance",
                    value = com.scenicroutes.app.utils.DistanceFormatter.formatDistance(
                        route.distance.toDouble(),
                        com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()
                    ),
                )
                RouteInfoItem(
                    icon = Icons.Default.AccessTime,
                    label = "Time",
                    value = "${Math.round(route.time / 1000.0 / 60.0)} min",
                )
            }

            // Weather on Route
            if (isLoadingWeather) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    Text(
                        text = "Loading weather...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else if (routeWeather != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f),
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.WbSunny,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Column {
                                Text(
                                    text = "${routeWeather.temperature}°C",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    text = routeWeather.description ?: "Clear",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        routeWeather.wind_speed?.let { windSpeed ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Icon(
                                    Icons.Default.Air,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    text = "$windSpeed km/h",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }
            }

            // Alternative routes button
            if (alternativeRoutes.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = onShowAlternatives,
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Default.CompareArrows, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("View ${alternativeRoutes.size} Alternative${if (alternativeRoutes.size > 1) "s" else ""}")
                    }
                    if (alternativeRoutes.size > 1) {
                        OutlinedButton(
                            onClick = {
                                // Navigate to comparison screen - will be handled by parent
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Default.Compare, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Compare")
                        }
                    }
                }
            }

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Save button with animated state feedback
                OutlinedButton(
                    onClick = onSave,
                    modifier = Modifier.weight(1f),
                    enabled = saveRouteState !is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Saving,
                ) {
                    when (saveRouteState) {
                        is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Saving -> {
                            // Show loading indicator
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Saving...")
                        }
                        is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Success -> {
                            // Show success state with checkmark
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Saved", color = MaterialTheme.colorScheme.primary)
                        }
                        is com.scenicroutes.app.ui.viewmodel.SaveRouteState.Error -> {
                            // Show error state
                            Icon(Icons.Default.Error, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Error", color = MaterialTheme.colorScheme.error)
                        }
                        else -> {
                            // Default idle state
                            Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Save")
                        }
                    }
                }
                OutlinedButton(
                    onClick = { showShareDialog = true },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("route_info_share_button"),
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Share")
                }
                Button(
                    onClick = onNavigate,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("route_info_navigate_button"),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 12.dp), // Reduce horizontal padding
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Navigate",
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontSize = 13.sp, // Slightly smaller font to prevent wrapping
                    )
                }
            }
            
            // Start Recording button (if callback provided)
            onStartRecording?.let { startRecording ->
                Button(
                    onClick = startRecording,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                    ),
                ) {
                    Icon(Icons.Default.RadioButtonChecked, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Start Recording", fontWeight = FontWeight.SemiBold)
                }
            }
            
            // Edit Route button
            OutlinedButton(
                onClick = onEditRoute ?: {},
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Edit Route")
            }

            // GPX Export
            val context = androidx.compose.ui.platform.LocalContext.current
            val coroutineScope = rememberCoroutineScope()
            OutlinedButton(
                onClick = {
                    coroutineScope.launch {
                        try {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            val token = tokenManager.token.first()
                            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService

                            val routeData = mapOf(
                                "route" to mapOf(
                                    "coordinates" to route.geometry,
                                    "distance" to route.distance,
                                    "duration" to (route.time / 1000.0),
                                ),
                                "name" to "Route",
                                "description" to "Exported route",
                            )

                            // TODO: Need route ID to export - this needs to be fixed when route has ID
                            // For now, skip export if no route ID
                            val routeId = (routeData as? Map<*, *>)?.get("id") as? Long
                            if (routeId != null) {
                                val responseBody = apiService.exportRouteToGPX(token?.let { "Bearer $it" }, routeId)
                                val gpxContent = responseBody.body()?.string() ?: ""
                                val file = java.io.File(context.getExternalFilesDir(null), "route_${System.currentTimeMillis()}.gpx")
                                file.writeText(gpxContent)
                                android.widget.Toast.makeText(
                                    context,
                                    "GPX exported to ${file.name}",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "Cannot export: Route ID not available",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("RouteInfoCard", "Error exporting GPX: ${e.message}", e)
                            android.widget.Toast.makeText(
                                context,
                                "Failed to export GPX: ${e.message}",
                                android.widget.Toast.LENGTH_SHORT,
                            ).show()
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Export GPX")
            }
        }
    }
    
    // Share Route Dialog
    if (showShareDialog) {
        ShareRouteDialog(
            route = route,
            onDismiss = { showShareDialog = false },
            onShare = { url ->
                showShareDialog = false
                onShare()
            },
        )
    }
}

@Composable
fun RouteInfoItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.primary,
        )
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
