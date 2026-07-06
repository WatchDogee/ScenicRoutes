package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapLayersDialog(
    currentLayer: String,
    onDismiss: () -> Unit,
    onLayerSelected: (String) -> Unit,
) {
    data class LayerInfo(val name: String, val key: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

    val layers = listOf(
        LayerInfo("Standard", "standard", Icons.Default.Map),
        LayerInfo("Terrain", "terrain", Icons.Default.Terrain),
        LayerInfo("Satellite", "satellite", Icons.Default.Satellite),
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Map Style",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                layers.forEach { layer ->
                    val isSelected = currentLayer == layer.key
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onLayerSelected(layer.key) },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.surfaceVariant
                            },
                        ),
                        border = if (isSelected) {
                            androidx.compose.foundation.BorderStroke(
                                2.dp,
                                MaterialTheme.colorScheme.primary,
                            )
                        } else {
                            null
                        },
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    layer.icon,
                                    contentDescription = null,
                                    tint = if (isSelected) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                                )
                                Text(
                                    text = layer.name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                )
                            }
                            if (isSelected) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = "Selected",
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        },
    )
}
