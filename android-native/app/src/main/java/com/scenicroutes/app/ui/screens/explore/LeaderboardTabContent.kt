package com.scenicroutes.app.ui.screens.explore

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.model.User
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class CountryRoadsData(
    val country: String,
    val roads: List<SavedRoad>,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardTabContent(
    navController: NavController,
    modifier: Modifier = Modifier,
) {
    var selectedCategory by rememberSaveable { mutableStateOf(0) } // 0: Roads, 1: Collections, 2: Users
    var selectedRoadFilter by rememberSaveable { mutableStateOf(0) } // 0: Top Rated, 1: Most Reviewed, 2: Most Popular, 3: By Country
    var selectedUserFilter by rememberSaveable { mutableStateOf("most_followed") } // "most_followed" or "most_active"
    val coroutineScope = rememberCoroutineScope()
    
    var roads by remember { mutableStateOf<List<SavedRoad>>(emptyList()) }
    var collections by remember { mutableStateOf<List<Collection>>(emptyList()) }
    var users by remember { mutableStateOf<List<User>>(emptyList()) }
    var roadsByCountry by remember { mutableStateOf<List<CountryRoadsData>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    val context = LocalContext.current
    
    val categories = listOf("Roads", "Collections", "Users")
    val roadFilters = listOf("Top Rated", "Most Reviewed", "Most Popular", "By Country")
    val userFilters = listOf("Most Followed", "Most Active")
    
    fun loadRoads(filter: Int, retryCount: Int = 0) {
        coroutineScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            isLoading = true
            errorMessage = null
            try {
                val apiService = NetworkModule.apiService
                val response = when (filter) {
                    0 -> apiService.getLeaderboardTopRatedRoads(limit = 50)
                    1 -> apiService.getLeaderboardMostReviewedRoads(limit = 50)
                    2 -> apiService.getLeaderboardMostPopularRoads(limit = 50)
                    3 -> {
                        // Popular Roads by Country returns list of {"country": "...", "roads": [...]}
                        val countryResponse = apiService.getLeaderboardPopularRoadsByCountry(limit = 50)
                        if (countryResponse.isSuccessful && countryResponse.body() != null) {
                            try {
                                val countryDataList = countryResponse.body()!!
                                // Response is a list: [{"country": "CountryName", "roads": [...]}, ...]
                                val countryList = mutableListOf<CountryRoadsData>()
                                countryDataList.forEach { item ->
                                    try {
                                        val country = item["country"] as? String
                                        val roadsList = try {
                                            (item["roads"] as? List<*>)?.filterIsInstance<SavedRoad>() ?: emptyList()
                                        } catch (e: Exception) {
                                            android.util.Log.e("LeaderboardTabContent", "Error parsing roads for country $country: ${e.message}", e)
                                            emptyList()
                                        }
                                        if (country != null && roadsList.isNotEmpty()) {
                                            countryList.add(CountryRoadsData(country, roadsList))
                                        }
                                    } catch (e: Exception) {
                                        android.util.Log.e("LeaderboardTabContent", "Error parsing country item: ${e.message}", e)
                                        // Continue with next item
                                    }
                                }
                                roadsByCountry = countryList
                                roads = emptyList() // Clear regular roads list
                            } catch (e: Exception) {
                                android.util.Log.e("LeaderboardTabContent", "Error parsing country data: ${e.message}", e)
                                // If parsing fails, treat as error response
                                throw e
                            }
                        }
                        countryResponse
                    }
                    else -> apiService.getLeaderboardTopRatedRoads(limit = 50) // Default
                }
                if (response.isSuccessful) {
                    if (filter != 3) {
                        val responseBody = response.body()
                        roads = if (responseBody is List<*>) {
                            responseBody.filterIsInstance<SavedRoad>()
                        } else {
                            emptyList()
                        }
                        roadsByCountry = emptyList()
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    android.util.Log.e("LeaderboardTabContent", "Roads API error: ${response.code()} - $errorBody")
                    if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                        errorMessage = "Authentication required or endpoint not available"
                    } else {
                        // Retry logic for transient errors
                        if (retryCount < 2 && (response.code() == 500 || response.code() == 502 || response.code() == 503)) {
                            android.util.Log.i("LeaderboardTabContent", "Retrying roads load (attempt ${retryCount + 1})")
                            kotlinx.coroutines.delay(1000L * (retryCount + 1))
                            loadRoads(filter, retryCount + 1)
                            return@launch
                        }
                        errorMessage = "Failed to load roads (${response.code()})"
                    }
                }
            } catch (e: com.google.gson.JsonSyntaxException) {
                android.util.Log.e("LeaderboardTabContent", "JSON parsing error loading roads: ${e.message}", e)
                // Retry logic for JSON parsing errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying roads load after JSON error (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadRoads(filter, retryCount + 1)
                    return@launch
                }
                val errorMsg = e.message ?: ""
                if (errorMsg.contains("End of input") || errorMsg.contains("Expected value")) {
                    errorMessage = "Error: Incomplete data received. Please try again."
                } else {
                    errorMessage = "Error: Invalid response format. Please try again."
                }
            } catch (e: java.io.EOFException) {
                android.util.Log.e("LeaderboardTabContent", "Unexpected end of JSON input: ${e.message}", e)
                // Retry logic for EOF errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying roads load after EOF error (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadRoads(filter, retryCount + 1)
                    return@launch
                }
                errorMessage = "Error: Incomplete data received. Please try again."
            } catch (e: java.net.SocketTimeoutException) {
                android.util.Log.e("LeaderboardTabContent", "Timeout loading roads: ${e.message}", e)
                // Retry logic for timeout errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying roads load after timeout (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadRoads(filter, retryCount + 1)
                    return@launch
                }
                errorMessage = "Request timed out. Please check your connection and try again."
            } catch (e: kotlinx.coroutines.CancellationException) {
                // Re-throw cancellation exceptions - they're expected when composable leaves composition
                throw e
            } catch (e: Exception) {
                android.util.Log.e("LeaderboardTabContent", "Error loading roads: ${e.message}", e)
                // Retry logic for other exceptions
                if (retryCount < 2 && e.message?.contains("timeout", ignoreCase = true) == true) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying roads load after exception (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadRoads(filter, retryCount + 1)
                    return@launch
                }
                errorMessage = "Error: ${e.message ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        }
    }
    
    fun loadCollections(retryCount: Int = 0) {
        coroutineScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            isLoading = true
            errorMessage = null
            try {
                val apiService = NetworkModule.apiService
                // Try featured collections endpoint
                var response = apiService.getLeaderboardFeaturedCollections(limit = 50)
                
                // If that fails, try top-rated collections as fallback
                if (!response.isSuccessful) {
                    android.util.Log.w("LeaderboardTabContent", "Featured collections failed, trying top-rated collections")
                    val fallbackResponse = apiService.getLeaderboardTopRatedCollections(limit = 50)
                    if (fallbackResponse.isSuccessful) {
                        response = fallbackResponse
                    }
                }
                
                if (response.isSuccessful) {
                    val body = response.body()
                    collections = body ?: emptyList()
                    errorMessage = null // Clear any previous errors
                } else {
                    val errorBody = response.errorBody()?.string()
                    android.util.Log.e("LeaderboardTabContent", "Collections API error: ${response.code()} - $errorBody")
                    if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                        errorMessage = "Authentication required or endpoint not available"
                    } else {
                        // Retry logic for transient errors
                        if (retryCount < 2 && (response.code() == 500 || response.code() == 502 || response.code() == 503)) {
                            android.util.Log.i("LeaderboardTabContent", "Retrying collections load (attempt ${retryCount + 1})")
                            kotlinx.coroutines.delay(1000L * (retryCount + 1)) // Exponential backoff
                            loadCollections(retryCount + 1)
                            return@launch
                        }
                        errorMessage = "Failed to load collections (${response.code()})"
                    }
                }
            } catch (e: com.google.gson.JsonSyntaxException) {
                android.util.Log.e("LeaderboardTabContent", "JSON parsing error loading collections: ${e.message}", e)
                // Retry logic for JSON parsing errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying collections load after JSON error (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadCollections(retryCount + 1)
                    return@launch
                }
                val errorMsg = e.message ?: ""
                if (errorMsg.contains("End of input") || errorMsg.contains("Expected value")) {
                    errorMessage = "Error: Incomplete data received. Please try again."
                } else {
                    errorMessage = "Error: Invalid response format. Please try again."
                }
            } catch (e: java.io.EOFException) {
                android.util.Log.e("LeaderboardTabContent", "Unexpected end of JSON input: ${e.message}", e)
                // Retry logic for EOF errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying collections load after EOF error (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadCollections(retryCount + 1)
                    return@launch
                }
                errorMessage = "Error: Incomplete data received. Please try again."
            } catch (e: java.net.SocketTimeoutException) {
                android.util.Log.e("LeaderboardTabContent", "Timeout loading collections: ${e.message}", e)
                // Retry logic for timeout errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying collections load after timeout (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadCollections(retryCount + 1)
                    return@launch
                }
                errorMessage = "Request timed out. Please check your connection and try again."
            } catch (e: kotlinx.coroutines.CancellationException) {
                // Re-throw cancellation exceptions - they're expected when composable leaves composition
                throw e
            } catch (e: Exception) {
                android.util.Log.e("LeaderboardTabContent", "Error loading collections: ${e.message}", e)
                // Retry logic for other exceptions
                if (retryCount < 2 && e.message?.contains("timeout", ignoreCase = true) == true) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying collections load after exception (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadCollections(retryCount + 1)
                    return@launch
                }
                errorMessage = "Error: ${e.message ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        }
    }
    
    fun loadUsers(filter: String = "most_followed", retryCount: Int = 0) {
        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val apiService = NetworkModule.apiService
                val response = when (filter) {
                    "most_active" -> apiService.getLeaderboardMostActiveUsers(limit = 50)
                    else -> apiService.getLeaderboardMostFollowedUsers(limit = 50)
                }
                if (response.isSuccessful) {
                    users = response.body() ?: emptyList()
                    errorMessage = null // Clear any previous errors
                } else {
                    val errorBody = response.errorBody()?.string()
                    android.util.Log.e("LeaderboardTabContent", "Users API error: ${response.code()} - $errorBody")
                    if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                        errorMessage = "Authentication required or endpoint not available"
                    } else {
                        // Retry logic for transient errors
                        if (retryCount < 2 && (response.code() == 500 || response.code() == 502 || response.code() == 503)) {
                            android.util.Log.i("LeaderboardTabContent", "Retrying users load (attempt ${retryCount + 1})")
                            kotlinx.coroutines.delay(1000L * (retryCount + 1))
                            loadUsers(filter, retryCount + 1)
                            return@launch
                        }
                        errorMessage = "Failed to load users (${response.code()})"
                    }
                }
            } catch (e: com.google.gson.JsonSyntaxException) {
                android.util.Log.e("LeaderboardTabContent", "JSON parsing error loading users: ${e.message}", e)
                // Retry logic for JSON parsing errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying users load after JSON error (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadUsers(filter, retryCount + 1)
                    return@launch
                }
                val errorMsg = e.message ?: ""
                if (errorMsg.contains("End of input") || errorMsg.contains("Expected value")) {
                    errorMessage = "Error: Incomplete data received. Please try again."
                } else {
                    errorMessage = "Error: Invalid response format. Please try again."
                }
            } catch (e: java.io.EOFException) {
                android.util.Log.e("LeaderboardTabContent", "Unexpected end of JSON input: ${e.message}", e)
                // Retry logic for EOF errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying users load after EOF error (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadUsers(filter, retryCount + 1)
                    return@launch
                }
                errorMessage = "Error: Incomplete data received. Please try again."
            } catch (e: java.net.SocketTimeoutException) {
                android.util.Log.e("LeaderboardTabContent", "Timeout loading users: ${e.message}", e)
                // Retry logic for timeout errors
                if (retryCount < 2) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying users load after timeout (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadUsers(filter, retryCount + 1)
                    return@launch
                }
                errorMessage = "Request timed out. Please check your connection and try again."
            } catch (e: kotlinx.coroutines.CancellationException) {
                // Re-throw cancellation exceptions - they're expected when composable leaves composition
                throw e
            } catch (e: Exception) {
                android.util.Log.e("LeaderboardTabContent", "Error loading users: ${e.message}", e)
                // Retry logic for other exceptions
                if (retryCount < 2 && e.message?.contains("timeout", ignoreCase = true) == true) {
                    android.util.Log.i("LeaderboardTabContent", "Retrying users load after exception (attempt ${retryCount + 1})")
                    kotlinx.coroutines.delay(1000L * (retryCount + 1))
                    loadUsers(filter, retryCount + 1)
                    return@launch
                }
                errorMessage = "Error: ${e.message ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        }
    }
    
    LaunchedEffect(selectedCategory) {
        when (selectedCategory) {
            0 -> loadRoads(selectedRoadFilter)
            1 -> loadCollections()
            2 -> loadUsers(selectedUserFilter)
        }
    }
    
    LaunchedEffect(selectedRoadFilter) {
        if (selectedCategory == 0) {
            loadRoads(selectedRoadFilter)
        }
    }
    
    LaunchedEffect(selectedUserFilter) {
        if (selectedCategory == 2) {
            loadUsers(selectedUserFilter)
        }
    }
    
    Column(
        modifier = modifier.fillMaxSize(),
    ) {
        // Category tabs (Roads, Collections, Users)
        ScrollableTabRow(
            selectedTabIndex = selectedCategory,
            edgePadding = 8.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            categories.forEachIndexed { index, title ->
                Tab(
                    selected = selectedCategory == index,
                    onClick = { selectedCategory = index },
                    modifier = Modifier.padding(horizontal = 8.dp),
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = 12.dp),
                    )
                }
            }
        }
        
        // Road filters (only shown when Roads is selected)
        if (selectedCategory == 0) {
            ScrollableTabRow(
                selectedTabIndex = selectedRoadFilter,
                edgePadding = 8.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                roadFilters.forEachIndexed { index, title ->
                    FilterChip(
                        selected = selectedRoadFilter == index,
                        onClick = { selectedRoadFilter = index },
                        label = { Text(title) },
                        modifier = Modifier.padding(horizontal = 4.dp),
                    )
                }
            }
        }
        
        // User filters (only shown when Users is selected)
        if (selectedCategory == 2) {
            ScrollableTabRow(
                selectedTabIndex = if (selectedUserFilter == "most_followed") 0 else 1,
                edgePadding = 8.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                userFilters.forEachIndexed { index, title ->
                    FilterChip(
                        selected = (selectedUserFilter == "most_followed" && index == 0) || 
                                  (selectedUserFilter == "most_active" && index == 1),
                        onClick = { 
                            selectedUserFilter = if (index == 0) "most_followed" else "most_active"
                        },
                        label = { Text(title) },
                        modifier = Modifier.padding(horizontal = 4.dp),
                    )
                }
            }
        }
        
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
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f)
                        .padding(16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Icon(
                            Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.error,
                        )
                        Text(
                            text = errorMessage ?: "Unknown error",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error,
                        )
                        Button(
                            onClick = {
                                when (selectedCategory) {
                                    0 -> loadRoads(selectedRoadFilter)
                                    1 -> loadCollections()
                                    2 -> loadUsers(selectedUserFilter)
                                }
                            },
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Retry")
                        }
                    }
                }
            }
            selectedCategory == 0 && selectedRoadFilter == 3 && roadsByCountry.isNotEmpty() -> {
                // Popular Roads by Country
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        top = 8.dp,
                        end = 16.dp,
                        bottom = 100.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    roadsByCountry.forEach { countryData ->
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            Icons.Default.Public,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                        )
                                        Text(
                                            text = countryData.country,
                                            style = MaterialTheme.typography.titleLarge,
                                            fontWeight = FontWeight.Bold,
                                        )
                                    }
                                    Divider()
                                    // Use Column instead of forEachIndexed for composable context
                                    Column(
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        countryData.roads.forEachIndexed { index, road ->
                                            LeaderboardRoadCard(
                                                rank = index + 1,
                                                road = road,
                                                onNavigate = {
                                                    android.util.Log.d("LeaderboardTabContent", "Navigate clicked for road ${road.id} (country: ${countryData.country})")
                                                    navController.navigate("map?roadId=${road.id}&startNavigation=true") {
                                                        launchSingleTop = true
                                                    }
                                                },
                                                onViewDetails = {
                                                    navController.navigate("road_details/${road.id}")
                                                },
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            selectedCategory == 0 && selectedRoadFilter != 3 && roads.isNotEmpty() -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        top = 8.dp,
                        end = 16.dp,
                        bottom = 100.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    itemsIndexed(roads) { index, road ->
                        LeaderboardRoadCard(
                            rank = index + 1,
                            road = road,
                            onNavigate = {
                                android.util.Log.d("LeaderboardTabContent", "Navigate clicked for road ${road.id}")
                                navController.navigate("map?roadId=${road.id}&startNavigation=true") {
                                    launchSingleTop = true
                                }
                            },
                            onViewDetails = {
                                navController.navigate("road_details/${road.id}")
                            },
                        )
                    }
                }
            }
            selectedCategory == 1 && collections.isNotEmpty() -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        top = 8.dp,
                        end = 16.dp,
                        bottom = 100.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    itemsIndexed(collections) { index, collection ->
                        LeaderboardCollectionCard(
                            rank = index + 1,
                            collection = collection,
                            onViewDetails = {
                                navController.navigate("collection/${collection.id}")
                            },
                        )
                    }
                }
            }
            selectedCategory == 2 && users.isNotEmpty() -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        top = 8.dp,
                        end = 16.dp,
                        bottom = 100.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    itemsIndexed(users) { index, user ->
                        LeaderboardUserCard(
                            rank = index + 1,
                            user = user,
                            onViewProfile = {
                                // Navigate to user profile, preserving leaderboard tab in back stack
                                navController.navigate("user_profile/${user.id}") {
                                    // Save current state so we can return to leaderboard
                                    launchSingleTop = true
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
                            Icons.Default.EmojiEvents,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = "No data available",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun LeaderboardRoadCard(
    rank: Int,
    road: SavedRoad,
    onNavigate: () -> Unit,
    onViewDetails: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onViewDetails),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Rank
                Text(
                    text = "#$rank",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.width(40.dp),
                )
                
                // Road info
                Column(
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        text = road.road_name ?: "Unnamed Road",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = road.distance?.let { 
                            "Length: ${com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(it)}"
                        } ?: "Length: N/A",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    // Rating
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        val rating = road.average_rating ?: 0.0
                        val reviewsCount = road.review_count
                        Text(
                            text = "★ ${String.format("%.1f", rating)} ($reviewsCount reviews)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            
            // Action buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(
                    onClick = onNavigate,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("leaderboard_road_navigate_button_${road.id}"),
                ) {
                    Text("Navigate")
                }
                Button(
                    onClick = onViewDetails,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondary,
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("leaderboard_road_view_details_button_${road.id}"),
                ) {
                    Text("View Details")
                }
            }
        }
    }
}

@Composable
fun LeaderboardCollectionCard(
    rank: Int,
    collection: Collection,
    onViewDetails: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onViewDetails),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "#$rank",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.width(40.dp),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = collection.name ?: "Unnamed Collection",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                collection.description?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                    )
                }
            }
        }
    }
}

@Composable
fun LeaderboardUserCard(
    rank: Int,
    user: User,
    onViewProfile: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onViewProfile),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "#$rank",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.width(40.dp),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user.name ?: "Unknown User",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                )
                // Show basic stats if available
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    user.saved_roads_count?.let { count ->
                        if (count > 0) {
                            Text(
                                text = "Roads: $count",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    user.followers_count?.let { count ->
                        if (count > 0) {
                            Text(
                                text = "Followers: $count",
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


