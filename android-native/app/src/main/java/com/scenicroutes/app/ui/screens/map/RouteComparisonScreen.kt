package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.model.Route

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RouteComparisonScreen(
    routes: List<Route>,
    onNavigateBack: () -> Unit,
    onSelectRoute: (Route) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Compare Routes (${routes.size})") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Comparison table header
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Route",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Distance",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Time",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            // Route comparison cards
            routes.forEachIndexed { index, route ->
                RouteComparisonCard(
                    route = route,
                    index = index + 1,
                    onClick = {
                        onSelectRoute(route)
                        onNavigateBack()
                    },
                )
            }

            // Summary
            if (routes.size > 1) {
                HorizontalDivider()

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "Summary",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )

                        val distances = routes.mapNotNull { it.distance }
                        val times = routes.mapNotNull { it.time }

                        if (distances.isNotEmpty()) {
                            val minDistance = distances.minOrNull() ?: 0.0
                            val maxDistance = distances.maxOrNull() ?: 0.0
                            val avgDistance = distances.average()

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Distance Range:", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "${com.scenicroutes.app.utils.DistanceFormatter.formatDistance(minDistance, com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits())} - ${com.scenicroutes.app.utils.DistanceFormatter.formatDistance(maxDistance, com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits())}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Average Distance:", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    com.scenicroutes.app.utils.DistanceFormatter.formatDistance(avgDistance, com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }

                        if (times.isNotEmpty()) {
                            val minTime = times.minOrNull() ?: 0L
                            val maxTime = times.maxOrNull() ?: 0L
                            val avgTime = times.average()

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Time Range:", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "${Math.round(minTime / 1000.0 / 60.0)} - ${Math.round(maxTime / 1000.0 / 60.0)} min",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Average Time:", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    "${Math.round(avgTime / 1000.0 / 60.0)} min",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RouteComparisonCard(
    route: Route,
    index: Int,
    onClick: () -> Unit,
) {
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
            // Route number and info
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f),
            ) {
                Surface(
                    shape = androidx.compose.foundation.shape.CircleShape,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(40.dp),
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "$index",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }
                Column {
                    Text(
                        text = "Route $index",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (route.geometry.isNotEmpty()) {
                        val start = route.geometry.first()
                        val end = route.geometry.last()
                        if (start.size >= 2 && end.size >= 2) {
                            Text(
                                text = "${String.format("%.2f", start[0])}, ${String.format("%.2f", start[1])} → ${String.format("%.2f", end[0])}, ${String.format("%.2f", end[1])}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            // Distance
            route.distance.let {
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        Icons.Filled.Straighten,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = com.scenicroutes.app.utils.DistanceFormatter.formatDistance(
                            it.toDouble(),
                            com.scenicroutes.app.utils.SettingsManager.getMeasurementUnits()
                        ),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Time
            route.time.let {
                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        Icons.Filled.AccessTime,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = "${Math.round(it / 1000.0 / 60.0)} min",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}
