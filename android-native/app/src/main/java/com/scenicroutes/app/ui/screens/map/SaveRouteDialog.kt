package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavController
import com.scenicroutes.app.data.service.FeatureAccessService

@Composable
fun SaveRouteDialog(
    onDismiss: () -> Unit,
    onSave: (String, Boolean, Set<Long>) -> Unit,
    navController: NavController? = null,
) {
    val context = LocalContext.current
    val featureAccessService = remember { FeatureAccessService(context) }
    val coroutineScope = rememberCoroutineScope()

    var routeName by remember { mutableStateOf("") }
    var isPublic by remember { mutableStateOf(true) } // Default to public (free users can only save public)
    var hasPrivateAccess by remember { mutableStateOf(false) }
    var selectedTags by remember { mutableStateOf<Set<Long>>(emptySet()) }

    LaunchedEffect(Unit) {
        hasPrivateAccess = featureAccessService.hasFeatureAccess("private_roads")
        // If user doesn't have access, force public
        if (!hasPrivateAccess) {
            isPublic = true
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
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
                        text = "Save Route",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                // Route name input
                OutlinedTextField(
                    value = routeName,
                    onValueChange = { routeName = it },
                    label = { Text("Route Name") },
                    placeholder = { Text("My Scenic Route") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                // Public/Private toggle
                if (hasPrivateAccess) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
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

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            if (routeName.isNotBlank()) {
                                onSave(routeName, isPublic, selectedTags)
                                onDismiss()
                            }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = routeName.isNotBlank(),
                    ) {
                        Text("Save")
                    }
                }
            }
        }
    }
}
