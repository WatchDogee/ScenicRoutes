package com.scenicroutes.app.ui.sheets

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import org.osmdroid.util.GeoPoint
import com.scenicroutes.app.ui.components.DownloadAreaMapPreview

/**
 * Quick download sheet for offline maps
 * Triggered by long-pressing on the map
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickDownloadSheet(
    location: GeoPoint,
    onDismiss: () -> Unit,
    onDownload: (radiusKm: Double) -> Unit,
    onDownloadRoute: () -> Unit,
) {
    var selectedRadius by remember { mutableStateOf(10.0) }
    
    // Calculate affected regions (mock for now - integrate with actual region data)
    val affectedRegionCount = remember(selectedRadius) {
        when {
            selectedRadius <= 5 -> 1
            selectedRadius <= 10 -> 2
            selectedRadius <= 25 -> 3
            selectedRadius <= 50 -> 4
            else -> 5
        }
    }
    
    // Estimate tiles (roughly 256x256 tiles per region per zoom level)
    val estimatedTiles = remember(selectedRadius) {
        (affectedRegionCount * 100 * selectedRadius / 10).toInt().coerceAtLeast(50)
    }
    
    // Estimate size (roughly 20-50KB per tile average)
    val estimatedSizeMb = remember(estimatedTiles) {
        (estimatedTiles * 0.035) // Average 35KB per tile
    }
    
    // Bottom sheet for quick download options
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Header
            Text(
                text = "Download Offline Maps",
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier
                    .align(Alignment.Start)
                    .padding(bottom = 16.dp),
            )
            
            // Map preview showing download area
            DownloadAreaMapPreview(
                centerLat = location.latitude,
                centerLon = location.longitude,
                radiusKm = selectedRadius,
                affectedRegionCount = affectedRegionCount,
                estimatedTiles = estimatedTiles,
                estimatedSizeMb = estimatedSizeMb,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
            )
            
            // Radius selector
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
            ) {
                Text(
                    text = "Adjust Download Radius",
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                
                // Radius options as buttons
                val radiusOptions = listOf(5.0, 10.0, 25.0, 50.0)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    radiusOptions.forEach { radius ->
                        Button(
                            onClick = { selectedRadius = radius },
                            modifier = Modifier
                                .weight(1f)
                                .height(40.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selectedRadius == radius)
                                    MaterialTheme.colorScheme.primary
                                else
                                    MaterialTheme.colorScheme.secondaryContainer,
                            ),
                        ) {
                            Text(
                                text = "${radius.toInt()}km",
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
                
                // Custom radius slider
                Slider(
                    value = selectedRadius.toFloat(),
                    onValueChange = { selectedRadius = it.toDouble() },
                    valueRange = 1f..100f,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                )
                
                // Display current slider value
                Text(
                    text = "${selectedRadius.toInt()} km",
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .padding(top = 4.dp),
                )
            }
            
            // Quick download button
            Button(
                onClick = { onDownload(selectedRadius) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .padding(bottom = 12.dp),
            ) {
                Text("Download ${selectedRadius.toInt()} km around location")
            }
            
            // Download around route option
            OutlinedButton(
                onClick = onDownloadRoute,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .padding(bottom = 12.dp),
            ) {
                Text("Download around saved route")
            }
            
            // Cancel button
            TextButton(
                onClick = onDismiss,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
            ) {
                Text("Cancel")
            }
        }
    }
}
