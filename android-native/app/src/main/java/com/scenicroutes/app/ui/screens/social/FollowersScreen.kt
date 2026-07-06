package com.scenicroutes.app.ui.screens.social

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
fun FollowersScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var followersUsers by remember { mutableStateOf<List<User>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    fun loadFollowers() {
        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
            val token = tokenManager.token.first()
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.getFollowers("Bearer $token")
                    if (response.isSuccessful) {
                        val data = response.body()
                        if (data != null) {
                            followersUsers = data.data
                            errorMessage = null
                        } else {
                            errorMessage = "No data received"
                        }
                    } else {
                        errorMessage = when (response.code()) {
                            401 -> "Please log in to view followers"
                            else -> "Failed to load followers (${response.code()})"
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("FollowersScreen", "Error loading followers: ${e.message}", e)
                    errorMessage = "Error: ${e.message ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            } else {
                errorMessage = "Please log in to view followers"
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadFollowers()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Followers") },
                navigationIcon = {
                    IconButton(onClick = { 
                        // Navigate back to explore with social tab selected
                        navController.navigate("explore?tab=social") {
                            popUpTo("explore") { inclusive = false }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }) {
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
        } else if (errorMessage != null) {
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
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { loadFollowers() }) {
                    Text("Retry")
                }
            }
        } else if (followersUsers.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    Icons.Default.People,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "No followers yet",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Share your roads and collections to get followers",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(followersUsers) { user ->
                    FollowerCard(
                        user = user,
                        onUserClick = {
                            navController.navigate("user_profile/${user.id}")
                        },
                        onFollowBack = {
                            coroutineScope.launch {
                                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                val token = tokenManager.token.first()
                                if (token != null) {
                                    try {
                                        val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                        val response = apiService.followUser("Bearer $token", user.id)
                                        if (response.isSuccessful) {
                                            // Reload followers list
                                            loadFollowers()
                                        } else {
                                            android.util.Log.e("FollowersScreen", "Failed to follow: ${response.code()}")
                                        }
                                    } catch (e: Exception) {
                                        android.util.Log.e("FollowersScreen", "Error following: ${e.message}", e)
                                    }
                                }
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
fun FollowerCard(
    user: User,
    onUserClick: () -> Unit,
    onFollowBack: () -> Unit,
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

            // Follow Back Button
            Button(
                onClick = onFollowBack,
            ) {
                Text("Follow Back")
            }
        }
    }
}












