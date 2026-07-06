package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.local.RouteHistoryItem
import com.scenicroutes.app.data.local.RouteHistoryManager
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RouteHistoryScreen(
    navController: NavController,
    onNavigateBack: () -> Unit,
    onSelectRoute: (com.scenicroutes.app.data.model.Route) -> Unit,
) {
    val context = LocalContext.current
    val routeHistoryManager = remember { RouteHistoryManager(context) }
    val coroutineScope = rememberCoroutineScope()
    var routeHistory by remember { mutableStateOf<List<RouteHistoryItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showClearDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        routeHistoryManager.history.collect { history ->
            routeHistory = history
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Route History") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (routeHistory.isNotEmpty()) {
                        IconButton(onClick = { showClearDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "Clear History")
                        }
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
        } else if (routeHistory.isEmpty()) {
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
                        Icons.Default.History,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "No route history",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "Calculated routes will appear here",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(routeHistory) { item ->
                    RouteHistoryCard(
                        item = item,
                        onClick = {
                            // Validate route before selecting
                            if (item.route.geometry.isEmpty() || item.route.distance <= 0) {
                                android.util.Log.w("RouteHistoryScreen", "Skipping invalid route: geometry=${item.route.geometry.size}, distance=${item.route.distance}m")
                            } else {
                                // onSelectRoute will handle navigation asynchronously
                                onSelectRoute(item.route)
                            }
                        },
                        onDelete = {
                            coroutineScope.launch {
                                routeHistoryManager.removeRoute(item.id)
                            }
                        },
                    )
                }
            }
        }
    }

    // Clear history dialog
    if (showClearDialog) {
        AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = { Text("Clear Route History") },
            text = { Text("Are you sure you want to clear all route history?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        coroutineScope.launch {
                            routeHistoryManager.clearHistory()
                            showClearDialog = false
                        }
                    },
                ) {
                    Text("Clear", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearDialog = false }) {
                    Text("Cancel")
                }
            },
        )
    }
}

@Composable
fun RouteHistoryCard(
    item: RouteHistoryItem,
    onClick: () -> Unit,
    onDelete: () -> Unit,
) {
    val dateFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
    val dateString = dateFormat.format(Date(item.timestamp))

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.Default.Route,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = "${item.startLocation} → ${item.endLocation}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    item.route.distance?.let {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Straighten,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(it),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }

                    item.route.time?.let {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.AccessTime,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${Math.round(it / 1000.0 / 60.0)} min",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }

                    if (item.waypointsCount > 0) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "${item.waypointsCount} waypoints",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    item.routeType?.let {
                        @OptIn(ExperimentalMaterial3Api::class)
                        FilterChip(
                            selected = false,
                            onClick = { },
                            label = {
                                Text(
                                    text = it.replaceFirstChar { char -> char.uppercaseChar() },
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            },
                        )
                    }
                    Text(
                        text = dateString,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.error,
                )
            }
        }
    }
}
