package com.scenicroutes.app.ui.screens.explore

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun CollectionsTabContent(
    navController: NavController,
    modifier: Modifier = Modifier,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    var collections by remember { mutableStateOf<List<Collection>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    
    fun loadCollections(query: String? = null) {
        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val apiService = NetworkModule.apiService
                // Try public-collections endpoint first (supports query parameters)
                val response = apiService.getPublicCollectionsV2(query = query?.takeIf { it.isNotBlank() })
                
                if (response.isSuccessful) {
                    val responseBody = response.body()
                    if (responseBody != null && responseBody is Map<*, *>) {
                        // Handle paginated response from public-collections
                        // Laravel pagination returns: {"data": [...], "current_page": 1, ...}
                        val data = responseBody["data"] as? List<*>
                        if (data != null) {
                            // Map dynamic maps into Collection models
                            collections = data.mapNotNull { item ->
                                (item as? Map<*, *>)?.let { map ->
                                    try {
                                        val userMap = map["user"] as? Map<*, *>
                                        val user = userMap?.let {
                                            com.scenicroutes.app.data.model.User(
                                                id = (it["id"] as? Number)?.toLong() ?: 0,
                                                name = it["name"] as? String ?: "",
                                                email = "",
                                            )
                                        }
                                        Collection(
                                            id = (map["id"] as? Number)?.toLong() ?: return@let null,
                                            name = map["name"] as? String ?: return@let null,
                                            description = map["description"] as? String,
                                            user_id = (map["user_id"] as? Number)?.toLong() ?: return@let null,
                                            is_public = map["is_public"] as? Boolean ?: false,
                                            rating = (map["rating"] as? Number)?.toDouble(),
                                            review_count = (map["review_count"] as? Number)?.toInt() ?: 0,
                                            road_count = (map["roads_count"] ?: map["road_count"] as? Number)?.let { (it as? Number)?.toInt() } ?: 0,
                                            cover_image_url = map["cover_image_url"] as? String,
                                            created_at = map["created_at"] as? String ?: "",
                                            updated_at = map["updated_at"] as? String ?: "",
                                            tags = null,
                                            roads = null,
                                            user = user,
                                        )
                                    } catch (e: Exception) {
                                        android.util.Log.e("CollectionsTabContent", "Error parsing collection: ${e.message}")
                                        null
                                    }
                                }
                            }
                        } else {
                            // Handle error response: {"error": "...", "collections": []}
                            val errorCollections = responseBody["collections"] as? List<*>
                            collections = errorCollections?.mapNotNull { item ->
                                (item as? Map<*, *>)?.let { map ->
                                    try {
                                        val userMap = map["user"] as? Map<*, *>
                                        val user = userMap?.let {
                                            com.scenicroutes.app.data.model.User(
                                                id = (it["id"] as? Number)?.toLong() ?: 0,
                                                name = it["name"] as? String ?: "",
                                                email = "",
                                            )
                                        }
                                        Collection(
                                            id = (map["id"] as? Number)?.toLong() ?: return@let null,
                                            name = map["name"] as? String ?: return@let null,
                                            description = map["description"] as? String,
                                            user_id = (map["user_id"] as? Number)?.toLong() ?: return@let null,
                                            is_public = map["is_public"] as? Boolean ?: false,
                                            rating = (map["rating"] as? Number)?.toDouble(),
                                            review_count = (map["review_count"] as? Number)?.toInt() ?: 0,
                                            road_count = (map["roads_count"] ?: map["road_count"] as? Number)?.let { (it as? Number)?.toInt() } ?: 0,
                                            cover_image_url = map["cover_image_url"] as? String,
                                            created_at = map["created_at"] as? String ?: "",
                                            updated_at = map["updated_at"] as? String ?: "",
                                            tags = null,
                                            roads = null,
                                            user = user,
                                        )
                                    } catch (e: Exception) {
                                        null
                                    }
                                }
                            } ?: emptyList()
                        }
                    } else {
                        collections = emptyList()
                    }
                } else {
                    // Fallback to featured collections if public-collections fails
                    try {
                        val fallbackResponse = apiService.getFeaturedCollections()
                        if (fallbackResponse.isSuccessful && fallbackResponse.body() != null) {
                            collections = fallbackResponse.body()!!
                        } else {
                            // Check if we got HTML instead of JSON (redirect to login)
                            val errorBody = fallbackResponse.errorBody()?.string()
                            if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                                errorMessage = "Authentication required or endpoint not available"
                            } else {
                                errorMessage = "Failed to load collections (${fallbackResponse.code()})"
                            }
                        }
                    } catch (fallbackException: Exception) {
                        // Check if we got HTML instead of JSON (redirect to login)
                        val errorBody = response.errorBody()?.string()
                        if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                            errorMessage = "Authentication required or endpoint not available"
                        } else {
                            errorMessage = "Failed to load collections (${response.code()})"
                        }
                    }
                }
            } catch (e: com.google.gson.JsonSyntaxException) {
                // Handle JSON parsing errors (e.g., when HTML is returned or incomplete JSON)
                android.util.Log.e("CollectionsTabContent", "JSON parsing error: ${e.message}", e)
                // Check if error is due to incomplete JSON (truncated response)
                val errorMsg = e.message ?: ""
                if (errorMsg.contains("End of input") || errorMsg.contains("Expected value")) {
                    errorMessage = "Error: Incomplete data received. Backend may not be running. Please try again."
                } else {
                    errorMessage = "Error: Invalid response format. Backend may not be running. Please try again."
                }
            } catch (e: java.io.EOFException) {
                android.util.Log.e("CollectionsTabContent", "Unexpected end of JSON input: ${e.message}", e)
                errorMessage = "Error: Incomplete data received. Make sure Laravel backend is running."
            } catch (e: java.net.ConnectException) {
                android.util.Log.e("CollectionsTabContent", "Connection error - backend not reachable: ${e.message}", e)
                errorMessage = "Failed to connect to backend. Make sure Laravel is running on port 8000."
            } catch (e: java.net.SocketTimeoutException) {
                android.util.Log.e("CollectionsTabContent", "Connection timeout: ${e.message}", e)
                errorMessage = "Connection timeout. Make sure Laravel backend is running."
            } catch (e: Exception) {
                android.util.Log.e("CollectionsTabContent", "Error loading collections: ${e.message}", e)
                android.util.Log.e("CollectionsTabContent", "Exception type: ${e.javaClass.name}")
                errorMessage = "Error: ${e.message ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        }
    }
    
    LaunchedEffect(Unit) {
        loadCollections()
    }
    
    // Create Collection Dialog
    if (showCreateDialog) {
        CreateCollectionDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { name, description, isPublic ->
                coroutineScope.launch {
                    try {
                        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                        val token = tokenManager.token.first()
                        if (token != null) {
                            val apiService = NetworkModule.apiService
                            val request = com.scenicroutes.app.data.api.CollectionRequest(
                                name = name,
                                description = description,
                                is_public = isPublic,
                            )
                            val response = apiService.createCollection("Bearer $token", request)
                            if (response.isSuccessful) {
                                android.widget.Toast.makeText(
                                    context,
                                    "Collection created successfully",
                                    android.widget.Toast.LENGTH_SHORT
                                ).show()
                                showCreateDialog = false
                                loadCollections() // Reload collections
                            } else {
                                android.widget.Toast.makeText(
                                    context,
                                    "Failed to create collection: ${response.code()}",
                                    android.widget.Toast.LENGTH_SHORT
                                ).show()
                            }
                        } else {
                            android.widget.Toast.makeText(
                                context,
                                "Please log in to create collections",
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                            showCreateDialog = false
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("CollectionsTabContent", "Error creating collection: ${e.message}", e)
                        android.widget.Toast.makeText(
                            context,
                            "Error: ${e.message}",
                            android.widget.Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
        )
    }
    
    Column(
        modifier = modifier.fillMaxSize(),
    ) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { 
                searchQuery = it
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            placeholder = { Text("Search collections...") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = "Search")
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = {
                        searchQuery = ""
                    }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear")
                    }
                }
            },
            singleLine = true,
        )

        // Search actions
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(
                onClick = { loadCollections(searchQuery) },
                enabled = !isLoading,
            ) {
                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Search")
            }
            TextButton(
                onClick = {
                    searchQuery = ""
                    loadCollections()
                },
                enabled = !isLoading,
            ) {
                Text("Reset")
            }
            Spacer(modifier = Modifier.weight(1f))
            // Create Collection button
            FilledTonalButton(
                onClick = { showCreateDialog = true },
                enabled = !isLoading,
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Create")
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
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
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
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                            Button(
                                onClick = { loadCollections() },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.error,
                                ),
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Retry")
                            }
                        }
                    }
                }
            }
            collections.isNotEmpty() -> {
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
                    items(collections) { collection ->
                        CollectionCard(
                            collection = collection,
                            onViewDetails = {
                                navController.navigate("collection/${collection.id}")
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
                            Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = if (searchQuery.isNotEmpty()) "No collections found" else "No collections available",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = "Browse curated road collections",
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
fun CollectionCard(
    collection: Collection,
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
                Icon(
                    Icons.Default.Folder,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary,
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
                    // Creator info
                    collection.user?.let {
                        Text(
                            text = "By ${it.name}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}








