package com.scenicroutes.app.ui.screens.social

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.model.SavedRoad
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
// Pull-to-refresh temporarily disabled - requires Material 3 1.2.0+
// import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
// import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SocialFeedScreen(
    navController: NavController,
    showTopBar: Boolean = true,
    modifier: Modifier = Modifier,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var feedRoads by remember { mutableStateOf<List<SavedRoad>>(emptyList()) }
    var feedCollections by remember { mutableStateOf<List<Collection>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isLoadingMore by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var selectedFilter by remember { mutableStateOf("All") } // All, Roads, Collections
    var timeFilter by remember { mutableStateOf("All") } // All, Today, This Week, This Month
    var page by remember { mutableStateOf(1) }
    var hasMore by remember { mutableStateOf(true) }
    

    val coroutineScope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    // Pull-to-refresh temporarily disabled
    // val pullToRefreshState = rememberPullToRefreshState()

    fun loadFeed(refresh: Boolean = false) {
        coroutineScope.launch {
            if (refresh) {
                isLoading = true
            }
            errorMessage = null
            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
            val token = tokenManager.token.first()
            android.util.Log.d("SocialFeed", "Loading feed, refresh=$refresh, hasToken=${token != null}")
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.getFeed("Bearer $token")
                    android.util.Log.d("SocialFeed", "Feed response: code=${response.code()}, isSuccessful=${response.isSuccessful}")
                    if (response.isSuccessful) {
                        val feedMap = response.body()
                        android.util.Log.d("SocialFeed", "Feed body: $feedMap")
                        if (feedMap != null) {
                            val roadsRaw = (feedMap["roads"] as? List<*>) ?: emptyList<Any>()
                            val collectionsRaw = (feedMap["collections"] as? List<*>) ?: emptyList<Any>()

                            val gson = com.google.gson.GsonBuilder()
                                .registerTypeAdapter(com.scenicroutes.app.data.model.SavedRoad::class.java, com.scenicroutes.app.data.model.SavedRoadTypeAdapter())
                                .create()

                            val roads = roadsRaw.mapNotNull { item ->
                                try {
                                    val jsonElement = com.google.gson.Gson().toJsonTree(item)
                                    gson.fromJson(jsonElement, com.scenicroutes.app.data.model.SavedRoad::class.java)
                                } catch (e: Exception) {
                                    android.util.Log.w("SocialFeed", "Error parsing road item: ${e.message}", e)
                                    null
                                }
                            }
                            val collections = collectionsRaw.mapNotNull { item ->
                                try {
                                    val jsonElement = com.google.gson.Gson().toJsonTree(item)
                                    com.google.gson.Gson().fromJson(jsonElement, com.scenicroutes.app.data.model.Collection::class.java)
                                } catch (e: Exception) {
                                    android.util.Log.w("SocialFeed", "Error parsing collection item: ${e.message}", e)
                                    null
                                }
                            }

                            android.util.Log.d("SocialFeed", "Parsed feed: ${roads.size} roads, ${collections.size} collections")
                            if (refresh) {
                                feedRoads = roads
                                feedCollections = collections
                            } else {
                                feedRoads = feedRoads + roads
                                feedCollections = feedCollections + collections
                            }
                            hasMore = roads.isNotEmpty() || collections.isNotEmpty()
                            errorMessage = null // Clear error on success
                            android.util.Log.d("SocialFeed", "Feed loaded successfully. Total: ${feedRoads.size} roads, ${feedCollections.size} collections")
                        } else {
                            android.util.Log.w("SocialFeed", "Feed body is null")
                            errorMessage = "Feed data is empty"
                        }
                    } else {
                        val errorBody = response.errorBody()?.string()
                        android.util.Log.e("SocialFeed", "API Error: ${response.code()} - $errorBody")
                        errorMessage = when (response.code()) {
                            401 -> "Please log in to view social feed"
                            404 -> "Feed endpoint not found"
                            else -> "Failed to load feed (${response.code()})"
                        }
                    }
                } catch (e: java.net.ConnectException) {
                    android.util.Log.e("SocialFeed", "Connection error - backend not reachable: ${e.message}", e)
                    errorMessage = "Failed to connect to /10.0.2.2:8000 after 30000ms. Make sure Laravel is running."
                } catch (e: java.net.SocketTimeoutException) {
                    android.util.Log.e("SocialFeed", "Connection timeout - backend not responding: ${e.message}", e)
                    errorMessage = "Connection timeout. Make sure Laravel backend is running on port 8000."
                } catch (e: Exception) {
                    android.util.Log.e("SocialFeed", "Error loading feed: ${e.message}", e)
                    android.util.Log.e("SocialFeed", "Exception type: ${e.javaClass.name}")
                    errorMessage = "Error: ${e.message ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            } else {
                android.util.Log.w("SocialFeed", "No token available")
                errorMessage = "Please log in to view social feed"
                isLoading = false
            }
        }
    }

    // Infinite scroll detection - fixed to prevent duplicate calls
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }
            .collect { lastVisibleIndex ->
                val totalItems = feedRoads.size + feedCollections.size
                if (lastVisibleIndex != null && lastVisibleIndex >= totalItems - 3 && hasMore && !isLoadingMore && !isLoading) {
                    isLoadingMore = true
                    // Note: Feed API doesn't support pagination yet, so we just mark as no more
                    hasMore = false
                    isLoadingMore = false
                }
            }
    }

    // Pull to refresh - temporarily disabled
    // LaunchedEffect(pullToRefreshState.isRefreshing) {
    //     if (pullToRefreshState.isRefreshing) {
    //         page = 1
    //         hasMore = true
    //         loadFeed(refresh = true)
    //         pullToRefreshState.endRefresh()
    //     }
    // }

    fun loadMoreFeed() {
        if (isLoadingMore || !hasMore) return

        coroutineScope.launch {
            isLoadingMore = true
            page++
            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.getFeed("Bearer $token")
                    if (response.isSuccessful && response.body() != null) {
                        val feedMap = response.body()!!
                        val roadsRaw = (feedMap["roads"] as? List<*>) ?: emptyList<Any>()
                        val collectionsRaw = (feedMap["collections"] as? List<*>) ?: emptyList<Any>()

                        val gson = com.google.gson.GsonBuilder()
                            .registerTypeAdapter(com.scenicroutes.app.data.model.SavedRoad::class.java, com.scenicroutes.app.data.model.SavedRoadTypeAdapter())
                            .create()

                        val roads = roadsRaw.mapNotNull { item ->
                            try {
                                val jsonElement = com.google.gson.Gson().toJsonTree(item)
                                gson.fromJson(jsonElement, com.scenicroutes.app.data.model.SavedRoad::class.java)
                            } catch (e: Exception) { null }
                        }
                        val collections = collectionsRaw.mapNotNull { item ->
                            try {
                                val jsonElement = com.google.gson.Gson().toJsonTree(item)
                                com.google.gson.Gson().fromJson(jsonElement, com.scenicroutes.app.data.model.Collection::class.java)
                            } catch (e: Exception) { null }
                        }
                        feedRoads = feedRoads + roads
                        feedCollections = feedCollections + collections
                        hasMore = roads.isNotEmpty() || collections.isNotEmpty()
                    } else {
                        hasMore = false
                    }
                } catch (e: Exception) {
                    android.util.Log.e("SocialFeed", "Error loading more feed: ${e.message}", e)
                    hasMore = false
                } finally {
                    isLoadingMore = false
                }
            } else {
                hasMore = false
                isLoadingMore = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadFeed()
    }

    Scaffold(
        topBar = if (showTopBar) {
            {
                Column {
                    TopAppBar(
                        title = { Text("Social Feed") },
                        navigationIcon = {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                            }
                        },
                        actions = {
                            IconButton(onClick = {
                                navController.navigate("user_search") {
                                    launchSingleTop = true
                                }
                            }) {
                                Icon(Icons.Default.Search, contentDescription = "Search Users")
                            }
                            IconButton(onClick = { navController.navigate("following") }) {
                                Icon(Icons.Default.Person, contentDescription = "Following")
                            }
                            IconButton(onClick = { navController.navigate("followers") }) {
                                Icon(Icons.Default.People, contentDescription = "Followers")
                            }
                            IconButton(onClick = { loadFeed() }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                            }
                        },
                    )
                    
                    // Filter chips with proper spacing
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .padding(bottom = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        // Type filters
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            FilterChip(
                                selected = selectedFilter == "All",
                                onClick = { selectedFilter = "All" },
                                label = { Text("All") },
                            )
                            FilterChip(
                                selected = selectedFilter == "Roads",
                                onClick = { selectedFilter = "Roads" },
                                label = { Text("Roads") },
                            )
                            FilterChip(
                                selected = selectedFilter == "Collections",
                                onClick = { selectedFilter = "Collections" },
                                label = { Text("Collections") },
                            )
                        }
                        // Time filters
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            FilterChip(
                                selected = timeFilter == "All",
                                onClick = { timeFilter = "All" },
                                label = { Text("All Time") },
                            )
                            FilterChip(
                                selected = timeFilter == "Today",
                                onClick = { timeFilter = "Today" },
                                label = { Text("Today") },
                            )
                            FilterChip(
                                selected = timeFilter == "This Week",
                                onClick = { timeFilter = "This Week" },
                                label = { Text("This Week") },
                            )
                            FilterChip(
                                selected = timeFilter == "This Month",
                                onClick = { timeFilter = "This Month" },
                                label = { Text("This Month") },
                            )
                        }
                    }
                }
            }
        } else {
            @Composable { }
        },
        // Removed FAB - not needed in social feed
    ) { padding ->
        val contentPadding = modifier
            .padding(padding)
            .padding(
                top = if (!showTopBar) 8.dp else 0.dp,
                bottom = if (showTopBar) 20.dp else 30.dp,
            )

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .then(contentPadding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .then(contentPadding),
            ) {
                // Filter chips (only show if topBar is hidden)
                if (!showTopBar) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilterChip(
                            selected = selectedFilter == "All",
                            onClick = { selectedFilter = "All" },
                            label = { Text("All") },
                        )
                        FilterChip(
                            selected = selectedFilter == "Roads",
                            onClick = { selectedFilter = "Roads" },
                            label = { Text("Roads") },
                        )
                        FilterChip(
                            selected = selectedFilter == "Collections",
                            onClick = { selectedFilter = "Collections" },
                            label = { Text("Collections") },
                        )
                    }
                }

                // Error message - Use info style for login prompts, error style for actual errors
                // Fixed z-index to display properly above other UI elements
                errorMessage?.let { error ->
                    android.util.Log.e("SocialFeed", "Displaying error message: $error")
                    val isLoginPrompt = error.contains("log in", ignoreCase = true)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .zIndex(100f), // Ensure error displays above other elements
                        colors = CardDefaults.cardColors(
                            containerColor = if (isLoginPrompt) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.errorContainer
                            },
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp), // Add elevation for visibility
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
                                    color = if (isLoginPrompt) {
                                        MaterialTheme.colorScheme.onPrimaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.onErrorContainer
                                    },
                                )
                                // Add helpful hint if backend is not running
                                if (error.contains("Failed to connect", ignoreCase = true) || 
                                    error.contains("30000ms", ignoreCase = true) ||
                                    error.contains("timeout", ignoreCase = true)) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Hint: Make sure the Laravel backend is running",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (isLoginPrompt) {
                                            MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                                        } else {
                                            MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.7f)
                                        },
                                    )
                                }
                            }
                            if (isLoginPrompt) {
                                TextButton(
                                    onClick = {
                                        navController.navigate("profile") {
                                            launchSingleTop = true
                                        }
                                    },
                                ) {
                                    Text("Log In")
                                }
                            } else {
                                // Add retry button for errors
                                TextButton(
                                    onClick = {
                                        android.util.Log.d("SocialFeed", "Retry button clicked, reloading feed")
                                        loadFeed(refresh = true)
                                    },
                                ) {
                                    Text("Retry")
                                }
                            }
                        }
                    }
                }

                // Feed content
                Box(
                    modifier = Modifier.fillMaxSize(),
                    // Pull-to-refresh temporarily disabled
                    // .nestedScroll(pullToRefreshState.nestedScrollConnection)
                ) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(
                            start = 16.dp,
                            end = 16.dp,
                            top = 16.dp,
                            bottom = 120.dp, // Extra bottom padding to prevent cut-off
                        ),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // Apply time filter
                        fun filterByTime(items: List<Any>): List<Any> {
                            if (timeFilter == "All") return items
                            
                            val now = System.currentTimeMillis()
                            val cutoffTime = when (timeFilter) {
                                "Today" -> now - (24 * 60 * 60 * 1000) // 24 hours
                                "This Week" -> now - (7 * 24 * 60 * 60 * 1000) // 7 days
                                "This Month" -> now - (30 * 24 * 60 * 60 * 1000) // 30 days
                                else -> 0L
                            }
                            
                            return items.filter { item ->
                                val createdAt = when (item) {
                                    is SavedRoad -> item.created_at
                                    is Collection -> item.created_at
                                    else -> null
                                }
                                createdAt?.let { dateStr ->
                                    try {
                                        val date = java.time.Instant.parse(dateStr).toEpochMilli()
                                        date >= cutoffTime
                                    } catch (e: Exception) {
                                        true // Include if parsing fails
                                    }
                                } ?: true
                            }
                        }
                        
                        var filteredRoads = if (selectedFilter == "All" || selectedFilter == "Roads") feedRoads else emptyList()
                        var filteredCollections = if (selectedFilter == "All" || selectedFilter == "Collections") feedCollections else emptyList()
                        
                        // Apply time filter
                        filteredRoads = filterByTime(filteredRoads) as List<SavedRoad>
                        filteredCollections = filterByTime(filteredCollections) as List<Collection>

                        items(filteredRoads) { road ->
                            FeedRoadCard(
                                road = road,
                                onClick = {
                                    navController.navigate("road_details/${road.id}")
                                },
                                onUserClick = {
                                    navController.navigate("user_profile/${road.user_id}")
                                },
                            )
                        }
                        items(filteredCollections) { collection ->
                            FeedCollectionCard(
                                collection = collection,
                                onClick = {
                                    navController.navigate("collection/${collection.id}")
                                },
                                _onUserClick = {
                                    navController.navigate("user_profile/${collection.user_id}")
                                },
                            )
                        }

                        if (filteredRoads.isEmpty() && filteredCollections.isEmpty()) {
                            item {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 32.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(16.dp),
                                ) {
                                    Spacer(modifier = Modifier.height(32.dp)) // Add spacing above icon
                                    Icon(
                                        Icons.Default.People,
                                        contentDescription = null,
                                        modifier = Modifier.size(64.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        text = if (selectedFilter == "All") "No activity yet" else "No ${selectedFilter.lowercase()} yet",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        text = if (selectedFilter == "All") {
                                            "Follow users to see their roads and collections here"
                                        } else {
                                            "No ${selectedFilter.lowercase()} in your feed yet"
                                        },
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = 32.dp),
                                    )
                                    
                                    // Action buttons for discovering social features
                                    if (selectedFilter == "All") {
                                        Column(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 32.dp),
                                            verticalArrangement = Arrangement.spacedBy(12.dp),
                                        ) {
                                            // View Following button
                                            OutlinedButton(
                                                onClick = {
                                                    navController.navigate("following") {
                                                        launchSingleTop = true
                                                    }
                                                },
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("View Following")
                                            }
                                            
                                            // View Followers button
                                            OutlinedButton(
                                                onClick = {
                                                    navController.navigate("followers") {
                                                        launchSingleTop = true
                                                    }
                                                },
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Icon(Icons.Default.People, contentDescription = null, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("View Followers")
                                            }
                                            
                                            // Discover Users button
                                            Button(
                                                onClick = {
                                                    navController.navigate("user_search") {
                                                        launchSingleTop = true
                                                    }
                                                },
                                                modifier = Modifier.fillMaxWidth(),
                                            ) {
                                                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("Discover Users", fontWeight = FontWeight.SemiBold)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Loading more indicator
                        if (isLoadingMore) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(modifier = Modifier.size(32.dp))
                                }
                            }
                        }
                    }

                    // Pull-to-refresh temporarily disabled
                    // PullToRefreshContainer(
                    //     state = pullToRefreshState,
                    //     modifier = Modifier.align(Alignment.TopCenter)
                    // )
                }
            }
        }
        
    }
}

@Composable
fun FeedRoadCard(road: SavedRoad, onClick: () -> Unit, onUserClick: () -> Unit = {}) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(0.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            // Road photo if available
            road.photos?.firstOrNull()?.let { photo ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp),
                ) {
                    AsyncImage(
                        model = photo.url,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    )
                }
            } ?: run {
                // Placeholder if no photo
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Default.Route,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // User info
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onUserClick),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            modifier = Modifier.size(40.dp),
                            shape = androidx.compose.foundation.shape.CircleShape,
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    modifier = Modifier.size(24.dp),
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = road.road_name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = road.user?.name ?: "Unknown User",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                // Road info
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    road.distance?.let {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.secondaryContainer,
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    Icons.Default.Straighten,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(it),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                                )
                            }
                        }
                    }
                    road.rating?.let {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.tertiaryContainer,
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    String.format("%.1f", it),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FeedCollectionCard(collection: Collection, onClick: () -> Unit, _onUserClick: () -> Unit = {}) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Collection cover
            Surface(
                modifier = Modifier.size(100.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
            ) {
                collection.cover_image_url?.let { coverUrl ->
                    AsyncImage(
                        model = coverUrl,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    )
                } ?: run {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = collection.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                collection.description?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        modifier = Modifier.padding(vertical = 4.dp),
                    )
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Default.Route,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "${collection.road_count} roads",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                        )
                    }
                }
            }
        }
    }
}
