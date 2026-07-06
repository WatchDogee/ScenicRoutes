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
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.launch

@Composable
fun RoadsTabContent(
    navController: NavController,
    modifier: Modifier = Modifier,
) {
    var searchQuery by remember { mutableStateOf("") }
    var roads by remember { mutableStateOf<List<SavedRoad>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    fun loadRoads(query: String? = null) {
        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val apiService = NetworkModule.apiService
                val response = apiService.getPublicRoads(query = query?.takeIf { it.isNotBlank() })
                if (response.isSuccessful) {
                    roads = response.body()?.roads ?: emptyList()
                } else {
                    val errorBody = response.errorBody()?.string()
                    errorMessage = if (errorBody != null && (errorBody.contains("<!DOCTYPE html>") || errorBody.contains("<html"))) {
                        "Authentication required or endpoint not available"
                    } else {
                        "Failed to load roads (${response.code()})"
                    }
                    roads = emptyList()
                }
            } catch (e: com.google.gson.JsonSyntaxException) {
                val errorMsg = e.message ?: ""
                errorMessage = if (errorMsg.contains("End of input") || errorMsg.contains("Expected value")) {
                    "Error: Incomplete data received. Backend may not be running. Please try again."
                } else {
                    "Error: Invalid response format. Backend may not be running. Please try again."
                }
            } catch (e: java.io.EOFException) {
                errorMessage = "Error: Incomplete data received. Make sure Laravel backend is running."
            } catch (e: java.net.ConnectException) {
                errorMessage = "Failed to connect to backend. Make sure Laravel is running on port 8000."
            } catch (e: java.net.SocketTimeoutException) {
                errorMessage = "Connection timeout. Make sure Laravel is running."
            } catch (e: Exception) {
                errorMessage = "Error: ${e.message ?: "Unknown error"}"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadRoads()
    }

    Column(
        modifier = modifier.fillMaxSize(),
    ) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            placeholder = { Text("Search roads...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Clear, contentDescription = "Clear")
                    }
                }
            },
            singleLine = true,
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(
                onClick = { loadRoads(searchQuery) },
                enabled = !isLoading,
            ) {
                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Search")
            }
            TextButton(
                onClick = {
                    searchQuery = ""
                    loadRoads()
                },
                enabled = !isLoading,
            ) {
                Text("Reset")
            }
        }

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
                                onClick = { loadRoads(searchQuery) },
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
            roads.isNotEmpty() -> {
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
                    items(roads) { road ->
                        RoadCard(
                            road = road,
                            onViewDetails = { navController.navigate("road_details/${road.id}") },
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
                            Icons.Default.Route,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = if (searchQuery.isNotEmpty()) "No roads found" else "No roads available",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = "Browse public roads shared by the community",
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
fun RoadCard(
    road: SavedRoad,
    onViewDetails: () -> Unit,
) {
    val ratingValue = road.average_rating ?: road.rating
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
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.Route,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = road.road_name.ifBlank { "Unnamed Road" },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (road.start_location.isNotBlank() || road.end_location.isNotBlank()) {
                        Text(
                            text = "${road.start_location.ifBlank { "?" }} -> ${road.end_location.ifBlank { "?" }}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                road.distance?.let { distanceMeters ->
                    Text(
                        text = "${String.format("%.1f", distanceMeters / 1000.0)} km",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                ratingValue?.let {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            text = String.format("%.1f", it),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }
    }
}
