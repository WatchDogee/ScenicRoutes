package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
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
import com.scenicroutes.app.data.model.Route

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlternativeRoutesSheet(
    routes: List<Route>,
    selectedIndex: Int,
    onDismiss: () -> Unit,
    onSelectRoute: (Int) -> Unit,
    onCompare: () -> Unit = {},
    onPreviewRoute: ((Int) -> Unit)? = null,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxHeight(0.7f),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Alternative Routes (${routes.size})",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            Divider()

            // Compare button (if multiple routes)
            if (routes.size > 1) {
                Button(
                    onClick = {
                        onCompare()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Default.Compare, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Compare All Routes")
                }

                Divider()
            }

            // Routes list
            routes.forEachIndexed { index, route ->
                RouteOptionCard(
                    route = route,
                    index = index,
                    isSelected = index == selectedIndex,
                    onClick = { onSelectRoute(index) },
                    onPreview = onPreviewRoute?.let { { it(index) } },
                )
            }
        }
    }
}

@Composable
fun RouteOptionCard(
    route: Route,
    index: Int,
    isSelected: Boolean,
    onClick: () -> Unit,
    onPreview: (() -> Unit)? = null,
) {
    val routeColors = listOf(
        MaterialTheme.colorScheme.primary,
        MaterialTheme.colorScheme.secondary,
        MaterialTheme.colorScheme.tertiary,
        MaterialTheme.colorScheme.error,
        MaterialTheme.colorScheme.primaryContainer,
    )
    val routeColor = routeColors[index % routeColors.size]

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) {
                routeColor.copy(alpha = 0.2f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            },
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = if (isSelected) 3.dp else 1.dp,
            color = if (isSelected) routeColor else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isSelected) 4.dp else 1.dp,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Route number with color indicator
            Surface(
                color = routeColor,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.size(48.dp),
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "${index + 1}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }

            // Route info
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    RouteInfoItem(
                        icon = Icons.Default.Straighten,
                        label = "Distance",
                        value = com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(route.distance),
                        iconColor = routeColor,
                    )
                    RouteInfoItem(
                        icon = Icons.Default.AccessTime,
                        label = "Time",
                        value = "${Math.round(route.time / 1000.0 / 60.0)} min",
                        iconColor = routeColor,
                    )
                }
                // Route preview button
                onPreview?.let { preview ->
                    OutlinedButton(
                        onClick = preview,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = routeColor,
                        ),
                        border = androidx.compose.foundation.BorderStroke(1.dp, routeColor),
                    ) {
                        Icon(
                            Icons.Default.Map,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Preview on Map", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            // Selected indicator
            if (isSelected) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = "Selected",
                    tint = routeColor,
                    modifier = Modifier.size(28.dp),
                )
            }
        }
    }
}

@Composable
fun RouteInfoItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    iconColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.primary,
) {
    Column(
        horizontalAlignment = Alignment.Start,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = iconColor,
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
        }
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
