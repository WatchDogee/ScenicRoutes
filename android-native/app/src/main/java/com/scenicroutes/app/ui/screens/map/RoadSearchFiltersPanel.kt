package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import org.osmdroid.util.GeoPoint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoadSearchFiltersPanel(
    onDismiss: () -> Unit,
    onSearch: (lat: Double, lon: Double, radius: Double, roadType: String, curvatureType: String, lengthFilter: String) -> Unit,
    onDropMarker: (() -> Unit)? = null,
    markerLocation: GeoPoint? = null,
    onMarkerLocationChange: ((GeoPoint?) -> Unit)? = null,
) {
    val context = LocalContext.current
    
    // Load default search radius from settings
    com.scenicroutes.app.utils.SettingsManager.ensureSettingsLoaded()
    val defaultSearchRadius = com.scenicroutes.app.utils.SettingsManager.getDefaultSearchRadius()
    
    var radius by remember { mutableStateOf(defaultSearchRadius) }
    var roadType by remember { mutableStateOf("all") }
    var curvatureType by remember { mutableStateOf("all") }
    var lengthFilter by remember { mutableStateOf("all") }
    var useCurrentLocation by remember { mutableStateOf(markerLocation == null) }
    var currentMarkerLocation by remember { mutableStateOf(markerLocation) }
    var manualLat by remember { mutableStateOf("") }
    var manualLon by remember { mutableStateOf("") }
    var useManualLocation by remember { mutableStateOf(false) }
    
    // Update marker location when prop changes
    LaunchedEffect(markerLocation) {
        if (markerLocation != null) {
            currentMarkerLocation = markerLocation
            useCurrentLocation = false
            useManualLocation = false
            // Update manual lat/lon fields for display
            manualLat = String.format("%.6f", markerLocation.latitude)
            manualLon = String.format("%.6f", markerLocation.longitude)
            android.util.Log.d("RoadSearchFiltersPanel", "Marker location updated: ${markerLocation.latitude}, ${markerLocation.longitude}")
        }
    }
    
    var sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = Modifier.fillMaxHeight(0.8f),
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
                    text = "Find Curved Roads",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
            
            Divider()
            
            // Center Point Selection
            Text(
                text = "Search Center",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = useCurrentLocation,
                        onClick = {
                            useCurrentLocation = true
                            useManualLocation = false
                        },
                        label = { Text("Current Location") },
                        modifier = Modifier.weight(1f),
                    )
                    FilterChip(
                        selected = !useCurrentLocation && !useManualLocation,
                        onClick = {
                            useCurrentLocation = false
                            useManualLocation = false
                            onDropMarker?.invoke()
                        },
                        label = { Text("Drop Marker") },
                        modifier = Modifier.weight(1f),
                    )
                }
                
                FilterChip(
                    selected = useManualLocation,
                    onClick = {
                        useManualLocation = true
                        useCurrentLocation = false
                    },
                    label = { Text("Enter Coordinates") },
                    modifier = Modifier.fillMaxWidth(),
                )
                
                if (useManualLocation) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        OutlinedTextField(
                            value = manualLat,
                            onValueChange = { manualLat = it },
                            label = { Text("Latitude") },
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = manualLon,
                            onValueChange = { manualLon = it },
                            label = { Text("Longitude") },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                
                if (currentMarkerLocation != null && !useCurrentLocation && !useManualLocation) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                        ),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(
                                        text = "Marker Location",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        text = "${String.format("%.4f", currentMarkerLocation!!.latitude)}, ${String.format("%.4f", currentMarkerLocation!!.longitude)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                IconButton(onClick = { 
                                    currentMarkerLocation = null
                                    onMarkerLocationChange?.invoke(null)
                                }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear")
                                }
                            }
                            // Quick Search Button - uses current radius and filters
                            Button(
                                onClick = {
                                    onSearch(
                                        currentMarkerLocation!!.latitude,
                                        currentMarkerLocation!!.longitude,
                                        radius,
                                        roadType,
                                        curvatureType,
                                        lengthFilter,
                                    )
                                    onDismiss()
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Icon(Icons.Default.Search, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Quick Search (${String.format("%.1f", radius)} km)", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }
            
            // Radius
            Text(
                text = "Search Radius: ${String.format("%.1f", radius)} km",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Slider(
                value = radius.toFloat(),
                onValueChange = { radius = it.toDouble() },
                valueRange = 1f..50f,
                steps = 48,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("1 km", style = MaterialTheme.typography.bodySmall)
                Text("50 km", style = MaterialTheme.typography.bodySmall)
            }
            
            // Road Type
            Text(
                text = "Road Type",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf("All", "Primary", "Secondary").forEach { type ->
                    FilterChip(
                        selected = roadType == type.lowercase(),
                        onClick = { roadType = type.lowercase() },
                        label = { Text(type) },
                    )
                }
            }
            
            // Curvature Type
            Text(
                text = "Curvature Level",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf("All", "Mellow", "Curved", "Very Curved").forEach { curvature ->
                    FilterChip(
                        selected = curvatureType == curvature.lowercase().replace(" ", "_"),
                        onClick = { curvatureType = curvature.lowercase().replace(" ", "_") },
                        label = { Text(curvature) },
                    )
                }
            }
            
            // Length Filter
            Text(
                text = "Road Length",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf("All", "Short", "Medium", "Long").forEach { length ->
                    FilterChip(
                        selected = lengthFilter == length.lowercase(),
                        onClick = { lengthFilter = length.lowercase() },
                        label = { Text(length) },
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Search Button
            Button(
                onClick = {
                    val searchLat: Double
                    val searchLon: Double
                    
                    when {
                        // Priority 1: Use dropped marker location if available
                        currentMarkerLocation != null -> {
                            searchLat = currentMarkerLocation!!.latitude
                            searchLon = currentMarkerLocation!!.longitude
                            android.util.Log.d("RoadSearchFiltersPanel", "Using marker location: $searchLat, $searchLon")
                        }
                        useManualLocation -> {
                            val manualLatValue = manualLat.toDoubleOrNull()
                            val manualLonValue = manualLon.toDoubleOrNull()
                            if (manualLatValue != null && manualLonValue != null) {
                                searchLat = manualLatValue
                                searchLon = manualLonValue
                                android.util.Log.d("RoadSearchFiltersPanel", "Using manual location: $searchLat, $searchLon")
                            } else {
                                // Invalid manual input, show error
                                android.widget.Toast.makeText(
                                    context,
                                    "Please enter valid coordinates or drop a marker on the map",
                                    android.widget.Toast.LENGTH_LONG,
                                ).show()
                                return@Button
                            }
                        }
                        useCurrentLocation -> {
                            // TODO: Get current location
                            android.widget.Toast.makeText(
                                context,
                                "Current location not available. Please drop a marker on the map or enter coordinates manually.",
                                android.widget.Toast.LENGTH_LONG,
                            ).show()
                            return@Button
                        }
                        else -> {
                            // No location selected - show error
                            android.widget.Toast.makeText(
                                context,
                                "Please drop a marker on the map or enter coordinates manually",
                                android.widget.Toast.LENGTH_LONG,
                            ).show()
                            return@Button
                        }
                    }
                    
                    onSearch(searchLat, searchLon, radius, roadType, curvatureType, lengthFilter)
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Search, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Search Roads", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

