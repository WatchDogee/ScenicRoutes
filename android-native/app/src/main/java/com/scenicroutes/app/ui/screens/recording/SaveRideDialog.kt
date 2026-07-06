package com.scenicroutes.app.ui.screens.recording

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.service.FeatureAccessService
import org.osmdroid.util.GeoPoint

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaveRideDialog(
    trackedPoints: List<GeoPoint>,
    totalDistance: Double,
    duration: Long,
    onDismiss: () -> Unit,
    onSave: (String, String?, Boolean) -> Unit,
    navController: NavController? = null,
) {
    val context = LocalContext.current
    val featureAccessService = remember { FeatureAccessService(context) }
    val coroutineScope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var isPublic by remember { mutableStateOf(true) } // Default to public (free users can only save public)
    var hasPrivateAccess by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        hasPrivateAccess = featureAccessService.hasFeatureAccess("private_roads")
        // If user doesn't have access, force public
        if (!hasPrivateAccess) {
            isPublic = true
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Save Recorded Ride") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "Distance: ${String.format("%.2f", totalDistance / 1000)} km\nDuration: ${duration / 1000 / 60} min\nPoints: ${trackedPoints.size}",
                    style = MaterialTheme.typography.bodyMedium,
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Ride Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                )

                // Public/Private toggle
                if (hasPrivateAccess) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                if (isPublic) Icons.Default.Public else Icons.Default.Lock,
                                contentDescription = null,
                                tint = if (isPublic) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Column {
                                Text(
                                    text = if (isPublic) "Public Road" else "Private Road",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(
                                    text = if (isPublic) "Visible to everyone" else "Only visible to you",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Switch(
                            checked = isPublic,
                            onCheckedChange = { isPublic = it },
                        )
                    }
                } else {
                    // Show locked private option for free users
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                        ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(
                                    Icons.Default.Public,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                                Column {
                                    Text(
                                        text = "Public Road",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        text = "Visible to everyone",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(
                                    Icons.Default.Lock,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                TextButton(
                                    onClick = {
                                        navController?.navigate("subscription") {
                                            launchSingleTop = true
                                        }
                                    },
                                ) {
                                    Text("Upgrade for Private")
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(name, description.takeIf { it.isNotBlank() }, isPublic) },
                enabled = name.isNotBlank(),
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}
