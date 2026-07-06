package com.scenicroutes.app.ui.screens.social

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.User
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserSearchScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    var searchQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<User>>(emptyList()) }
    var recommendations by remember { mutableStateOf<List<User>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var isLoadingRecommendations by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showRecommendations by remember { mutableStateOf(true) }
    
    fun loadRecommendations() {
        coroutineScope.launch {
            isLoadingRecommendations = true
            errorMessage = null
            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.getUserRecommendations("Bearer $token", limit = 10, type = "all")
                    if (response.isSuccessful) {
                        recommendations = response.body()?.users ?: emptyList()
                    }
                } catch (e: Exception) {
                    android.util.Log.e("UserSearchScreen", "Error loading recommendations: ${e.message}", e)
                } finally {
                    isLoadingRecommendations = false
                }
            } else {
                isLoadingRecommendations = false
            }
        }
    }
    
    fun searchUsers(query: String) {
        if (query.isBlank()) {
            searchResults = emptyList()
            showRecommendations = true
            return
        }
        
        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            showRecommendations = false
            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.searchUsers(
                        "Bearer $token",
                        query = query,
                        sortBy = "popular",
                        limit = 20,
                    )
                    if (response.isSuccessful) {
                        searchResults = response.body()?.users ?: emptyList()
                    } else {
                        errorMessage = "Failed to search users"
                        searchResults = emptyList()
                    }
                } catch (e: Exception) {
                    android.util.Log.e("UserSearchScreen", "Error searching users: ${e.message}", e)
                    errorMessage = "Error: ${e.message ?: "Unknown error"}"
                    searchResults = emptyList()
                } finally {
                    isLoading = false
                }
            } else {
                errorMessage = "Please log in to search users"
                isLoading = false
            }
        }
    }
    
    LaunchedEffect(Unit) {
        loadRecommendations()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Discover Users") },
                navigationIcon = {
                    IconButton(onClick = { 
                        // Navigate back to explore with social tab selected
                        navController.navigate("explore?tab=social") {
                            popUpTo("explore") { inclusive = false }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { 
                    searchQuery = it
                    searchUsers(it)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("Search by name, username...") },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = "Search")
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = {
                            searchQuery = ""
                            searchResults = emptyList()
                            showRecommendations = true
                        }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
            )
            
            // Content
            when {
                isLoading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
                errorMessage != null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f)
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
                showRecommendations && recommendations.isNotEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                    ) {
                        Text(
                            text = "People You May Know",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                        LazyColumn(
                            contentPadding = PaddingValues(
                                start = 16.dp,
                                end = 16.dp,
                                top = 8.dp,
                                bottom = 100.dp, // Extra padding to prevent cut-off
                            ),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(recommendations) { user ->
                                DiscoverUserCard(
                                    user = user,
                                    onUserClick = {
                                        navController.navigate("user_profile/${user.id}")
                                    },
                                    onFollow = {
                                        coroutineScope.launch {
                                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                            val token = tokenManager.token.first()
                                            if (token != null) {
                                                try {
                                                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                                    val isFollowing = user.is_following ?: false
                                                    val response = if (isFollowing) {
                                                        apiService.unfollowUser("Bearer $token", user.id)
                                                    } else {
                                                        apiService.followUser("Bearer $token", user.id)
                                                    }
                                                    if (response.isSuccessful) {
                                                        loadRecommendations() // Reload to update follow status
                                                    }
                                                } catch (e: Exception) {
                                                    android.util.Log.e("UserSearchScreen", "Error toggling follow: ${e.message}", e)
                                                }
                                            }
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
                searchResults.isNotEmpty() -> {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentPadding = PaddingValues(
                            start = 16.dp,
                            end = 16.dp,
                            top = 8.dp,
                            bottom = 100.dp, // Extra padding to prevent cut-off
                        ),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        item {
                            Text(
                                text = "Search Results",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(vertical = 8.dp),
                            )
                        }
                        items(searchResults) { user ->
                            DiscoverUserCard(
                                user = user,
                                onUserClick = {
                                    navController.navigate("user_profile/${user.id}")
                                },
                                onFollow = {
                                    coroutineScope.launch {
                                        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                        val token = tokenManager.token.first()
                                        if (token != null) {
                                            try {
                                                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                                val isFollowing = user.is_following ?: false
                                                val response = if (isFollowing) {
                                                    apiService.unfollowUser("Bearer $token", user.id)
                                                } else {
                                                    apiService.followUser("Bearer $token", user.id)
                                                }
                                                if (response.isSuccessful) {
                                                    searchUsers(searchQuery) // Reload to update follow status
                                                }
                                            } catch (e: Exception) {
                                                android.util.Log.e("UserSearchScreen", "Error toggling follow: ${e.message}", e)
                                            }
                                        }
                                    }
                                },
                            )
                        }
                    }
                }
                else -> {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = "No users found",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = "Try a different search term",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DiscoverUserCard(
    user: User,
    onUserClick: () -> Unit,
    onFollow: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onUserClick),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Profile Picture
            if (user.profile_picture != null) {
                AsyncImage(
                    model = user.profile_picture,
                    contentDescription = null,
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Surface(
                    modifier = Modifier.size(56.dp),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer,
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = user.name.firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }
            }
            
            // User Info
            Column(
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = user.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            
            // Follow Button
            OutlinedButton(
                onClick = onFollow,
            ) {
                val isFollowing = user.is_following ?: false
                if (isFollowing) {
                    Icon(Icons.Default.PersonRemove, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Unfollow")
                } else {
                    Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Follow")
                }
            }
        }
    }
}











