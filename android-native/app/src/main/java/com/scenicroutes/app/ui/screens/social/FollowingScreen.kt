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
fun FollowingScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var followingUsers by remember { mutableStateOf<List<User>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    fun loadFollowing() {
        coroutineScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            isLoading = true
            errorMessage = null
            val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
            val token = tokenManager.token.first()
            android.util.Log.d("FollowingScreen", "Loading following list, hasToken=${token != null}")
            if (token != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.getFollowing("Bearer $token")
                    android.util.Log.d("FollowingScreen", "Following response: code=${response.code()}, isSuccessful=${response.isSuccessful}")
                    if (response.isSuccessful) {
                        val data = response.body()
                        android.util.Log.d("FollowingScreen", "Response body: $data")
                        if (data != null) {
                            // Backend returns paginated response with "data" field containing the user list
                            followingUsers = data.data
                            android.util.Log.d("FollowingScreen", "Loaded ${data.data.size} users successfully")
                            errorMessage = null
                        } else {
                            android.util.Log.w("FollowingScreen", "Response body is null")
                            errorMessage = "No data received"
                        }
                    } else {
                        val errorBody = response.errorBody()?.string()
                        android.util.Log.e("FollowingScreen", "API Error: ${response.code()} - $errorBody")
                        errorMessage = when (response.code()) {
                            401 -> "Please log in to view following"
                            else -> "Failed to load following (${response.code()})"
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("FollowingScreen", "Error loading following: ${e.message}", e)
                    errorMessage = "Error: ${e.message ?: "Unknown error"}"
                } finally {
                    isLoading = false
                }
            } else {
                android.util.Log.w("FollowingScreen", "No token available")
                errorMessage = "Please log in to view following"
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadFollowing()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Following") },
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
                Button(onClick = { loadFollowing() }) {
                    Text("Retry")
                }
            }
        } else if (followingUsers.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    Icons.Default.PersonAdd,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "You're not following anyone yet",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Start following users to see their roads and collections in your feed",
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
                items(followingUsers) { user ->
                    UserCard(
                        user = user,
                        onUserClick = {
                            navController.navigate("user_profile/${user.id}")
                        },
                        onUnfollow = {
                            coroutineScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                val token = tokenManager.token.first()
                                if (token != null) {
                                    try {
                                        val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                        val response = apiService.unfollowUser("Bearer $token", user.id)
                                        if (response.isSuccessful) {
                                            // Reload following list
                                            loadFollowing()
                                        } else {
                                            android.util.Log.e("FollowingScreen", "Failed to unfollow: ${response.code()}")
                                        }
                                    } catch (e: Exception) {
                                        android.util.Log.e("FollowingScreen", "Error unfollowing: ${e.message}", e)
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
fun UserCard(
    user: User,
    onUserClick: () -> Unit,
    onUnfollow: () -> Unit,
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

            // Unfollow Button
            OutlinedButton(
                onClick = onUnfollow,
            ) {
                Text("Unfollow")
            }
        }
    }
}












