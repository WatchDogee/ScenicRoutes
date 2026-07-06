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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.model.POI
import com.scenicroutes.app.data.model.POIType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POISearchSheet(
    onDismiss: () -> Unit,
    onPOISelected: (POI) -> Unit,
    onSearchPOIs: (lat: Double, lon: Double, radius: Double, poiTypes: List<POIType>) -> Unit,
) {
    val context = LocalContext.current
    
    var searchQuery by remember { mutableStateOf("") }
    var radius by remember { mutableStateOf(5.0) }
    var showTourism by remember { mutableStateOf(false) }
    var showFuelStations by remember { mutableStateOf(false) }
    var showChargingStations by remember { mutableStateOf(false) }
    var useCurrentLocation by remember { mutableStateOf(true) }
    var manualLat by remember { mutableStateOf("") }
    var manualLon by remember { mutableStateOf("") }
    var useManualLocation by remember { mutableStateOf(false) }
    var pois by remember { mutableStateOf<List<POI>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    
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
                    text = "Search POIs",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
            
            Divider()
            
            // Search Location
            Text(
                text = "Search Location",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            
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
                    selected = useManualLocation,
                    onClick = {
                        useManualLocation = true
                        useCurrentLocation = false
                    },
                    label = { Text("Enter Coordinates") },
                    modifier = Modifier.weight(1f),
                )
            }
            
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
            
            // Radius
            Text(
                text = "Search Radius: ${String.format("%.1f", radius)} km",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Slider(
                value = radius.toFloat(),
                onValueChange = { radius = it.toDouble() },
                valueRange = 1f..20f,
                steps = 18,
            )
            
            // POI Types
            Text(
                text = "POI Types",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = showTourism,
                        onClick = { showTourism = !showTourism },
                        label = { Text("Tourism") },
                        modifier = Modifier.weight(1f),
                    )
                    FilterChip(
                        selected = showFuelStations,
                        onClick = { showFuelStations = !showFuelStations },
                        label = { Text("Fuel") },
                        modifier = Modifier.weight(1f),
                    )
                }
                FilterChip(
                    selected = showChargingStations,
                    onClick = { showChargingStations = !showChargingStations },
                    label = { Text("EV Charging") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            
            // Search Button
            Button(
                onClick = {
                    val searchLat: Double
                    val searchLon: Double
                    
                    when {
                        useCurrentLocation -> {
                            // TODO: Get current location
                            searchLat = 50.0
                            searchLon = 8.0
                        }
                        useManualLocation -> {
                            searchLat = manualLat.toDoubleOrNull() ?: 50.0
                            searchLon = manualLon.toDoubleOrNull() ?: 8.0
                        }
                        else -> {
                            searchLat = 50.0
                            searchLon = 8.0
                        }
                    }
                    
                    val poiTypes = mutableListOf<POIType>()
                    if (showTourism) poiTypes.add(POIType.TOURISM)
                    if (showFuelStations) poiTypes.add(POIType.FUEL)
                    if (showChargingStations) poiTypes.add(POIType.CHARGING)
                    
                    if (poiTypes.isEmpty()) {
                        // Show all types if none selected
                        poiTypes.addAll(listOf(POIType.TOURISM, POIType.FUEL, POIType.CHARGING))
                    }
                    
                    isSearching = true
                    onSearchPOIs(searchLat, searchLon, radius, poiTypes)
                    isSearching = false
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSearching,
            ) {
                if (isSearching) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Searching...")
                } else {
                    Icon(Icons.Default.Search, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Search POIs", fontWeight = FontWeight.SemiBold)
                }
            }
            
            // Search Results
            if (pois.isNotEmpty()) {
                Divider()
                Text(
                    text = "Results (${pois.size})",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                LazyColumn(
                    modifier = Modifier.heightIn(max = 300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(pois) { poi ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onPOISelected(poi) },
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    when (poi.type) {
                                        POIType.TOURISM -> Icons.Default.PhotoCamera
                                        POIType.FUEL -> Icons.Default.LocalGasStation
                                        POIType.CHARGING -> Icons.Default.EvStation
                                    },
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = poi.name ?: "Unnamed POI",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        text = "${String.format("%.4f", poi.lat)}, ${String.format("%.4f", poi.lng)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Icon(Icons.Default.ChevronRight, contentDescription = null)
                            }
                        }
                    }
                }
            }
        }
    }
}

