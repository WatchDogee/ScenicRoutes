package com.scenicroutes.app.ui.screens.trips

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.*
import kotlinx.coroutines.flow.first
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.ui.viewmodel.TripsViewModel
import com.scenicroutes.app.ui.viewmodel.parseCollectionsJsonString
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.launch
import androidx.compose.ui.graphics.Color

// Enum to distinguish between routes, roads, and recorded rides
enum class RoadType {
    ROUTE,      // Calculated A→B path from route planner
    SCENIC_ROAD, // Scenic road segment from road network search
    RECORDED_RIDE // GPS recorded ride from ride recording
}

// Helper function to determine road type based on route_type field
fun SavedRoad.getRoadType(): RoadType {
    // Use route_type field as source of truth (set when saving)
    return when (this.route_type) {
        "route" -> RoadType.ROUTE
        "road" -> RoadType.SCENIC_ROAD
        "ride" -> RoadType.RECORDED_RIDE
        else -> {
            // Fallback heuristic for backward compatibility
            if (this.tags?.isNotEmpty() == true ||
                this.description?.isNotBlank() == true ||
                this.review_count > 0) {
                RoadType.SCENIC_ROAD
            } else {
                RoadType.ROUTE
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripsScreen(navController: NavController) {
    android.util.Log.d("TripsScreen", "=== TripsScreen composable called ===")
    val context = androidx.compose.ui.platform.LocalContext.current
    val viewModel: TripsViewModel = viewModel(
        factory = androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.getInstance(
            context.applicationContext as android.app.Application,
        ),
    )
    val savedRoads by viewModel.savedRoads.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    
    // Log current navigation state and reload when screen becomes visible
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val lifecycleOwner = LocalLifecycleOwner.current

    // Reload roads whenever the screen becomes visible (handles navigation back from other screens)
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                android.util.Log.d("TripsScreen", "=== SCREEN RESUMED - RELOADING SAVED ROADS ===")
                android.util.Log.d("TripsScreen", "Current saved roads count before reload: ${savedRoads.size}")
                viewModel.loadSavedRoads()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Log when saved roads list changes
    LaunchedEffect(savedRoads.size) {
        android.util.Log.d("TripsScreen", "=== SAVED ROADS LIST UPDATED ===")
        android.util.Log.d("TripsScreen", "Total saved roads: ${savedRoads.size}")
        if (savedRoads.isNotEmpty()) {
            android.util.Log.d("TripsScreen", "Most recent road: ${savedRoads.first().road_name} (ID: ${savedRoads.first().id})")
        }
    }
    
    // Track if screen was just resumed (navigated back to)
    var isResumed by remember { mutableStateOf(false) }
    var selectedRoadIds by remember { mutableStateOf<Set<Long>>(emptySet()) }
    var isSelectionMode by remember { mutableStateOf(false) }
    var showBulkActions by remember { mutableStateOf(false) }
    var showFolderDialog by remember { mutableStateOf(false) }
    var showAddToCollectionDialog by remember { mutableStateOf(false) }
    var selectedRoadForCollection by remember { mutableStateOf<SavedRoad?>(null) }

    // Search and filtering
    var searchQuery by remember { mutableStateOf("") }
    var showSearchBar by remember { mutableStateOf(false) }
    var selectedRoadTypeFilter by remember { mutableStateOf("all") } // all, road, route, ride

    val folderManager = remember { com.scenicroutes.app.data.local.RoadFolderManager(context) }
    val folders by folderManager.folders.collectAsState(initial = emptyList())
    val roadFolderMap by folderManager.roadFolderMap.collectAsState(initial = emptyMap())
    val coroutineScope = rememberCoroutineScope()
    
    // Check if user is logged in
    val tokenManager = remember { com.scenicroutes.app.data.local.TokenManager(context) }
    var isLoggedIn by remember { mutableStateOf<Boolean?>(null) }
    
    // Reload roads when screen becomes visible (handles navigation back)
    LaunchedEffect(Unit) {
        val token = tokenManager.token.first()
        isLoggedIn = token != null
        // Load roads when screen opens
        if (token != null) {
            android.util.Log.d("TripsScreen", "Loading saved roads on screen open")
            viewModel.loadSavedRoads()
        }
    }
    
    // Track when we navigate back to this screen
    // Use a simpler approach - reload when isLoading becomes false after being true
    // This handles the case where screen recomposes after navigation

    // Filter roads by search query and type
    val filteredRoads = remember(savedRoads, searchQuery, selectedRoadTypeFilter) {
        savedRoads.filter { road ->
            // Filter by search query
            val matchesSearch = if (searchQuery.isBlank()) {
                true
            } else {
                road.road_name.contains(searchQuery, ignoreCase = true) ||
                road.start_location.contains(searchQuery, ignoreCase = true) ||
                road.end_location.contains(searchQuery, ignoreCase = true) ||
                road.tags?.any { it.name.contains(searchQuery, ignoreCase = true) } == true
            }
            
            // Filter by type
            val matchesType = when (selectedRoadTypeFilter) {
                "all" -> true
                "road" -> road.getRoadType() == RoadType.SCENIC_ROAD
                "route" -> road.getRoadType() == RoadType.ROUTE
                "ride" -> road.route_type == "ride"
                else -> true
            }
            
            matchesSearch && matchesType
        }
    }

    Scaffold(
        topBar = {
            if (showSearchBar) {
                // Search bar mode
                TopAppBar(
                    title = {
                        TextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Search roads and routes...") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent,
                            ),
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = {
                            showSearchBar = false
                            searchQuery = ""
                        }) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Close search")
                        }
                    },
                    actions = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Clear, contentDescription = "Clear search")
                            }
                        }
                    },
                )
            } else {
                // Normal mode
                TopAppBar(
                    title = {
                        Column {
                            Text("My Roads")
                            Text(
                                "Your saved roads and routes",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    actions = {
                        IconButton(onClick = { showSearchBar = true }) {
                            Icon(Icons.Default.Search, contentDescription = "Search")
                        }
                    },
                )
            }
        },
    ) { _padding ->
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shadowElevation = 4.dp,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Spacer(modifier = Modifier.width(0.dp)) // Placeholder for title (now in TopAppBar)
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            if (isSelectionMode) {
                                TextButton(onClick = {
                                    isSelectionMode = false
                                    selectedRoadIds = emptySet()
                                }) {
                                    Text("Cancel")
                                }
                                TextButton(onClick = {
                                    if (selectedRoadIds.size == savedRoads.size) {
                                        selectedRoadIds = emptySet()
                                    } else {
                                        selectedRoadIds = savedRoads.map { it.id }.toSet()
                                    }
                                }) {
                                    Text(if (selectedRoadIds.size == savedRoads.size) "Deselect All" else "Select All")
                                }
                            } else {
                                IconButton(
                                    onClick = { navController.navigate("map") },
                                    modifier = Modifier.size(48.dp),
                                ) {
                                    Icon(
                                        Icons.Default.Search,
                                        contentDescription = "Search Roads",
                                        tint = MaterialTheme.colorScheme.primary,
                                    )
                                }
                                IconButton(onClick = { showFolderDialog = true }) {
                                    Icon(Icons.Default.Folder, contentDescription = "Folders")
                                }
                                IconButton(onClick = { isSelectionMode = true }) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = "Select")
                                }
                                IconButton(onClick = { viewModel.refresh() }) {
                                    Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                                }
                            }
                        }
                    }
                }
            }

            // Error message display with retry
            errorMessage?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = error,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                            // Show retry button for 401 errors
                            if (error.contains("401") || error.contains("Unauthorized")) {
                                Spacer(modifier = Modifier.height(8.dp))
                                TextButton(
                                    onClick = { 
                                        viewModel.loadSavedRoads()
                                    },
                                    colors = ButtonDefaults.textButtonColors(
                                        contentColor = MaterialTheme.colorScheme.onErrorContainer,
                                    ),
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Retry")
                                }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(onClick = { viewModel.clearError() }) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Dismiss",
                                    tint = MaterialTheme.colorScheme.onErrorContainer,
                                )
                            }
                            TextButton(onClick = { viewModel.refresh() }) {
                                Text("Retry", color = MaterialTheme.colorScheme.onErrorContainer)
                            }
                        }
                    }
                }
            }

            // Content
            when {
                isLoggedIn == false -> {
                    // Show login prompt
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
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
                                    Icons.AutoMirrored.Filled.Login,
                                    contentDescription = null,
                                    modifier = Modifier.size(64.dp),
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                                Text(
                                    text = "Sign In Required",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    text = "Please sign in to view and manage your saved roads.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Button(
                                    onClick = {
                                        navController.navigate("profile") {
                                            launchSingleTop = true
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.Login, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Go to Profile to Sign In")
                                }
                            }
                        }
                    }
                }
                isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
                savedRoads.isEmpty() -> {
                    // Show empty state with search prompt
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                                ),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text(
                                        text = "Search for Roads to Save",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        text = "Drop a marker on the map to search for roads. Adjust curvature filters to find curved roads.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                                    )
                                    Button(
                                        onClick = { navController.navigate("map") },
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = MaterialTheme.colorScheme.primary,
                                        ),
                                    ) {
                                        Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Search Roads", fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                    // Search button card (always visible)
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                            ),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    text = "Search for Roads to Save",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    text = "Drop a marker on the map to search for roads. Adjust curvature filters to find curved roads.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                                )
                                Button(
                                    onClick = { 
                                        // Navigate to map and enable marker drop mode for road search
                                        navController.navigate("map?enableRoadSearch=true") {
                                            launchSingleTop = true
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.primary,
                                    ),
                                ) {
                                    Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Search Roads", fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }

                    // Bulk Actions Bar
                    if (selectedRoadIds.isNotEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                                ),
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = "${selectedRoadIds.size} selected",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        // Bulk move to folder
                                        if (folders.isNotEmpty()) {
                                            OutlinedButton(
                                                onClick = { showFolderDialog = true },
                                            ) {
                                                Icon(Icons.Default.Folder, contentDescription = null, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Move")
                                            }
                                        }

                                        // Bulk delete
                                        OutlinedButton(
                                            onClick = {
                                                showBulkActions = true
                                            },
                                            colors = ButtonDefaults.outlinedButtonColors(
                                                contentColor = MaterialTheme.colorScheme.error,
                                            ),
                                        ) {
                                            Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Delete")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Show empty state if no roads match search
                    if (filteredRoads.isEmpty() && searchQuery.isNotBlank()) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 48.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                            ) {
                                Icon(
                                    imageVector = Icons.Default.SearchOff,
                                    contentDescription = null,
                                    modifier = Modifier.size(64.dp),
                                    tint = MaterialTheme.colorScheme.outline,
                                )
                                Text(
                                    text = "No roads found",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    text = "Try a different search term",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                OutlinedButton(onClick = { searchQuery = "" }) {
                                    Text("Clear Search")
                                }
                            }
                        }
                    }

                    // Group filtered roads by folder
                    val roadsByFolder = filteredRoads.groupBy { roadFolderMap[it.id] ?: "uncategorized" }
                    val folderOrder = listOf("uncategorized") + folders.map { it.id }

                    // Show filter chips before folders (only for uncategorized/first section)
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                        ) {
                            Text(
                                "Filter by Type",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 8.dp),
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                listOf(
                                    "all" to "All Types",
                                    "road" to "Scenic Roads",
                                    "route" to "Planned Routes",
                                    "ride" to "Recorded Rides"
                                ).forEach { (value, label) ->
                                    FilterChip(
                                        selected = selectedRoadTypeFilter == value,
                                        onClick = { selectedRoadTypeFilter = value },
                                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                                    )
                                }
                            }
                        }
                    }

                    folderOrder.forEach { folderId ->
                        val folderRoads = roadsByFolder[folderId] ?: emptyList()
                        if (folderRoads.isNotEmpty()) {
                            item {
                                Text(
                                    text = if (folderId == "uncategorized") "Uncategorized" else folders.find { it.id == folderId }?.name ?: "Unknown",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(vertical = 8.dp),
                                )
                            }
                            items(folderRoads) { road ->
                                SavedRoadCard(
                                    road = road,
                                    onNavigate = { 
                                        android.util.Log.d("TripsScreen", "Navigate clicked for road ${road.id}")
                                        // Navigate to Road Details Screen, user can then click Navigate button there
                                        navController.navigate("road_details/${road.id}") {
                                            launchSingleTop = true
                                        }
                                    },
                                    onEdit = { /* TODO: Edit road */ },
                                    onDelete = { viewModel.deleteRoad(road.id) },
                                    onShowDetails = {
                                        navController.navigate("road_details/${road.id}")
                                    },
                                    isSelected = road.id in selectedRoadIds,
                                    isSelectionMode = isSelectionMode,
                                    onToggleSelection = {
                                        selectedRoadIds = if (road.id in selectedRoadIds) {
                                            selectedRoadIds - road.id
                                        } else {
                                            selectedRoadIds + road.id
                                        }
                                    },
                                    folderName = if (folderId != "uncategorized") folders.find { it.id == folderId }?.name else null,
                                    onMoveToFolder = { targetFolderId: String? ->
                                        coroutineScope.launch {
                                            folderManager.assignRoadToFolder(road.id, targetFolderId)
                                        }
                                    },
                                    availableFolders = folders,
                                    onAddToCollection = { roadToAdd ->
                                        selectedRoadForCollection = roadToAdd
                                        showAddToCollectionDialog = true
                                    },
                                )
                            }
                        }
                    }
                }
                }
            }

            // Folder Management Dialog
            if (showFolderDialog && selectedRoadIds.isEmpty()) {
                FolderManagementDialog(
                    folders = folders,
                    onCreateFolder = { name ->
                        coroutineScope.launch {
                            folderManager.createFolder(name)
                        }
                    },
                    onDeleteFolder = { folderId ->
                        coroutineScope.launch {
                            folderManager.deleteFolder(folderId)
                        }
                    },
                    onDismiss = { showFolderDialog = false },
                )
            }

            // Bulk Move to Folder Dialog
            if (showFolderDialog && selectedRoadIds.isNotEmpty()) {
                BulkMoveToFolderDialog(
                    folders = folders,
                    selectedCount = selectedRoadIds.size,
                    onSelectFolder = { folderId: String? ->
                        coroutineScope.launch {
                            selectedRoadIds.forEach { roadId ->
                                folderManager.assignRoadToFolder(roadId, folderId)
                            }
                            selectedRoadIds = emptySet()
                            isSelectionMode = false
                            showFolderDialog = false
                        }
                    },
                    onDismiss = {
                        showFolderDialog = false
                    },
                )
            }

            // Bulk Delete Confirmation Dialog
            if (showBulkActions) {
                AlertDialog(
                    onDismissRequest = { showBulkActions = false },
                    title = { Text("Delete ${selectedRoadIds.size} Road(s)?") },
                    text = { Text("This action cannot be undone.") },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                selectedRoadIds.forEach { id ->
                                    viewModel.deleteRoad(id)
                                }
                                selectedRoadIds = emptySet()
                                isSelectionMode = false
                                showBulkActions = false
                            },
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = MaterialTheme.colorScheme.error,
                            ),
                        ) {
                            Text("Delete")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showBulkActions = false }) {
                            Text("Cancel")
                        }
                    },
                )
            }

            // Add to Collection Dialog
            if (showAddToCollectionDialog && selectedRoadForCollection != null) {
                AddRoadToCollectionDialog(
                    road = selectedRoadForCollection!!,
                    onDismiss = {
                        showAddToCollectionDialog = false
                        selectedRoadForCollection = null
                    },
                    onSuccess = {
                        showAddToCollectionDialog = false
                        selectedRoadForCollection = null
                        android.widget.Toast.makeText(
                            context,
                            "Road added to collection",
                            android.widget.Toast.LENGTH_SHORT,
                        ).show()
                    },
                )
            }
        }
    }
}

@Composable
fun SavedRoadCard(
    road: SavedRoad,
    onNavigate: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onShowDetails: () -> Unit = {},
    isSelected: Boolean = false,
    isSelectionMode: Boolean = false,
    onToggleSelection: () -> Unit = {},
    folderName: String? = null,
    onMoveToFolder: ((String?) -> Unit)? = null,
    availableFolders: List<com.scenicroutes.app.data.local.RoadFolder> = emptyList(),
    onAddToCollection: ((SavedRoad) -> Unit)? = null,
) {
    var showFolderMenu by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    // Determine road type for visual differentiation
    val roadType = road.getRoadType()
    val typeColor = when (roadType) {
        RoadType.ROUTE -> Color(0xFF2196F3) // Blue for planned routes
        RoadType.SCENIC_ROAD -> Color(0xFF9C27B0) // Purple for scenic roads
        RoadType.RECORDED_RIDE -> Color(0xFF4CAF50) // Green for recorded rides
    }
    val typeBackgroundColor = when (roadType) {
        RoadType.ROUTE -> Color(0xFFE3F2FD)
        RoadType.SCENIC_ROAD -> Color(0xFFF3E5F5)
        RoadType.RECORDED_RIDE -> Color(0xFFE8F5E9)
    }
    val typeIcon = when (roadType) {
        RoadType.ROUTE -> Icons.Default.Map
        RoadType.SCENIC_ROAD -> Icons.Default.Landscape
        RoadType.RECORDED_RIDE -> Icons.Default.FitnessCenter
    }
    val typeLabel = when (roadType) {
        RoadType.ROUTE -> "Planned Route"
        RoadType.SCENIC_ROAD -> "Scenic Road"
        RoadType.RECORDED_RIDE -> "Recorded Ride"
    }

    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = {
                if (isSelectionMode) {
                    onToggleSelection()
                } else {
                    onShowDetails()
                }
            }),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = if (isSelected) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Selection checkbox or type icon
            if (isSelectionMode) {
                Checkbox(
                    checked = isSelected,
                    onCheckedChange = { onToggleSelection() },
                    modifier = Modifier.align(Alignment.Top),
                )
            } else {
                // Type icon
                Icon(
                    imageVector = typeIcon,
                    contentDescription = typeLabel,
                    tint = typeColor,
                    modifier = Modifier
                        .size(40.dp)
                        .align(Alignment.Top),
                )
            }

            // Content column
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Type badge - use route_type field as source of truth
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = typeBackgroundColor,
                ) {
                    Text(
                        text = when (road.route_type) {
                            "route" -> "ROUTE"
                            "road" -> "ROAD"
                            "ride" -> "RIDE"
                            else -> "ITEM"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = typeColor,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }

                // Road name with folder badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = road.road_name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    folderName?.let {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer,
                        ) {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                    }
                }

                // Location
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        Icons.Default.Place,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "${road.start_location} → ${road.end_location}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                // Metrics row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Distance
                    if (road.distance != null) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.Straighten,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(road.distance),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    // Duration (for routes and rides)
                    if (road.duration != null && (roadType == RoadType.ROUTE || roadType == RoadType.RECORDED_RIDE)) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            val hours = road.duration / 3600
                            val minutes = (road.duration % 3600) / 60
                            Text(
                                text = if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    // Rating (for scenic roads only)
                    if (road.average_rating != null && roadType == RoadType.SCENIC_ROAD) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = Color(0xFFFFC107), // Amber color for star
                            )
                            Text(
                                text = String.format("%.1f", road.average_rating),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (road.review_count > 0) {
                                Text(
                                    text = "(${road.review_count})",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }

                // Tags (if available, for scenic roads only)
                if (road.tags?.isNotEmpty() == true && roadType == RoadType.SCENIC_ROAD) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        road.tags.take(3).forEach { tag ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.tertiaryContainer,
                            ) {
                                Text(
                                    text = tag.name,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                )
                            }
                        }
                        if (road.tags.size > 3) {
                            Text(
                                text = "+${road.tags.size - 3}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.align(Alignment.CenterVertically),
                            )
                        }
                    }
                }
            }

            // Actions column
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row {
                    if (onMoveToFolder != null) {
                        Box {
                            IconButton(onClick = { showFolderMenu = true }) {
                                Icon(Icons.Default.Folder, contentDescription = "Move to Folder")
                            }
                            DropdownMenu(
                                expanded = showFolderMenu,
                                onDismissRequest = { showFolderMenu = false },
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Uncategorized") },
                                    onClick = {
                                        onMoveToFolder(null)
                                        showFolderMenu = false
                                    },
                                )
                                availableFolders.forEach { folder ->
                                    DropdownMenuItem(
                                        text = { Text(folder.name) },
                                        onClick = {
                                            onMoveToFolder(folder.id)
                                            showFolderMenu = false
                                        },
                                    )
                                }
                            }
                        }
                    }
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More")
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text("Edit") },
                                onClick = {
                                    onEdit()
                                    showMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Edit, contentDescription = null)
                                },
                            )
                            onAddToCollection?.let { addToCollection ->
                                DropdownMenuItem(
                                    text = { Text("Add to Collection") },
                                    onClick = {
                                        addToCollection(road)
                                        showMenu = false
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Default.Folder, contentDescription = null)
                                    },
                                )
                            }
                            DropdownMenuItem(
                                text = { Text("Delete") },
                                onClick = {
                                    onDelete()
                                    showMenu = false
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Delete, contentDescription = null)
                                },
                            )
                        }
                    }
                }

                // Navigate button
                IconButton(
                    onClick = onNavigate,
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = typeColor.copy(alpha = 0.1f),
                        contentColor = typeColor,
                    ),
                ) {
                    Icon(
                        Icons.Default.Navigation,
                        contentDescription = "Navigate",
                        modifier = Modifier.size(24.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyState(onAddRoute: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(
                Icons.Default.Route,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = "No saved trips",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Plan a route and save it to see it here",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = onAddRoute) {
                Text("Plan Route")
            }
        }
    }
}

@Composable
fun AddRoadToCollectionDialog(
    road: SavedRoad,
    onDismiss: () -> Unit,
    onSuccess: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var collections by remember { mutableStateOf<List<Collection>>(emptyList()) }
    var selectedCollectionId by remember { mutableStateOf<Long?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isAdding by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
        val token = tokenManager.token.first()
        if (token != null) {
            try {
                val apiService = NetworkModule.apiService
                val response = apiService.getCollections("Bearer $token")
                if (response.isSuccessful) {
                    val parsedCollections = parseCollectionsJsonString(response.body()?.string())
                    collections = parsedCollections
                    if (parsedCollections.isEmpty()) {
                        errorMessage = "No collections found"
                    }
                } else {
                    errorMessage = "Failed to load collections (${response.code()})"
                }
            } catch (e: Exception) {
                android.util.Log.e("AddRoadToCollection", "Error loading collections: ${e.message}", e)
                errorMessage = "Error: ${e.message ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        } else {
            errorMessage = "Please log in to add roads to collections"
            isLoading = false
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add to Collection") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "Select a collection to add \"${road.road_name}\" to:",
                    style = MaterialTheme.typography.bodyMedium,
                )
                
                if (isLoading) {
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (errorMessage != null) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Text(
                            text = errorMessage ?: "Unknown error",
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                } else if (collections.isEmpty()) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = "No collections yet",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = "Create a collection first",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.height(300.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(collections) { collection ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedCollectionId = collection.id
                                    },
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                RadioButton(
                                    selected = collection.id == selectedCollectionId,
                                    onClick = { selectedCollectionId = collection.id },
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = collection.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    collection.description?.let {
                                        Text(
                                            text = it,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 1,
                                        )
                                    }
                                    Text(
                                        text = "${collection.road_count} roads",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    selectedCollectionId?.let { collectionId ->
                        isAdding = true
                        coroutineScope.launch {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            val token = tokenManager.token.first()
                            if (token != null) {
                                try {
                                    val apiService = NetworkModule.apiService
                                    val response = apiService.addRoadsToCollection(
                                        "Bearer $token",
                                        collectionId,
                                        com.scenicroutes.app.data.api.AddRoadsRequest(listOf(road.id)),
                                    )
                                    if (response.isSuccessful) {
                                        onSuccess()
                                    } else {
                                        errorMessage = "Failed to add road to collection"
                                        isAdding = false
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("AddRoadToCollection", "Error adding road: ${e.message}", e)
                                    errorMessage = "Error: ${e.message ?: "Unknown error"}"
                                    isAdding = false
                                }
                            } else {
                                errorMessage = "Please log in"
                                isAdding = false
                            }
                        }
                    }
                },
                enabled = selectedCollectionId != null && !isAdding && collections.isNotEmpty(),
            ) {
                if (isAdding) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text("Add")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}
