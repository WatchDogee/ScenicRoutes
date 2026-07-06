package com.scenicroutes.app.ui.screens.maps

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.BuildConfig
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.service.FeatureAccessService
import com.scenicroutes.app.ui.components.FeatureGate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.max
import kotlinx.coroutines.flow.first
import kotlin.math.cos
import kotlin.math.PI

private enum class RegionFilter { All, Available, Downloaded }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OfflineMapsScreen(
    navController: NavController,
    mapBounds: String? = null,
    downloadLat: Double? = null,
    downloadLon: Double? = null,
    downloadRadius: Double? = null,
    downloadName: String? = null,
) {
    if (!BuildConfig.OFFLINE_MAPS_ENABLED) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Feature Unavailable") },
                    navigationIcon = {
                        IconButton(onClick = { navController.popBackStack() }) {
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
                Text(
                    text = "This feature is temporarily unavailable.",
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
        return
    }
    val context = LocalContext.current
    val offlineMapsService = remember { com.scenicroutes.app.data.service.OfflineMapsService(context) }
    val featureAccessService = remember { FeatureAccessService(context) }
    val tokenManager = remember { TokenManager(context) }
    val coroutineScope = rememberCoroutineScope()

    val downloadedRegions by offlineMapsService.downloadedRegions.collectAsState()
    val downloadProgress by offlineMapsService.downloadProgress.collectAsState()
    val storageUsage = remember { mutableStateOf(0L) }

    var regions by remember { mutableStateOf<List<com.scenicroutes.app.data.service.OfflineMapRegion>>(emptyList()) }
    var savedForPhone by remember { mutableStateOf<List<com.scenicroutes.app.data.service.OfflineMapRegion>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var mapLimits by remember { mutableStateOf<Pair<Int?, Int?>>(Pair(null, null)) }
    var hasOfflineAccess by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var showCustomArea by remember { mutableStateOf(false) }
    var showLiteVersions by remember { mutableStateOf(false) }
    var regionFilter by remember { mutableStateOf(RegionFilter.All) }

    // Check feature access and limits
    LaunchedEffect(Unit) {
        hasOfflineAccess = featureAccessService.hasFeatureAccess("offline_maps")
        mapLimits = featureAccessService.getOfflineMapLimits()
        storageUsage.value = offlineMapsService.getStorageUsage()
        // Attempt to sync existing local downloads to server if logged in
        runCatching {
            val token = tokenManager.token.first()
            if (!token.isNullOrBlank()) {
                offlineMapsService.syncDownloadedRegionsToServer(token)
            }
        }.onFailure {
            android.util.Log.e("OfflineMaps", "Initial sync failed: ${it.message}", it)
        }
    }

    // Custom area inputs (default to a modest city-radius)
    var customLat by remember { mutableStateOf("56.95") }
    var customLon by remember { mutableStateOf("24.10") }
    var customRadiusKm by remember { mutableStateOf("25") }
    var customName by remember { mutableStateOf("Custom Area") }
    
    // Update custom area if download location is provided
    LaunchedEffect(downloadLat, downloadLon, downloadRadius, downloadName) {
        if (downloadLat != null && downloadLon != null) {
            customLat = downloadLat.toString()
            customLon = downloadLon.toString()
            customRadiusKm = (downloadRadius ?: 10.0).toInt().toString()
            customName = downloadName ?: "Around Marked Location"
            // Auto-show custom area
            showCustomArea = true
        }
    }
    
    // Parse map bounds if provided (format: latNorth,lonEast,latSouth,lonWest)
    LaunchedEffect(mapBounds) {
        if (!mapBounds.isNullOrEmpty()) {
            try {
                val parts = mapBounds.split(",")
                if (parts.size == 4) {
                    val latNorth = parts[0].toDouble()
                    val lonEast = parts[1].toDouble()
                    val latSouth = parts[2].toDouble()
                    val lonWest = parts[3].toDouble()
                    
                    // Calculate center and approximate radius
                    val centerLat = (latNorth + latSouth) / 2.0
                    val centerLon = (lonEast + lonWest) / 2.0
                    
                    // Approximate radius (in km) - rough calculation
                    val latDiffKm = (latNorth - latSouth) * 111.0 // 1 degree ≈ 111 km
                    val radius = maxOf(latDiffKm / 2.0, 5.0).coerceAtMost(100.0)
                    
                    customLat = String.format("%.2f", centerLat)
                    customLon = String.format("%.2f", centerLon)
                    customRadiusKm = String.format("%.0f", radius)
                    customName = "Current View"
                }
            } catch (e: Exception) {
                android.util.Log.d("OfflineMapsScreen", "Error parsing map bounds: ${e.message}")
            }
        }
    }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
            try {
                // Don't load preset regions from API or manifest - only show user's custom/saved regions
                val downloadedIds = downloadedRegions.map { it.id }.toSet()
                regions = downloadedRegions.toList()
                
                android.util.Log.d("OfflineMapsScreen", "Loaded ${regions.size} regions (${downloadedIds.size} downloaded)")

                // Fetch Saved-for-Phone list from API and merge into main regions list
                runCatching {
                    val token = tokenManager.token.first()
                    if (!token.isNullOrBlank()) {
                        val savedList = offlineMapsService.fetchSavedRegionsFromApi(token)
                        android.util.Log.d("OfflineMapsScreen", "Fetched ${savedList.size} saved regions from API")
                        savedList.forEach { item ->
                            android.util.Log.d("OfflineMapsScreen", "API region: id=${item["region_id"]}, name=${item["region_name"]}, status=${item["status"]}")
                        }
                        val mapped = savedList.mapNotNull { item ->
                            try {
                                val idAny = item["region_id"] ?: item["id"] ?: return@mapNotNull null
                                val id = when (idAny) {
                                    is String -> idAny
                                    is Number -> idAny.toString()
                                    else -> return@mapNotNull null
                                }
                                val name = (item["region_name"] as? String) ?: (item["name"] as? String) ?: id
                                val boundsAny = item["bounds"] as? Map<*, *>
                                val south = ((boundsAny?.get("south") ?: item["south"]) as? Number)?.toDouble() ?: return@mapNotNull null
                                val west = ((boundsAny?.get("west") ?: item["west"]) as? Number)?.toDouble() ?: return@mapNotNull null
                                val north = ((boundsAny?.get("north") ?: item["north"]) as? Number)?.toDouble() ?: return@mapNotNull null
                                val east = ((boundsAny?.get("east") ?: item["east"]) as? Number)?.toDouble() ?: return@mapNotNull null
                                val zoomLevelsRaw = (item["zoom_levels"] as? List<*>)?.mapNotNull { (it as? Number)?.toInt() }
                                val zoomRange = if (!zoomLevelsRaw.isNullOrEmpty()) {
                                    val minZ = zoomLevelsRaw.minOrNull() ?: 10
                                    val maxZ = zoomLevelsRaw.maxOrNull() ?: 15
                                    (minZ..maxZ)
                                } else 10..15

                                val bounds = org.osmdroid.util.BoundingBox(north, east, south, west)
                                val radiusKm = (item["radius_km"] as? Number)?.toDouble()
                                val status = (item["status"] as? String)?.lowercase() ?: "saved"
                                val apiSizeMb = (item["size_mb"] as? Number)?.toLong()
                                val estimatedBytes = offlineMapsService.estimateRegionSizeBytes(
                                    com.scenicroutes.app.data.service.OfflineMapRegion(id, name, bounds, zoomRange, customRadius = radiusKm),
                                )
                                val sizeBytesFinal = apiSizeMb?.let { max(1L, it) * 1024L * 1024L } ?: max(1024L * 1024L, estimatedBytes)

                                android.util.Log.d("OfflineMapsScreen", "Mapped region: id=$id, name=$name, status=$status, radiusKm=$radiusKm")
                                com.scenicroutes.app.data.service.OfflineMapRegion(
                                    id = id,
                                    name = name,
                                    bounds = bounds,
                                    zoomLevels = zoomRange,
                                    sizeBytes = sizeBytesFinal,
                                    customRadius = radiusKm,
                                    status = status,
                                    lastUpdated = System.currentTimeMillis(),
                                )
                            } catch (e: Exception) {
                                android.util.Log.e("OfflineMapsScreen", "Error mapping saved region: ${e.message}")
                                null
                            }
                        }
                        // Merge saved regions into main regions list, avoiding duplicates
                        val existingIds = regions.map { it.id }.toSet()
                        regions = regions + mapped.filter { it.id !in existingIds }
                        savedForPhone = emptyList() // Clear saved-for-phone as they're now in main list
                        android.util.Log.d("OfflineMapsScreen", "Merged ${mapped.size} saved regions into main list")
                    } else {
                        savedForPhone = emptyList()
                    }
                }.onFailure {
                    android.util.Log.e("OfflineMapsScreen", "Failed to fetch saved-for-phone: ${it.message}", it)
                    savedForPhone = emptyList()
                }
            } catch (e: Exception) {
                android.util.Log.e("OfflineMaps", "Error loading regions: ${e.message}", e)
            }
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Offline Maps") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        } else {
            FeatureGate(
                feature = "offline_maps",
                fallback = { requiredTier ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(24.dp),
                    ) {
                        com.scenicroutes.app.ui.components.UpgradePrompt(
                            requiredTier = requiredTier,
                            feature = "offline_maps",
                            navController = navController,
                        )
                    }
                },
                content = {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(24.dp),
                    ) {
                        // Search bar
                        item {
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("offline_maps_search"),
                                placeholder = { Text("Search regions (country, city)...") },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                trailingIcon = {
                                    if (searchQuery.isNotEmpty()) {
                                        IconButton(onClick = { searchQuery = "" }) {
                                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                                        }
                                    }
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                            )
                        }

                        // Tier info banner for free users
                        if (!hasOfflineAccess) {
                            item {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("offline_maps_tier_banner"),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.2f),
                                    ),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.tertiary),
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        verticalArrangement = Arrangement.spacedBy(12.dp),
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Icon(
                                                Icons.Default.Lock,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.tertiary,
                                                modifier = Modifier.size(24.dp),
                                            )
                                            Text(
                                                "Offline Maps - Premium Feature",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.tertiary,
                                            )
                                        }
                                        Text(
                                            "Download maps for offline use. Premium tier: Unlimited regions / 500 MB storage. Pro tier: Unlimited.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.tertiary,
                                        )
                                    }
                                }
                            }
                        } else {
                            // Show storage and tier info for paid users
                            item {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("offline_maps_tier_info"),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.2f),
                                    ),
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(
                                            Icons.Default.CheckCircle,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(20.dp),
                                        )
                                        Text(
                                            mapLimits.second?.let { "${downloadedRegions.size} regions (${(storageUsage.value / 1024.0 / 1024.0).toInt()} / ${mapLimits.second} MB)" }
                                                ?: "Offline maps enabled",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                }
                            }
                        }

                        // Conditional rendering of regions based on tier access
                        if (hasOfflineAccess) {
                        
                        // Storage Info - Compact
                        item {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("offline_maps_storage_card"),
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
                                        Text(
                                            "${downloadedRegions.size} regions",
                                            style = MaterialTheme.typography.labelSmall,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Text(
                                            "${(storageUsage.value / 1024.0 / 1024.0).toInt()} / ${mapLimits.second ?: 500} MB",
                                            style = MaterialTheme.typography.labelSmall,
                                        )
                                    }
                                    LinearProgressIndicator(
                                        progress = { 
                                            val used = storageUsage.value / 1024.0 / 1024.0
                                            val limit = (mapLimits.second ?: 500).toDouble()
                                            (used / limit).coerceIn(0.0, 1.0).toFloat()
                                        },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(4.dp),
                                    )
                                }
                            }
                        }
                        
                        // Collapsible Custom Area Downloader
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.2f),
                                ),
                            ) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { showCustomArea = !showCustomArea }
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            "Download Custom Area",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Icon(
                                            if (showCustomArea) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                            contentDescription = null,
                                        )
                                    }
                                    
                                    if (showCustomArea) {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 16.dp, vertical = 8.dp),
                                            verticalArrangement = Arrangement.spacedBy(12.dp),
                                        ) {
                                            OutlinedTextField(
                                                value = customName,
                                                onValueChange = { customName = it },
                                                label = { Text("Label") },
                                                singleLine = true,
                                                modifier = Modifier.fillMaxWidth(),
                                            )
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                OutlinedTextField(
                                                    value = customLat,
                                                    onValueChange = { customLat = it },
                                                    label = { Text("Lat") },
                                                    singleLine = true,
                                                    modifier = Modifier.weight(1f),
                                                )
                                                OutlinedTextField(
                                                    value = customLon,
                                                    onValueChange = { customLon = it },
                                                    label = { Text("Lon") },
                                                    singleLine = true,
                                                    modifier = Modifier.weight(1f),
                                                )
                                            }
                                            OutlinedTextField(
                                                value = customRadiusKm,
                                                onValueChange = { customRadiusKm = it },
                                                label = { Text("Radius (km)") },
                                                singleLine = true,
                                                modifier = Modifier.fillMaxWidth(),
                                            )
                                            
                                            // Show preview if valid coordinates
                                            val lat = customLat.toDoubleOrNull()
                                            val lon = customLon.toDoubleOrNull()
                                            val radius = customRadiusKm.toDoubleOrNull()
                                            
                                            if (lat != null && lon != null && radius != null && radius > 0) {
                                                // Calculate affected regions
                                                val affectedCount = regions.count { region ->
                                                    val centerLat = (region.bounds.latNorth + region.bounds.latSouth) / 2.0
                                                    val centerLon = (region.bounds.lonEast + region.bounds.lonWest) / 2.0
                                                    val distance = calculateHaversineDistance(lat, lon, centerLat, centerLon) / 1000.0
                                                    distance <= radius
                                                }
                                                
                                                val previewRegion = com.scenicroutes.app.data.service.OfflineMapRegion(
                                                    id = "preview",
                                                    name = "preview",
                                                    bounds = org.osmdroid.util.BoundingBox(
                                                        (lat + radius / 111.0).coerceAtMost(85.0),
                                                        (lon + (radius / (111.0 * cos(lat * PI / 180.0).coerceAtLeast(0.1)))).coerceAtMost(180.0),
                                                        (lat - radius / 111.0).coerceAtLeast(-85.0),
                                                        (lon - (radius / (111.0 * cos(lat * PI / 180.0).coerceAtLeast(0.1)))).coerceAtLeast(-180.0),
                                                    ),
                                                    zoomLevels = 11..14,
                                                    customRadius = radius,
                                                )
                                                val estimatedTiles = offlineMapsService.totalTiles(previewRegion).toInt()
                                                val estimatedSize = offlineMapsService.estimateRegionSizeMB(previewRegion)
                                                
                                                com.scenicroutes.app.ui.components.DownloadAreaMapPreview(
                                                    centerLat = lat,
                                                    centerLon = lon,
                                                    radiusKm = radius,
                                                    affectedRegionCount = affectedCount,
                                                    estimatedTiles = estimatedTiles,
                                                    estimatedSizeMb = estimatedSize,
                                                    modifier = Modifier.fillMaxWidth(),
                                                )
                                            }
                                            
                                            Button(
                                                onClick = {
                                                    val lat = customLat.toDoubleOrNull()
                                                    val lon = customLon.toDoubleOrNull()
                                                    val radius = customRadiusKm.toDoubleOrNull()
                                                    if (lat == null || lon == null || radius == null || radius <= 0) {
                                                        return@Button
                                                    }
                                                    val deltaLat = radius / 111.0
                                                    val cosLat = cos(lat * PI / 180.0).coerceAtLeast(0.1)
                                                    val deltaLon = radius / (111.0 * cosLat)
                                                    val north = (lat + deltaLat).coerceAtMost(85.0)
                                                    val south = (lat - deltaLat).coerceAtLeast(-85.0)
                                                    val east = (lon + deltaLon).coerceAtMost(180.0)
                                                    val west = (lon - deltaLon).coerceAtLeast(-180.0)
                                                    val region = com.scenicroutes.app.data.service.OfflineMapRegion(
                                                        id = "custom_${System.currentTimeMillis()}",
                                                        name = customName.ifBlank { "Custom Area" },
                                                        bounds = org.osmdroid.util.BoundingBox(north, east, south, west),
                                                        zoomLevels = 11..14,
                                                        customRadius = radius, // Store radius for accurate size calculation
                                                    )
                                                    regions = listOf(region) + regions
                                                    showCustomArea = false
                                                    
                                                    // Upload custom region to backend
                                                    coroutineScope.launch {
                                                        runCatching {
                                                            val token = tokenManager.token.first()
                                                            if (!token.isNullOrBlank()) {
                                                                val success = offlineMapsService.uploadCustomRegion(token, region)
                                                                if (success) {
                                                                    android.util.Log.d("OfflineMapsScreen", "Custom region synced to backend: ${region.name}")
                                                                } else {
                                                                    android.util.Log.e("OfflineMapsScreen", "Failed to sync custom region to backend")
                                                                }
                                                            }
                                                        }.onFailure {
                                                            android.util.Log.e("OfflineMapsScreen", "Error uploading custom region: ${it.message}", it)
                                                        }
                                                    }
                                                },
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("Add to List")
                                            }
                                            Spacer(modifier = Modifier.height(8.dp))
                                        }
                                    }
                                }
                            }
                        }
                        
                        }  // End if hasOfflineAccess

                        // Filter controls
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                FilterChip(
                                    selected = regionFilter == RegionFilter.All,
                                    onClick = { regionFilter = RegionFilter.All },
                                    label = { Text("All") },
                                )
                                FilterChip(
                                    selected = regionFilter == RegionFilter.Available,
                                    onClick = { regionFilter = RegionFilter.Available },
                                    label = { Text("Available") },
                                )
                                FilterChip(
                                    selected = regionFilter == RegionFilter.Downloaded,
                                    onClick = { regionFilter = RegionFilter.Downloaded },
                                    label = { Text("Downloaded") },
                                )
                            }
                        }

                        // Filtered regions search
                        val filteredRegions = regions.filter {
                            searchQuery.isEmpty() || 
                            it.name.contains(searchQuery, ignoreCase = true)
                        }
                        val downloadedIds = downloadedRegions.map { it.id }.toSet()

                        val filterApplied = when (regionFilter) {
                            RegionFilter.All -> filteredRegions
                            RegionFilter.Available -> filteredRegions.filter { it.id !in downloadedIds }
                            RegionFilter.Downloaded -> filteredRegions.filter { it.id in downloadedIds }
                        }

                        // Sort: user-created first, then downloaded, then by name
                        val sortedRegions = filterApplied.sortedWith(compareBy(
                            { it.status != "custom" && it.status != "saved" && it.customRadius == null && !it.id.startsWith("custom_") },
                            { it.id !in downloadedIds },
                            { it.name },
                        ))

                        // Show downloaded regions section (when visible)
                        val downloadedInList = sortedRegions.filter { it.id in downloadedIds }
                        if (downloadedInList.isNotEmpty() && regionFilter != RegionFilter.Available) {
                            item {
                                Text(
                                    "Downloaded (Offline Ready)",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            items(downloadedInList) { region ->
                                val isDownloaded = downloadedRegions.any { it.id == region.id }
                                val progress = downloadProgress[region.id]
                                // Use stored sizeBytes if available (from API), otherwise estimate
                                val estimatedSizeMB = if (region.sizeBytes > 0) {
                                    region.sizeBytes / 1024.0 / 1024.0
                                } else {
                                    offlineMapsService.estimateRegionSizeMB(region)
                                }
                                val storageLimitMB = mapLimits.second
                                val currentStorageMB = storageUsage.value / 1024.0 / 1024.0
                                val wouldExceedStorage = storageLimitMB?.let { currentStorageMB + estimatedSizeMB > it } ?: false

                                OfflineMapRegionCard(
                                    region = region,
                                    isDownloaded = isDownloaded,
                                    downloadProgress = progress,
                                    estimatedSizeMB = estimatedSizeMB,
                                    exceedsStorageLimit = wouldExceedStorage,
                                    canDownload = true,
                                    onDownload = {
                                        coroutineScope.launch {
                                            val (_, maxStorageMB) = featureAccessService.getOfflineMapLimits()
                                            if (maxStorageMB != null) {
                                                val currentStorageMB = (storageUsage.value / 1024.0 / 1024.0).toInt()
                                                if (currentStorageMB + estimatedSizeMB >= maxStorageMB) {
                                                    android.util.Log.e("OfflineMaps", "Download blocked: storage limit - current: ${currentStorageMB}MB, need: ${estimatedSizeMB}MB, max: ${maxStorageMB}MB")
                                                    return@launch
                                                }
                                            }
                                            android.util.Log.d("OfflineMaps", "Starting download for region: ${region.name}, estimated size: ${estimatedSizeMB}MB")
                                            offlineMapsService.downloadRegion(region)
                                            storageUsage.value = offlineMapsService.getStorageUsage()
                                            // Report completion to backend if logged in
                                            runCatching {
                                                val token = tokenManager.token.first()
                                                if (!token.isNullOrBlank()) {
                                                    val actualMb = offlineMapsService.getRegionStorageSizeMB(region.id)
                                                    val sizeMb = if (actualMb > 0L) actualMb else estimatedSizeMB.toLong()
                                                    val ok = offlineMapsService.reportDownloadedRegion(
                                                        token,
                                                        region.id,
                                                        region.name,
                                                        sizeMb,
                                                        region.bounds,
                                                        region.zoomLevels,
                                                    )
                                                    android.util.Log.d("OfflineMaps", "Reported download for ${region.name}: ${ok}")
                                                }
                                            }.onFailure {
                                                android.util.Log.e("OfflineMaps", "Failed to report download: ${it.message}", it)
                                            }
                                        }
                                    },
                                    onDelete = {
                                        offlineMapsService.deleteRegion(region.id)
                                        storageUsage.value = offlineMapsService.getStorageUsage()
                                    },
                                )
                            }
                        }

                        // Show available regions section
                        val availableInList = sortedRegions.filter { it.id !in downloadedIds }
                        if (availableInList.isNotEmpty() && regionFilter != RegionFilter.Downloaded) {
                            item {
                                Text(
                                    "Available Regions",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }

                        items(availableInList) { region ->
                            val isDownloaded = downloadedRegions.any { it.id == region.id }
                            val progress = downloadProgress[region.id]
                            // Use stored sizeBytes if available (from API), otherwise estimate
                            val estimatedSizeMB = if (region.sizeBytes > 0) {
                                region.sizeBytes / 1024.0 / 1024.0
                            } else {
                                offlineMapsService.estimateRegionSizeMB(region)
                            }
                            val storageLimitMB = mapLimits.second
                            val currentStorageMB = storageUsage.value / 1024.0 / 1024.0
                            val wouldExceedStorage = storageLimitMB?.let { currentStorageMB + estimatedSizeMB > it } ?: false

                            OfflineMapRegionCard(
                                region = region,
                                isDownloaded = isDownloaded,
                                downloadProgress = progress,
                                estimatedSizeMB = estimatedSizeMB,
                                exceedsStorageLimit = wouldExceedStorage,
                                canDownload = true, // No region count limit
                                onDownload = {
                                    coroutineScope.launch {
                                        // Check limits before downloading - only MB limit, no region count limit
                                        val (_, maxStorageMB) = featureAccessService.getOfflineMapLimits()
                                        if (maxStorageMB != null) {
                                            val currentStorageMB = (storageUsage.value / 1024.0 / 1024.0).toInt()
                                            if (currentStorageMB + estimatedSizeMB >= maxStorageMB) {
                                                android.util.Log.e("OfflineMaps", "Download blocked: storage limit - current: ${currentStorageMB}MB, need: ${estimatedSizeMB}MB, max: ${maxStorageMB}MB")
                                                return@launch
                                            }
                                        }
                                        android.util.Log.d("OfflineMaps", "Starting download for region: ${region.name}, estimated size: ${estimatedSizeMB}MB")
                                        offlineMapsService.downloadRegion(region)
                                        storageUsage.value = offlineMapsService.getStorageUsage()
                                        // Report completion to backend if logged in
                                        runCatching {
                                            val token = tokenManager.token.first()
                                            if (!token.isNullOrBlank()) {
                                                    val actualMb = offlineMapsService.getRegionStorageSizeMB(region.id)
                                                    val sizeMb = if (actualMb > 0L) actualMb else estimatedSizeMB.toLong()
                                                    val ok = offlineMapsService.reportDownloadedRegion(
                                                        token,
                                                        region.id,
                                                        region.name,
                                                        sizeMb,
                                                        region.bounds,
                                                        region.zoomLevels,
                                                    )
                                                android.util.Log.d("OfflineMaps", "Reported download for ${region.name}: ${ok}")
                                            }
                                        }.onFailure {
                                            android.util.Log.e("OfflineMaps", "Failed to report download: ${it.message}", it)
                                        }
                                    }
                                },
                                onDelete = {
                                    offlineMapsService.deleteRegion(region.id)
                                    storageUsage.value = offlineMapsService.getStorageUsage()
                                },
                            )
                        }
                        
                        if (filteredRegions.isEmpty() && searchQuery.isNotEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(32.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        "No regions matching \"$searchQuery\"",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                },
            )
        }
    }
}

@Composable
fun OfflineMapRegionCard(
    region: com.scenicroutes.app.data.service.OfflineMapRegion,
    isDownloaded: Boolean,
    downloadProgress: com.scenicroutes.app.data.service.OfflineMapsService.DownloadProgress? = null,
    estimatedSizeMB: Double,
    exceedsStorageLimit: Boolean = false,
    canDownload: Boolean = true,
    onDownload: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isDownloaded) {
                MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.2f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
            },
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        if (isDownloaded) Icons.Default.CheckCircle else Icons.Default.Map,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = if (isDownloaded) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                    )
                    Text(
                        text = region.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = "${String.format("%.0f", estimatedSizeMB)} MB",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // Download button or status
            if (isDownloaded) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    Text(
                        "✓ Downloaded",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Button(
                        onClick = onDelete,
                        modifier = Modifier.height(32.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                            contentColor = MaterialTheme.colorScheme.onErrorContainer,
                        ),
                    ) {
                        Text("Delete", style = MaterialTheme.typography.labelSmall)
                    }
                }
            } else {
                Button(
                    onClick = onDownload,
                    enabled = canDownload && !exceedsStorageLimit,
                    modifier = Modifier.fillMaxWidth().height(36.dp),
                ) {
                    Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Download", style = MaterialTheme.typography.labelMedium)
                }
                if (exceedsStorageLimit) {
                    Text(
                        "⚠ Exceeds storage limit",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
                if (!canDownload && !exceedsStorageLimit) {
                    Text(
                        "⚠ Region limit reached",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            // Download progress
            downloadProgress?.let { progress ->
                if (!progress.isComplete && progress.error == null) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                text = "Downloading...",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = "${(progress.downloadedTiles.toFloat() / progress.totalTiles * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        LinearProgressIndicator(
                            progress = { 
                                if (progress.totalTiles > 0) {
                                    progress.downloadedTiles.toFloat() / progress.totalTiles.toFloat()
                                } else {
                                    0f
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Calculate distance between two geographic points in meters
 */
private fun calculateHaversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val earthRadius = 6371000.0 // meters
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
        kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) *
        kotlin.math.sin(dLon / 2) * kotlin.math.sin(dLon / 2)
    val c = 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
    return earthRadius * c
}
