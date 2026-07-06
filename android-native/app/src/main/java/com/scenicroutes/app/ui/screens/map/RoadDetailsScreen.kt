package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.model.Review
import com.scenicroutes.app.data.model.Comment
import com.scenicroutes.app.ui.viewmodel.MapViewModel
import com.scenicroutes.app.utils.toRoute
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoadDetailsScreen(
    roadId: Long,
    navController: NavController,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    // Use activity-scoped ViewModel to share state with MapScreen
    val activity = context as? androidx.activity.ComponentActivity
    val viewModel: MapViewModel = if (activity != null) {
        viewModel(viewModelStoreOwner = activity)
    } else {
        viewModel() // Fallback to default scoping
    }
    
    var road by remember { mutableStateOf<SavedRoad?>(null) }
    var reviews by remember { mutableStateOf<List<Review>>(emptyList()) }
    var comments by remember { mutableStateOf<List<Comment>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var selectedTab by remember { mutableStateOf(0) }
    var showPhotoUpload by remember { mutableStateOf(false) }
    
    LaunchedEffect(roadId) {
        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            android.util.Log.d("RoadDetailsScreen", "Loading road details for roadId=$roadId")
            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
            val token = tokenManager.token.first()
            android.util.Log.d("RoadDetailsScreen", "Token available: ${token != null}")
            
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                var loaded = false
                var lastErrorCode: Int? = null
                
                // Try authenticated endpoint first if token exists
                if (token != null) {
                    try {
                        android.util.Log.d("RoadDetailsScreen", "Attempting authenticated endpoint for roadId=$roadId")
                        val response = apiService.getSavedRoad("Bearer $token", roadId)
                        android.util.Log.d("RoadDetailsScreen", "Authenticated endpoint response: code=${response.code()}, isSuccessful=${response.isSuccessful}")
                        
                        if (response.isSuccessful && response.body() != null) {
                            road = response.body()
                            // Check if this is an error road (id = -1 indicates parsing error)
                            if (road?.id == -1L) {
                                android.util.Log.e("RoadDetailsScreen", "Received error road from authenticated endpoint (likely truncated JSON)")
                                errorMessage = road?.description ?: "Failed to load road details due to a server error."
                                road = null
                            } else {
                                reviews = road?.reviews ?: emptyList()
                                comments = road?.comments ?: emptyList()
                                loaded = true
                                android.util.Log.d("RoadDetailsScreen", "Successfully loaded road from authenticated endpoint: ${road?.road_name}")
                            }
                        } else {
                            lastErrorCode = response.code()
                            android.util.Log.w("RoadDetailsScreen", "Authenticated endpoint failed (code=$lastErrorCode, message=${response.message()})")
                            
                            // Try to get error message from response
                            try {
                                val errorBody = response.errorBody()?.string()
                                android.util.Log.d("RoadDetailsScreen", "Authenticated endpoint error body: $errorBody")
                                if (errorBody != null && errorBody.contains("error")) {
                                    try {
                                        val errorJson = org.json.JSONObject(errorBody)
                                        val errorMsg = errorJson.optString("message", errorJson.optString("error", ""))
                                        if (errorMsg.isNotEmpty()) {
                                            android.util.Log.d("RoadDetailsScreen", "Parsed error message: $errorMsg")
                                        }
                                    } catch (e: Exception) {
                                        // Not JSON, ignore
                                    }
                                }
                            } catch (e: Exception) {
                                android.util.Log.w("RoadDetailsScreen", "Could not read authenticated error body: ${e.message}")
                            }
                            
                            // If 404 (not found) or 403 (forbidden), try public endpoint
                            // 401 means auth issue, but we have token, so might be expired
                            if (lastErrorCode == 404 || lastErrorCode == 403) {
                                android.util.Log.d("RoadDetailsScreen", "Road not found in user's saved roads (code=$lastErrorCode), trying public endpoint")
                            } else if (lastErrorCode == 401) {
                                android.util.Log.w("RoadDetailsScreen", "Authentication failed (token may be expired), trying public endpoint")
                            } else if (lastErrorCode == 500) {
                                android.util.Log.e("RoadDetailsScreen", "Server error (500) from authenticated endpoint, will try public endpoint")
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("RoadDetailsScreen", "Exception with authenticated endpoint: ${e.message}", e)
                    }
                }
                
                // If not loaded yet, try public endpoint (for public roads or if auth failed)
                if (!loaded) {
                    try {
                        android.util.Log.d("RoadDetailsScreen", "Attempting public endpoint for roadId=$roadId")
                        val publicResponse = apiService.getPublicRoad(roadId)
                        android.util.Log.d("RoadDetailsScreen", "Public endpoint response: code=${publicResponse.code()}, isSuccessful=${publicResponse.isSuccessful}")
                        
                        if (publicResponse.isSuccessful && publicResponse.body() != null) {
                            road = publicResponse.body()
                            // Check if this is an error road (id = -1 indicates parsing error)
                            if (road?.id == -1L) {
                                android.util.Log.e("RoadDetailsScreen", "Received error road from public endpoint (likely truncated JSON)")
                                errorMessage = road?.description ?: "Failed to load road details due to a server error."
                                road = null
                            } else {
                                reviews = road?.reviews ?: emptyList()
                                comments = road?.comments ?: emptyList()
                                loaded = true
                                android.util.Log.d("RoadDetailsScreen", "Successfully loaded road from public endpoint: ${road?.road_name}")
                            }
                        } else {
                            val publicErrorCode = publicResponse.code()
                            android.util.Log.e("RoadDetailsScreen", "Public endpoint failed (code=$publicErrorCode, message=${publicResponse.message()})")
                            
                            // Use public error code if we don't have one from authenticated endpoint
                            if (lastErrorCode == null) {
                                lastErrorCode = publicErrorCode
                            }
                            
                            // Try to get error message from response
                            try {
                                val errorBody = publicResponse.errorBody()?.string()
                                android.util.Log.e("RoadDetailsScreen", "Public endpoint error body: $errorBody")
                                // Try to parse error message from response
                                if (errorBody != null && errorBody.contains("error")) {
                                    try {
                                        val errorJson = org.json.JSONObject(errorBody)
                                        val errorMsg = errorJson.optString("message", errorJson.optString("error", ""))
                                        if (errorMsg.isNotEmpty()) {
                                            android.util.Log.e("RoadDetailsScreen", "Parsed error message: $errorMsg")
                                        }
                                    } catch (e: Exception) {
                                        android.util.Log.w("RoadDetailsScreen", "Could not parse error JSON: ${e.message}")
                                    }
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("RoadDetailsScreen", "Could not read public error body: ${e.message}", e)
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("RoadDetailsScreen", "Exception with public endpoint: ${e.message}", e)
                        if (lastErrorCode == null) {
                            // Network error or other exception
                            android.util.Log.e("RoadDetailsScreen", "Network or other error: ${e.message}", e)
                        }
                    }
                }
                
                if (!loaded) {
                    errorMessage = if (token == null) {
                        "Please log in to view road details"
                    } else {
                        when (lastErrorCode) {
                            401 -> "Authentication failed. Please log in again."
                            403 -> "You don't have permission to view this road."
                            404 -> "Road not found. It may have been deleted or is private."
                            else -> "Failed to load road details. The road may be private or not found."
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("RoadDetailsScreen", "Error loading road: ${e.message}", e)
                errorMessage = "Error: ${e.message ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Road Details") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // Share button
                    road?.let { currentRoad ->
                        IconButton(
                            onClick = {
                                coroutineScope.launch {
                                    val shareText = buildString {
                                        append("Check out this road: ${currentRoad.road_name}\n")
                                        append("${currentRoad.start_location} → ${currentRoad.end_location}")
                                        currentRoad.distance?.let { distance ->
                                            append("\nDistance: ${com.scenicroutes.app.utils.DistanceFormatter.formatDistance(distance, "metric")}")
                                        }
                                        currentRoad.rating?.let { rating ->
                                            append("\nRating: ${String.format("%.1f", rating)} ⭐")
                                        }
                                    }
                                    val sendIntent = android.content.Intent().apply {
                                        action = android.content.Intent.ACTION_SEND
                                        putExtra(android.content.Intent.EXTRA_TEXT, shareText)
                                        putExtra(android.content.Intent.EXTRA_SUBJECT, "Road: ${currentRoad.road_name}")
                                        type = "text/plain"
                                    }
                                    val shareIntent = android.content.Intent.createChooser(sendIntent, "Share Road")
                                    try {
                                        context.startActivity(shareIntent)
                                    } catch (e: Exception) {
                                        android.util.Log.e("RoadDetailsScreen", "Error sharing road: ${e.message}", e)
                                        android.widget.Toast.makeText(
                                            context,
                                            "Failed to share road",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                }
                            },
                            modifier = Modifier.testTag("road_details_share_button"),
                        ) {
                            Icon(Icons.Default.Share, contentDescription = "Share")
                        }
                    }
                },
            )
        },
        bottomBar = {
            // Action buttons at bottom
            road?.let { currentRoad ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shadowElevation = 8.dp,
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            // View on Map button
                            OutlinedButton(
                                onClick = {
                                    android.util.Log.d("RoadDetailsScreen", "View on Map clicked for road ${currentRoad.id}")
                                    navController.navigate("map?roadId=${currentRoad.id}") {
                                        launchSingleTop = true
                                    }
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("road_details_view_on_map_button"),
                            ) {
                                Icon(Icons.Default.Map, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("View on Map")
                            }
                            // Start Navigation button (turn-by-turn)
                            Button(
                                onClick = {
                                    android.util.Log.d("RoadDetailsScreen", "Start Navigation clicked for road ${currentRoad.id}")
                                    if (currentRoad.geometry != null && currentRoad.geometry.isNotEmpty()) {
                                        // Try to get current location to determine optimal start point
                                        val currentLocation = try {
                                            fun hasLocationPermission(): Boolean {
                                                return androidx.core.content.ContextCompat.checkSelfPermission(
                                                    context,
                                                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                                                ) == android.content.pm.PackageManager.PERMISSION_GRANTED ||
                                                    androidx.core.content.ContextCompat.checkSelfPermission(
                                                        context,
                                                        android.Manifest.permission.ACCESS_COARSE_LOCATION,
                                                    ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                                            }
                                            
                                            if (hasLocationPermission()) {
                                                val locationManager = context.getSystemService(android.content.Context.LOCATION_SERVICE) as android.location.LocationManager
                                                val lastKnownLocation = locationManager.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                                                    ?: locationManager.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                                                lastKnownLocation?.let { Pair(it.latitude, it.longitude) }
                                            } else {
                                                null
                                            }
                                        } catch (e: Exception) {
                                            android.util.Log.w("RoadDetailsScreen", "Could not get current location: ${e.message}")
                                            null
                                        }
                                        
                                        val route = currentRoad.toRoute(currentLocation)
                                        if (route != null) {
                                            android.util.Log.d("RoadDetailsScreen", "Route converted: distance=${route.distance}m, geometry points=${route.geometry.size}")
                                            viewModel.setSelectedRoute(route)
                                            android.util.Log.d("RoadDetailsScreen", "Route set in ViewModel, selectedRoute is now: ${viewModel.selectedRoute.value != null}")
                                            // Small delay to ensure route state propagates
                                            coroutineScope.launch {
                                                kotlinx.coroutines.delay(300)
                                                android.util.Log.d("RoadDetailsScreen", "Navigating to NavigationScreen...")
                                                try {
                                                    navController.navigate("navigation") {
                                                        launchSingleTop = true
                                                    }
                                                    android.util.Log.d("RoadDetailsScreen", "Navigation command sent successfully")
                                                } catch (e: Exception) {
                                                    android.util.Log.e("RoadDetailsScreen", "Error navigating to NavigationScreen: ${e.message}", e)
                                                    android.widget.Toast.makeText(
                                                        context,
                                                        "Failed to start navigation: ${e.message}",
                                                        android.widget.Toast.LENGTH_SHORT,
                                                    ).show()
                                                }
                                            }
                                        } else {
                                            android.util.Log.w("RoadDetailsScreen", "Failed to convert road to route")
                                            android.widget.Toast.makeText(
                                                context,
                                                "Road has no route data for navigation",
                                                android.widget.Toast.LENGTH_SHORT,
                                            ).show()
                                        }
                                    } else {
                                        android.util.Log.w("RoadDetailsScreen", "Road has no geometry")
                                        android.widget.Toast.makeText(
                                            context,
                                            "Road has no geometry data",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("road_details_navigate_button"),
                            ) {
                                Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Start Navigation")
                            }
                        }
                    }
                }
            }
        },
    ) { padding ->
        when {
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            errorMessage != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        Icons.Default.Error,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.error,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = errorMessage ?: "Unknown error",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            road != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    // Road Name and Route
                    Column {
                        Text(
                            text = road!!.road_name,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${road!!.start_location} → ${road!!.end_location}",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    Divider()
                    
                    // Creator/User Information
                    road!!.user?.let { creator ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    // Navigate to creator's profile
                                    android.util.Log.d("RoadDetailsScreen", "Navigating to creator profile: userId=${road!!.user_id}")
                                    navController.navigate("user_profile/${road!!.user_id}") {
                                        launchSingleTop = true
                                    }
                                },
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                            ),
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                // Profile Picture
                                if (creator.profile_picture != null) {
                                    AsyncImage(
                                        model = creator.profile_picture,
                                        contentDescription = null,
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape),
                                        contentScale = ContentScale.Crop,
                                    )
                                } else {
                                    Surface(
                                        modifier = Modifier.size(40.dp),
                                        shape = CircleShape,
                                        color = MaterialTheme.colorScheme.primaryContainer,
                                    ) {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Text(
                                                text = creator.name.firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                            )
                                        }
                                    }
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Created by",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        text = creator.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                                // Arrow indicator to show it's clickable
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = "View profile",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        }
                    }
                    
                    // Road Description
                    road!!.description?.takeIf { it.isNotBlank() }?.let { description ->
                        Text(
                            text = description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    // Road Info Cards
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        road!!.distance?.let {
                            InfoCard(
                                icon = Icons.Default.Straighten,
                                label = "Distance",
                                value = com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(it),
                                modifier = Modifier.weight(1f),
                            )
                        }
                        road!!.duration?.let {
                            InfoCard(
                                icon = Icons.Default.AccessTime,
                                label = "Duration",
                                value = "${it / 60} min",
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }

                    // Rating
                    if (road!!.review_count > 0 || road!!.rating != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Text(
                                text = if (road!!.rating != null) {
                                    String.format("%.1f", road!!.rating)
                                } else {
                                    "0.0"
                                },
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            if (road!!.review_count > 0) {
                                Text(
                                    text = "(${road!!.review_count} ${if (road!!.review_count == 1) "review" else "reviews"})",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            } else if (reviews.isNotEmpty()) {
                                Text(
                                    text = "(${reviews.size} ${if (reviews.size == 1) "review" else "reviews"})",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }

                    // Tags
                    road!!.tags?.takeIf { it.isNotEmpty() }?.let { tags ->
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = "Tags",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                tags.forEach { tag ->
                                    AssistChip(
                                        onClick = { },
                                        label = { Text(tag.name) },
                                    )
                                }
                            }
                        }
                    }

                    // Auth and user state for edit/upload permissions and review editing
                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                    var currentUserId by remember { mutableStateOf<Long?>(null) }
                    LaunchedEffect(Unit) {
                        currentUserId = tokenManager.userId.first()
                    }

                    // Photos
                    var photos by remember { mutableStateOf(road!!.photos ?: emptyList()) }
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Photos (${photos.size})",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.SemiBold,
                            )
                            // Upload button - only show if user owns the road
                            if (currentUserId == road!!.user_id) {
                                TextButton(onClick = { showPhotoUpload = true }) {
                                    Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Upload")
                                }
                            }
                        }

                        if (photos.isNotEmpty()) {
                            // Photo grid
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                itemsIndexed(photos) { index, photo ->
                                    Card(
                                        modifier = Modifier.size(120.dp),
                                        shape = RoundedCornerShape(12.dp),
                                    ) {
                                        coil.compose.AsyncImage(
                                            model = photo.url,
                                            contentDescription = "Photo ${index + 1}",
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop,
                                        )
                                    }
                                }
                            }
                        } else {
                            Text(
                                text = "No photos yet",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    // Photo Upload Dialog
                    if (showPhotoUpload) {
                        PhotoUploadDialog(
                            roadId = road!!.id,
                            onDismiss = { showPhotoUpload = false },
                            onUploadSuccess = { uploadedPhoto ->
                                photos = photos + uploadedPhoto
                                showPhotoUpload = false
                            },
                        )
                    }

                    Divider()

                    // Tabs for Reviews, Comments, Statistics
                    TabRow(selectedTabIndex = selectedTab) {
                        Tab(
                            selected = selectedTab == 0,
                            onClick = { selectedTab = 0 },
                            text = { Text("Reviews (${reviews.size})") },
                        )
                        Tab(
                            selected = selectedTab == 1,
                            onClick = { selectedTab = 1 },
                            text = { Text("Comments (${comments.size})") },
                        )
                        Tab(
                            selected = selectedTab == 2,
                            onClick = { selectedTab = 2 },
                            text = { Text("Statistics") },
                        )
                    }

                    // Tab content
                    when (selectedTab) {
                        0 -> com.scenicroutes.app.ui.screens.map.ReviewsTab(
                            reviews = reviews,
                            currentUserId = currentUserId,
                            navController = navController,
                            onAddReview = { rating, comment ->
                                coroutineScope.launch {
                                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                    val token = tokenManager.token.first()
                                    if (token != null) {
                                        try {
                                            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                            val response = apiService.addReview(
                                                "Bearer $token",
                                                roadId,
                                                com.scenicroutes.app.data.api.ReviewRequest(rating, comment),
                                            )
                                            if (response.isSuccessful) {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Review added successfully",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                                
                                                // Reload road details - try both endpoints
                                                var reloaded = false
                                                val savedResponse = apiService.getSavedRoad("Bearer $token", roadId)
                                                if (savedResponse.isSuccessful && savedResponse.body() != null) {
                                                    road = savedResponse.body()
                                                    reviews = road?.reviews ?: emptyList()
                                                    comments = road?.comments ?: emptyList()
                                                    reloaded = true
                                                } else {
                                                    // Try public endpoint
                                                    val publicResponse = apiService.getPublicRoad(roadId)
                                                    if (publicResponse.isSuccessful && publicResponse.body() != null) {
                                                        road = publicResponse.body()
                                                        reviews = road?.reviews ?: emptyList()
                                                        comments = road?.comments ?: emptyList()
                                                        reloaded = true
                                                    }
                                                }
                                                
                                                if (!reloaded) {
                                                    android.util.Log.w("RoadDetailsScreen", "Failed to reload road after adding review")
                                                }
                                            } else {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Failed to add review: ${response.message()}",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                            }
                                        } catch (e: Exception) {
                                            android.util.Log.e("RoadDetailsScreen", "Error adding review: ${e.message}", e)
                                            android.widget.Toast.makeText(
                                                context,
                                                "Error: ${e.message}",
                                                android.widget.Toast.LENGTH_SHORT,
                                            ).show()
                                        }
                                    } else {
                                        android.widget.Toast.makeText(
                                            context,
                                            "Please log in to add reviews",
                                            android.widget.Toast.LENGTH_LONG,
                                        ).show()
                                    }
                                }
                            },
                        )
                        1 -> com.scenicroutes.app.ui.screens.map.CommentsTab(
                            comments = comments,
                            navController = navController,
                            onAddComment = { commentText ->
                                coroutineScope.launch {
                                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                    val token = tokenManager.token.first()
                                    if (token != null) {
                                        try {
                                            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                            val response = apiService.addComment(
                                                "Bearer $token",
                                                roadId,
                                                com.scenicroutes.app.data.api.CommentRequest(commentText),
                                            )
                                            if (response.isSuccessful) {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Comment added successfully",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                                
                                                // Reload road details - try both endpoints
                                                var reloaded = false
                                                val savedResponse = apiService.getSavedRoad("Bearer $token", roadId)
                                                if (savedResponse.isSuccessful && savedResponse.body() != null) {
                                                    road = savedResponse.body()
                                                    reviews = road?.reviews ?: emptyList()
                                                    comments = road?.comments ?: emptyList()
                                                    reloaded = true
                                                } else {
                                                    // Try public endpoint
                                                    val publicResponse = apiService.getPublicRoad(roadId)
                                                    if (publicResponse.isSuccessful && publicResponse.body() != null) {
                                                        road = publicResponse.body()
                                                        reviews = road?.reviews ?: emptyList()
                                                        comments = road?.comments ?: emptyList()
                                                        reloaded = true
                                                    }
                                                }
                                                
                                                if (!reloaded) {
                                                    android.util.Log.w("RoadDetailsScreen", "Failed to reload road after adding comment")
                                                }
                                            } else {
                                                android.widget.Toast.makeText(
                                                    context,
                                                    "Failed to add comment: ${response.message()}",
                                                    android.widget.Toast.LENGTH_SHORT,
                                                ).show()
                                            }
                                        } catch (e: Exception) {
                                            android.util.Log.e("RoadDetailsScreen", "Error adding comment: ${e.message}", e)
                                            android.widget.Toast.makeText(
                                                context,
                                                "Error: ${e.message}",
                                                android.widget.Toast.LENGTH_SHORT,
                                            ).show()
                                        }
                                    } else {
                                        android.widget.Toast.makeText(
                                            context,
                                            "Please log in to add comments",
                                            android.widget.Toast.LENGTH_LONG,
                                        ).show()
                                    }
                                }
                            },
                        )
                        2 -> com.scenicroutes.app.ui.screens.map.StatisticsTab(road = road!!)
                    }
                    
                    // Add bottom padding for bottom bar
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}

// Reuse tab components from RoadDetailsSheet - they're already defined there as public composables







