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
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.model.SavedRoad
import org.osmdroid.util.GeoPoint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommunityRoadsSheet(
    onDismiss: () -> Unit,
    onRoadSelected: (SavedRoad) -> Unit,
    onSearchCommunityRoads: (
        lat: Double?,
        lon: Double?,
        radius: Double?,
        country: String?,
        region: String?,
        location: String?,
        lengthFilter: String?,
        curvinessFilter: String?,
        minRating: Double?,
        sortBy: String?,
    ) -> Unit,
    onDropMarker: (() -> Unit)? = null,
    markerLocation: GeoPoint? = null,
    communityRoads: List<SavedRoad> = emptyList(),
    isLoading: Boolean = false,
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    // Search mode: "marker", "area", "region"
    var searchMode by remember { mutableStateOf("marker") }
    var radius by remember { mutableStateOf(10.0) }
    
    // Marker mode
    var useMarkerLocation by remember { mutableStateOf(false) }
    
    // Area mode (location string)
    var locationSearch by remember { mutableStateOf("") }
    
    // Region mode
    var country by remember { mutableStateOf("") }
    var region by remember { mutableStateOf("") }
    
    // Filters
    var lengthFilter by remember { mutableStateOf("all") }
    var curvinessFilter by remember { mutableStateOf("all") }
    var minRating by remember { mutableStateOf(0.0) }
    var sortBy by remember { mutableStateOf("rating") }
    
    var sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
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
                    text = "Community Roads",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
            
            Divider()
            
            Text(
                text = "Search for roads shared by the community",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            
            // Search Mode Selection
            Text(
                text = "Search Mode",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = searchMode == "marker",
                    onClick = { searchMode = "marker" },
                    label = { Text("Marker") },
                )
                FilterChip(
                    selected = searchMode == "area",
                    onClick = { searchMode = "area" },
                    label = { Text("Area") },
                )
                FilterChip(
                    selected = searchMode == "region",
                    onClick = { searchMode = "region" },
                    label = { Text("Region") },
                )
            }
            
            // Marker Mode
            if (searchMode == "marker") {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (markerLocation != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                            ),
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                Column {
                                    Text(
                                        text = "Marker Location",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        text = "${String.format("%.4f", markerLocation.latitude)}, ${String.format("%.4f", markerLocation.longitude)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                        useMarkerLocation = true
                    } else {
                        Button(
                            onClick = {
                                onDropMarker?.invoke()
                                // Collapse the sheet when drop marker is selected
                                coroutineScope.launch {
                                    sheetState.hide()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Icon(Icons.Default.AddLocation, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Drop Marker on Map")
                        }
                        Text(
                            text = "The sheet will close. Tap on the map to place a marker.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
            
            // Area Mode
            if (searchMode == "area") {
                OutlinedTextField(
                    value = locationSearch,
                    onValueChange = { locationSearch = it },
                    label = { Text("Location (town, city, area)") },
                    modifier = Modifier.fillMaxWidth(),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                )
            }
            
            // Region Mode
            if (searchMode == "region") {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = country,
                        onValueChange = { country = it },
                        label = { Text("Country") },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Default.Public, contentDescription = null) },
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = region,
                        onValueChange = { region = it },
                        label = { Text("Region/State") },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Default.Map, contentDescription = null) },
                        singleLine = true,
                    )
                }
            }
            
            // Radius (only for marker and area modes)
            if (searchMode == "marker" || searchMode == "area") {
                Text(
                    text = "Search Radius: ${String.format("%.1f", radius)} km",
                    style = MaterialTheme.typography.labelMedium,
                )
                Slider(
                    value = radius.toFloat(),
                    onValueChange = { radius = it.toDouble() },
                    valueRange = 1f..50f,
                    steps = 49,
                )
            }
            
            Divider()
            
            // Filters
            Text(
                text = "Filters",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            
            // Length Filter
            Text(
                text = "Length",
                style = MaterialTheme.typography.labelMedium,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf("all", "short", "medium", "long").forEach { filter ->
                    FilterChip(
                        selected = lengthFilter == filter,
                        onClick = { lengthFilter = filter },
                        label = { Text(filter.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            
            // Curviness Filter
            Text(
                text = "Curviness",
                style = MaterialTheme.typography.labelMedium,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf("all", "mellow", "moderate", "curvy").forEach { filter ->
                    FilterChip(
                        selected = curvinessFilter == filter,
                        onClick = { curvinessFilter = filter },
                        label = { Text(filter.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            
            // Min Rating
            Text(
                text = "Minimum Rating: ${String.format("%.1f", minRating)}",
                style = MaterialTheme.typography.labelMedium,
            )
            Slider(
                value = minRating.toFloat(),
                onValueChange = { minRating = it.toDouble() },
                valueRange = 0f..5f,
                steps = 49,
            )
            
            // Sort By
            Text(
                text = "Sort By",
                style = MaterialTheme.typography.labelMedium,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf("rating", "distance", "name", "recent").forEach { sort ->
                    FilterChip(
                        selected = sortBy == sort,
                        onClick = { sortBy = sort },
                        label = { Text(sort.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            
            // Search Button
            Button(
                onClick = {
                    when (searchMode) {
                        "marker" -> {
                            if (markerLocation != null) {
                                onSearchCommunityRoads(
                                    markerLocation.latitude,
                                    markerLocation.longitude,
                                    radius,
                                    null, // country
                                    null, // region
                                    null, // location
                                    if (lengthFilter == "all") null else lengthFilter,
                                    if (curvinessFilter == "all") null else curvinessFilter,
                                    if (minRating > 0) minRating else null,
                                    sortBy,
                                )
                            }
                        }
                        "area" -> {
                            onSearchCommunityRoads(
                                null, // lat
                                null, // lon
                                radius,
                                null, // country
                                null, // region
                                locationSearch.takeIf { it.isNotBlank() },
                                if (lengthFilter == "all") null else lengthFilter,
                                if (curvinessFilter == "all") null else curvinessFilter,
                                if (minRating > 0) minRating else null,
                                sortBy,
                            )
                        }
                        "region" -> {
                            onSearchCommunityRoads(
                                null, // lat
                                null, // lon
                                null, // radius
                                country.takeIf { it.isNotBlank() },
                                region.takeIf { it.isNotBlank() },
                                null, // location
                                if (lengthFilter == "all") null else lengthFilter,
                                if (curvinessFilter == "all") null else curvinessFilter,
                                if (minRating > 0) minRating else null,
                                sortBy,
                            )
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && when (searchMode) {
                    "marker" -> markerLocation != null
                    "area" -> locationSearch.isNotBlank()
                    "region" -> country.isNotBlank() || region.isNotBlank()
                    else -> false
                },
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Searching...")
                } else {
                    Icon(Icons.Default.Search, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Search Community Roads")
                }
            }
            
            // Results
            if (communityRoads.isNotEmpty()) {
                Divider()
                Text(
                    text = "Found ${communityRoads.size} road(s)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(max = 400.dp),
                ) {
                    items(communityRoads) { road ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onRoadSelected(road) },
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    text = road.road_name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                if (road.start_location != null && road.end_location != null) {
                                    Text(
                                        text = "${road.start_location} → ${road.end_location}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                                ) {
                                    road.distance?.let {
                                        Text(
                                            text = "${String.format("%.1f", it / 1000.0)} km",
                                            style = MaterialTheme.typography.bodySmall,
                                        )
                                    }
                                    road.average_rating?.let {
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Icon(
                                                Icons.Default.Star,
                                                contentDescription = null,
                                                modifier = Modifier.size(16.dp),
                                                tint = MaterialTheme.colorScheme.primary,
                                            )
                                            Text(
                                                text = String.format("%.1f", it),
                                                style = MaterialTheme.typography.bodySmall,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (!isLoading) {
                Text(
                    text = "No community roads found. Try adjusting your search criteria.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 16.dp),
                )
            }
        }
    }
}
