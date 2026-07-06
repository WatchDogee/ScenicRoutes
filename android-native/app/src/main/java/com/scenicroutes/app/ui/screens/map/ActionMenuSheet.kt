package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActionMenuSheet(
    onDismiss: () -> Unit,
    onPlanRoute: () -> Unit,
    onFindCurvedRoads: () -> Unit,
    onRecordRide: () -> Unit,
    onImportGPX: () -> Unit,
    onExportGPX: () -> Unit,
    onRouteHistory: () -> Unit = {},
    onClearAll: () -> Unit = {},
    onCommunityRoads: (() -> Unit)? = null,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxHeight(0.6f),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Actions",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Action items
            ActionMenuItem(
                icon = Icons.Default.Route,
                title = "Plan Route",
                subtitle = "Calculate route with waypoints",
                onClick = {
                    onPlanRoute()
                    onDismiss()
                },
                modifier = Modifier.testTag("plan_route_action"),
            )

            ActionMenuItem(
                icon = Icons.Default.Timeline,
                title = "Find Curved Roads",
                subtitle = "Search road network for scenic routes",
                onClick = {
                    onFindCurvedRoads()
                    onDismiss()
                },
            )

            ActionMenuItem(
                icon = Icons.Default.People,
                title = "Community Roads",
                subtitle = "Browse roads shared by community",
                onClick = {
                    onCommunityRoads?.invoke()
                    onDismiss()
                },
            )

            ActionMenuItem(
                icon = Icons.Default.RadioButtonChecked,
                title = "Record Ride",
                subtitle = "Track your journey",
                onClick = {
                    android.util.Log.d("ActionMenuSheet", "Record Ride menu item clicked")
                    onRecordRide()
                    android.util.Log.d("ActionMenuSheet", "onRecordRide callback completed")
                    // onDismiss() is called by onRecordRide via showActionMenu = false
                },
                modifier = Modifier.testTag("record_ride_menu_item"),
            )

            ActionMenuItem(
                icon = Icons.Default.History,
                title = "Route History",
                subtitle = "View and reuse previous routes",
                onClick = {
                    onRouteHistory()
                    onDismiss()
                },
            )

            Divider(modifier = Modifier.padding(vertical = 8.dp))

            ActionMenuItem(
                icon = Icons.Default.Upload,
                title = "Import GPX",
                subtitle = "Load route from file",
                onClick = {
                    onImportGPX()
                    onDismiss()
                },
            )

            ActionMenuItem(
                icon = Icons.Default.Download,
                title = "Export GPX",
                subtitle = "Save route to file",
                onClick = {
                    onExportGPX()
                    onDismiss()
                },
            )

            ActionMenuItem(
                icon = Icons.Default.Clear,
                title = "Clear All",
                subtitle = "Remove all routes, markers, and search results",
                onClick = {
                    onClearAll()
                    onDismiss()
                },
            )
        }
    }
}

@Composable
fun ActionMenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
