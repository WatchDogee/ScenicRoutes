package com.scenicroutes.app.ui.screens.stats

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.model.UsageStatistics
import com.scenicroutes.app.data.repository.SubscriptionRepository
import com.scenicroutes.app.ui.components.BarChart
import com.scenicroutes.app.ui.components.PieChart
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UsageStatsScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val tokenManager = remember { TokenManager(context) }
    val repository = remember { SubscriptionRepository() }
    
    var selectedPeriod by remember { mutableStateOf("month") }
    var stats by remember { mutableStateOf<UsageStatistics?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()
    
    fun loadStats() {
        coroutineScope.launch {
            isLoading = true
            errorMessage = null
            val token = tokenManager.token.first()
            if (token != null) {
                repository.getUsageStatistics(token, selectedPeriod).fold(
                    onSuccess = {
                        stats = it
                        isLoading = false
                    },
                    onFailure = {
                        errorMessage = it.message
                        isLoading = false
                    },
                )
            } else {
                errorMessage = "Please log in to view usage statistics"
                isLoading = false
            }
        }
    }
    
    LaunchedEffect(selectedPeriod) {
        loadStats()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Usage Statistics") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(padding),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Period selector
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    listOf("day" to "Today", "week" to "This Week", "month" to "This Month", "year" to "This Year").forEach { (period, label) ->
                        FilterChip(
                            selected = selectedPeriod == period,
                            onClick = { selectedPeriod = period },
                            label = { Text(label) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
            
            // Error message
            errorMessage?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = error,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.weight(1f),
                        )
                        IconButton(onClick = { errorMessage = null }) {
                            Icon(Icons.Default.Close, contentDescription = "Dismiss")
                        }
                    }
                }
            }
            
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            } else if (stats != null) {
                val usageStats = stats!!
                
                // Summary cards
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Total Routes
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                text = "${usageStats.total}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                            )
                            Text(
                                "Total Routes",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                            )
                        }
                    }
                    
                    // Total Distance
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            val distanceKm = usageStats.total_distance_km ?: 0.0
                            val distanceMeters = distanceKm * 1000.0
                            val measurementUnits = com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()

                            val distanceText = if (measurementUnits == "imperial") {
                                val miles = distanceMeters * 0.000621371
                                when {
                                    miles < 1 -> "${(distanceMeters * 3.28084).toInt()} ft"
                                    miles < 1000 -> "${String.format("%.1f", miles)} mi"
                                    else -> "${String.format("%.2f", miles / 1000)} thousand mi"
                                }
                            } else {
                                when {
                                    distanceKm < 1 -> "${(distanceKm * 1000).toInt()} m"
                                    distanceKm < 1000 -> "${String.format("%.1f", distanceKm)} km"
                                    else -> "${String.format("%.2f", distanceKm / 1000)} thousand km"
                                }
                            }

                            Text(
                                text = distanceText,
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                            )
                            Text(
                                "Total Distance",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f),
                            )
                        }
                    }
                }
                
                // Additional summary cards
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Average Distance
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            val avgDistanceKm = if (usageStats.total > 0) {
                                (usageStats.total_distance_km ?: 0.0) / usageStats.total
                            } else {
                                0.0
                            }
                            val avgDistanceMeters = avgDistanceKm * 1000.0
                            val measurementUnits = com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()

                            val avgDistanceText = if (measurementUnits == "imperial") {
                                val miles = avgDistanceMeters * 0.000621371
                                when {
                                    miles < 1 -> "${(avgDistanceMeters * 3.28084).toInt()} ft"
                                    miles < 1000 -> "${String.format("%.1f", miles)} mi"
                                    else -> "${String.format("%.2f", miles / 1000)} thousand mi"
                                }
                            } else {
                                when {
                                    avgDistanceKm < 1 -> "${(avgDistanceKm * 1000).toInt()} m"
                                    avgDistanceKm < 1000 -> "${String.format("%.1f", avgDistanceKm)} km"
                                    else -> "${String.format("%.2f", avgDistanceKm / 1000)} thousand km"
                                }
                            }

                            Text(
                                text = avgDistanceText,
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onTertiaryContainer,
                            )
                            Text(
                                "Avg Distance",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.8f),
                            )
                        }
                    }
                    
                    // Routes Per Day
                    Card(
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            val routesPerDay = when (selectedPeriod) {
                                "day" -> usageStats.total.toFloat()
                                "week" -> usageStats.total.toFloat() / 7f
                                "month" -> usageStats.total.toFloat() / 30f
                                "year" -> usageStats.total.toFloat() / 365f
                                else -> 0f
                            }
                            Text(
                                text = String.format("%.1f", routesPerDay),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                            Text(
                                "Routes/Day",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.8f),
                            )
                        }
                    }
                }
                
                // Routes by Type - Bar Chart
                usageStats.by_type?.let { byType ->
                    if (byType.isNotEmpty()) {
                        BarChart(
                            data = byType,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                    }
                }
                
                // Routes by Curvature - Pie Chart
                usageStats.by_curvature?.let { byCurvature ->
                    if (byCurvature.isNotEmpty()) {
                        PieChart(
                            data = byCurvature,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                    }
                }
                
                // Empty state
                if ((usageStats.by_type == null || usageStats.by_type.isEmpty()) &&
                    (usageStats.by_curvature == null || usageStats.by_curvature.isEmpty()) &&
                    usageStats.total == 0
                ) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                Icons.Default.Route,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                            )
                            Text(
                                "No usage data for this period",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "Start planning routes to see your statistics here",
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



