package com.scenicroutes.app.ui.screens.social

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.model.User
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserProfileScreen(
    userId: Long,
    navController: NavController,
    onNavigateBack: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var user by remember { mutableStateOf<User?>(null) }
    var userRoads by remember { mutableStateOf<List<SavedRoad>>(emptyList()) }
    var userCollections by remember { mutableStateOf<List<Collection>>(emptyList()) }
    var isFollowing by remember { mutableStateOf(false) }
    var followersCount by remember { mutableStateOf(0) }
    var followingCount by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) }
    var isFollowingUser by remember { mutableStateOf(false) }
    var userStats by remember { mutableStateOf<Map<String, Any>?>(null) }

    LaunchedEffect(userId) {
        if (userId <= 0) {
            android.util.Log.e("UserProfile", "Invalid userId: $userId")
            isLoading = false
            return@LaunchedEffect
        }
        
        isLoading = true
        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
        val token = tokenManager.token.first()
        val currentUserId = tokenManager.userId.first()

        try {
            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService

            // Get user (public endpoint - works without auth)
            val userResponse = apiService.getPublicUser(userId)
            if (userResponse.isSuccessful && userResponse.body() != null) {
                user = userResponse.body()!!
                android.util.Log.d("UserProfile", "Loaded user: ${user?.name}")
            } else {
                val errorBody = userResponse.errorBody()?.string()
                android.util.Log.e("UserProfile", "Failed to load user: ${userResponse.code()} - ${userResponse.message()}")
                
                // Check if response is HTML (redirected to login page)
                if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                    android.util.Log.e("UserProfile", "API returned HTML instead of JSON - endpoint may require authentication or be incorrect")
                    android.util.Log.e("UserProfile", "Response URL was: ${userResponse.raw().request.url}")
                    // The API endpoint might be wrong - check if we need /api/ prefix
                } else {
                    android.util.Log.e("UserProfile", "Error body: ${errorBody?.take(500)}") // Log first 500 chars
                }
            }

            // Get follow status (requires auth)
            if (token != null && userId != currentUserId) {
                try {
                    val followStatusResponse = apiService.getFollowStatus("Bearer $token", userId)
                    if (followStatusResponse.isSuccessful && followStatusResponse.body() != null) {
                        val status = followStatusResponse.body()!!
                        isFollowing = status["following"] as? Boolean ?: false
                        followersCount = (status["followers_count"] as? Number)?.toInt() ?: 0
                        followingCount = (status["following_count"] as? Number)?.toInt() ?: 0
                    }
                } catch (e: Exception) {
                    android.util.Log.e("UserProfile", "Error loading follow status: ${e.message}", e)
                }
            }

            // Get user statistics (requires auth)
            if (token != null) {
                try {
                    val statsResponse = apiService.getUserStats(token, userId)
                    if (statsResponse.isSuccessful && statsResponse.body() != null) {
                        userStats = statsResponse.body()!!
                        android.util.Log.d("UserProfile", "Loaded user stats: $userStats")
                    } else {
                        val errorBody = statsResponse.errorBody()?.string()
                        android.util.Log.w("UserProfile", "Stats API returned error: ${statsResponse.code()} - $errorBody")
                    }
                } catch (e: Exception) {
                    android.util.Log.e("UserProfile", "Error loading stats: ${e.message}", e)
                }
            }

            // Get user roads and collections (public endpoints)
            try {
                val roadsResponse = apiService.getPublicUserRoads(userId)
                if (roadsResponse.isSuccessful && roadsResponse.body() != null) {
                    userRoads = roadsResponse.body()!!
                    android.util.Log.d("UserProfile", "Loaded ${userRoads.size} roads for user $userId")
                } else {
                    val errorBody = roadsResponse.errorBody()?.string()
                    android.util.Log.e("UserProfile", "Failed to load roads: ${roadsResponse.code()} - ${roadsResponse.message()} - $errorBody")
                }
            } catch (e: Exception) {
                android.util.Log.e("UserProfile", "Error loading roads: ${e.message}", e)
            }

            try {
                val collectionsResponse = apiService.getPublicUserCollections(userId)
                if (collectionsResponse.isSuccessful && collectionsResponse.body() != null) {
                    userCollections = collectionsResponse.body()!!
                    android.util.Log.d("UserProfile", "Loaded ${userCollections.size} collections for user $userId")
                } else {
                    val errorBody = collectionsResponse.errorBody()?.string()
                    android.util.Log.e("UserProfile", "Failed to load collections: ${collectionsResponse.code()} - ${collectionsResponse.message()} - $errorBody")
                }
            } catch (e: Exception) {
                android.util.Log.e("UserProfile", "Error loading collections: ${e.message}", e)
            }
        } catch (e: Exception) {
            android.util.Log.e("UserProfile", "Error loading profile: ${e.message}", e)
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(user?.name ?: "User Profile") },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            android.util.Log.d("UserProfileScreen", "Back button clicked, navigating back")
                            onNavigateBack()
                        }
                    ) {
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
        } else if (user == null) {
            // Error state - user not found or failed to load
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Icon(
                        Icons.Default.Error,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.error,
                    )
                    Text(
                        text = "Failed to load user profile",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.error,
                    )
                    Text(
                        text = "User ID: $userId",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(onClick = onNavigateBack) {
                        Text("Go Back")
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                // Profile Header
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                    shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // Profile picture
                        Surface(
                            modifier = Modifier.size(100.dp),
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary,
                        ) {
                            user?.profile_picture?.let { pictureUrl ->
                                AsyncImage(
                                    model = pictureUrl,
                                    contentDescription = null,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            } ?: run {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(48.dp))
                                }
                            }
                        }

                        Text(
                            text = user!!.name,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                        )

                        // Follow button
                        val coroutineScope = rememberCoroutineScope()
                        var currentUserIdState by remember { mutableStateOf<Long?>(null) }
                        LaunchedEffect(Unit) {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                            currentUserIdState = tokenManager.userId.first()
                        }
                        if (userId != currentUserIdState) {
                            Button(
                                onClick = {
                                    coroutineScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                                        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                        val token = tokenManager.token.first()
                                        if (token != null) {
                                            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                            try {
                                                android.util.Log.d("UserProfile", "Follow button clicked. Current state: isFollowing=$isFollowing, userId=$userId")
                                                if (isFollowing) {
                                                    android.util.Log.d("UserProfile", "Attempting to unfollow user $userId")
                                                    val response = apiService.unfollowUser("Bearer $token", userId)
                                                    android.util.Log.d("UserProfile", "Unfollow response: code=${response.code()}, isSuccessful=${response.isSuccessful}")
                                                    if (response.isSuccessful) {
                                                        android.util.Log.d("UserProfile", "Unfollow successful, refreshing follow status")
                                                        // Refresh follow status to get accurate counts
                                                        val followStatusResponse = apiService.getFollowStatus("Bearer $token", userId)
                                                        if (followStatusResponse.isSuccessful && followStatusResponse.body() != null) {
                                                            val status = followStatusResponse.body()!!
                                                            isFollowing = status["following"] as? Boolean ?: false
                                                            followersCount = (status["followers_count"] as? Number)?.toInt() ?: 0
                                                            followingCount = (status["following_count"] as? Number)?.toInt() ?: 0
                                                            android.util.Log.d("UserProfile", "Updated state: isFollowing=$isFollowing, followers=$followersCount, following=$followingCount")
                                                        }
                                                    } else {
                                                        val errorBody = response.errorBody()?.string()
                                                        android.util.Log.e("UserProfile", "Unfollow failed: ${response.code()} - $errorBody")
                                                        // Check if it's a 422 error (already not following)
                                                        if (response.code() == 422) {
                                                            android.util.Log.d("UserProfile", "422 error, refreshing status anyway")
                                                            // Refresh status anyway
                                                            val followStatusResponse = apiService.getFollowStatus("Bearer $token", userId)
                                                            if (followStatusResponse.isSuccessful && followStatusResponse.body() != null) {
                                                                val status = followStatusResponse.body()!!
                                                                isFollowing = status["following"] as? Boolean ?: false
                                                                followersCount = (status["followers_count"] as? Number)?.toInt() ?: 0
                                                                followingCount = (status["following_count"] as? Number)?.toInt() ?: 0
                                                                android.util.Log.d("UserProfile", "Updated state after 422: isFollowing=$isFollowing")
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    android.util.Log.d("UserProfile", "Attempting to follow user $userId")
                                                    val response = apiService.followUser("Bearer $token", userId)
                                                    android.util.Log.d("UserProfile", "Follow response: code=${response.code()}, isSuccessful=${response.isSuccessful}")
                                                    if (response.isSuccessful) {
                                                        android.util.Log.d("UserProfile", "Follow successful, refreshing follow status")
                                                        // Refresh follow status to get accurate counts
                                                        val followStatusResponse = apiService.getFollowStatus("Bearer $token", userId)
                                                        if (followStatusResponse.isSuccessful && followStatusResponse.body() != null) {
                                                            val status = followStatusResponse.body()!!
                                                            isFollowing = status["following"] as? Boolean ?: true
                                                            followersCount = (status["followers_count"] as? Number)?.toInt() ?: 0
                                                            followingCount = (status["following_count"] as? Number)?.toInt() ?: 0
                                                            android.util.Log.d("UserProfile", "Updated state: isFollowing=$isFollowing, followers=$followersCount, following=$followingCount")
                                                        }
                                                    } else {
                                                        val errorBody = response.errorBody()?.string()
                                                        android.util.Log.e("UserProfile", "Follow failed: ${response.code()} - $errorBody")
                                                        // Check if it's a 422 error (already following)
                                                        if (response.code() == 422) {
                                                            android.util.Log.d("UserProfile", "422 error, refreshing status anyway")
                                                            // Refresh status anyway
                                                            val followStatusResponse = apiService.getFollowStatus("Bearer $token", userId)
                                                            if (followStatusResponse.isSuccessful && followStatusResponse.body() != null) {
                                                                val status = followStatusResponse.body()!!
                                                                isFollowing = status["following"] as? Boolean ?: true
                                                                followersCount = (status["followers_count"] as? Number)?.toInt() ?: 0
                                                                followingCount = (status["following_count"] as? Number)?.toInt() ?: 0
                                                                android.util.Log.d("UserProfile", "Updated state after 422: isFollowing=$isFollowing")
                                                            }
                                                        }
                                                    }
                                                }
                                            } catch (e: Exception) {
                                                android.util.Log.e("UserProfile", "Error in follow/unfollow: ${e.message}", e)
                                            }
                                        }
                                    }
                                },
                            ) {
                                Text(if (isFollowing) "Unfollow" else "Follow")
                            }
                        }

                        // Stats
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                ),
                                modifier = Modifier.weight(1f),
                            ) {
                                Column(
                                    modifier = Modifier.padding(8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    // Prefer public road stats, then total, then loaded roads
                                    val roadCount = try {
                                        (userStats?.get("total_public_roads") as? Number)?.toInt()
                                            ?: (userStats?.get("total_roads") as? Number)?.toInt()
                                            ?: userRoads.size
                                    } catch (e: Exception) {
                                        android.util.Log.e("UserProfile", "Error calculating road count: ${e.message}", e)
                                        userRoads.size
                                    }
                                    Text(
                                        text = "$roadCount",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        "Roads",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                ),
                                modifier = Modifier.weight(1f),
                            ) {
                                Column(
                                    modifier = Modifier.padding(8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text(
                                        text = "${userCollections.size}",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        "Collections",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                ),
                                modifier = Modifier.weight(1f),
                            ) {
                                Column(
                                    modifier = Modifier.padding(8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text(
                                        text = "$followersCount",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        "Followers",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                ),
                                modifier = Modifier.weight(1f),
                            ) {
                                Column(
                                    modifier = Modifier.padding(8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Text(
                                        text = "$followingCount",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        "Following",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                    )
                                }
                            }
                        }

                        // User Statistics Card
                        userStats?.let { stats ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 12.dp, start = 8.dp, end = 8.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                ),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text(
                                        text = "Activity Statistics",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceEvenly,
                                    ) {
                                        // Use total_public_roads for user profiles (not total_roads)
                                        stats["total_public_roads"]?.let {
                                            Column(
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                modifier = Modifier.weight(1f),
                                            ) {
                                                Text(
                                                    text = "$it",
                                                    style = MaterialTheme.typography.titleLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.primary,
                                                )
                                                Text(
                                                    "Public Roads",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                        stats["total_reviews"]?.let {
                                            Column(
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                modifier = Modifier.weight(1f),
                                            ) {
                                                Text(
                                                    text = "$it",
                                                    style = MaterialTheme.typography.titleLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.secondary,
                                                )
                                                Text(
                                                    "Reviews",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                        stats["total_distance_km"]?.let {
                                            Column(
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                modifier = Modifier.weight(1f),
                                            ) {
                                                Text(
                                                    text = "${String.format("%.1f", (it as? Number)?.toDouble() ?: 0.0)} km",
                                                    style = MaterialTheme.typography.titleLarge,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.tertiary,
                                                )
                                                Text(
                                                    "Distance",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Tabs
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = MaterialTheme.colorScheme.surface,
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Route, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Roads (${if (userRoads.isNotEmpty()) userRoads.size else userStats?.get("total_public_roads") as? Number ?: userStats?.get("total_roads") as? Number ?: 0})"
                    )
                            }
                        },
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Folder, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Collections (${userCollections.size})")
                            }
                        },
                    )
                }

                // Content
                when (selectedTab) {
                    0 -> {
                        if (userRoads.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("No roads yet", style = MaterialTheme.typography.bodyMedium)
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                items(userRoads) { road ->
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { navController.navigate("road_details/${road.id}") },
                                        shape = RoundedCornerShape(16.dp),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp),
                                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Surface(
                                                modifier = Modifier.size(60.dp),
                                                shape = RoundedCornerShape(12.dp),
                                                color = MaterialTheme.colorScheme.primaryContainer,
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Icon(
                                                        Icons.Default.Route,
                                                        contentDescription = null,
                                                        modifier = Modifier.size(32.dp),
                                                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                                    )
                                                }
                                            }
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = road.road_name,
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                Text(
                                                    text = "${road.start_location} → ${road.end_location}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    modifier = Modifier.padding(top = 4.dp),
                                                )
                                                road.rating?.let {
                                                    Row(
                                                        modifier = Modifier.padding(top = 4.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                    ) {
                                                        Icon(
                                                            Icons.Default.Star,
                                                            contentDescription = null,
                                                            modifier = Modifier.size(14.dp),
                                                            tint = MaterialTheme.colorScheme.primary,
                                                        )
                                                        Spacer(modifier = Modifier.width(4.dp))
                                                        Text(
                                                            String.format("%.1f", it),
                                                            style = MaterialTheme.typography.bodySmall,
                                                        )
                                                    }
                                                }
                                            }
                                            Icon(
                                                Icons.Default.ChevronRight,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    1 -> {
                        if (userCollections.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("No collections yet", style = MaterialTheme.typography.bodyMedium)
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                items(userCollections) { collection ->
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                try {
                                                    collection.id?.let { collectionId ->
                                                        android.util.Log.d("UserProfile", "Navigating to collection: $collectionId")
                                                        navController.navigate("collection/$collectionId")
                                                    } ?: run {
                                                        android.util.Log.e("UserProfile", "Collection ID is null for collection: ${collection.name}")
                                                        android.widget.Toast.makeText(
                                                            context,
                                                            "Cannot open collection: invalid ID",
                                                            android.widget.Toast.LENGTH_SHORT
                                                        ).show()
                                                    }
                                                } catch (e: Exception) {
                                                    android.util.Log.e("UserProfile", "Error navigating to collection: ${e.message}", e)
                                                    android.widget.Toast.makeText(
                                                        context,
                                                        "Error opening collection: ${e.message}",
                                                        android.widget.Toast.LENGTH_SHORT
                                                    ).show()
                                                }
                                            },
                                        shape = RoundedCornerShape(16.dp),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(16.dp),
                                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Surface(
                                                modifier = Modifier.size(60.dp),
                                                shape = RoundedCornerShape(12.dp),
                                                color = MaterialTheme.colorScheme.secondaryContainer,
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Icon(
                                                        Icons.Default.Folder,
                                                        contentDescription = null,
                                                        modifier = Modifier.size(32.dp),
                                                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                                    )
                                                }
                                            }
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = collection.name,
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                                collection.description?.let {
                                                    Text(
                                                        text = it,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                        maxLines = 1,
                                                        modifier = Modifier.padding(top = 2.dp),
                                                    )
                                                }
                                                Row(
                                                    modifier = Modifier.padding(top = 4.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                ) {
                                                    Icon(
                                                        Icons.Default.Route,
                                                        contentDescription = null,
                                                        modifier = Modifier.size(14.dp),
                                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    )
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                Text(
                                                    "${collection.road_count ?: 0} roads",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                                }
                                            }
                                            Icon(
                                                Icons.Default.ChevronRight,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
