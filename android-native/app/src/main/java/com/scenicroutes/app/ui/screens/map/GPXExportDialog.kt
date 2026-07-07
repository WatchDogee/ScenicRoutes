package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.network.NetworkModule
import com.scenicroutes.app.ui.components.FeatureGate
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GPXExportDialog(
    route: Route? = null,
    savedRoads: List<SavedRoad> = emptyList(),
    collections: List<Collection> = emptyList(),
    onDismiss: () -> Unit,
    navController: NavController? = null,
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isExporting by remember { mutableStateOf(false) }
    var exportProgress by remember { mutableStateOf(0f) }
    var exportMessage by remember { mutableStateOf<String?>(null) }
    var exportError by remember { mutableStateOf<String?>(null) }
    var selectedExportType by remember { mutableStateOf<String?>(null) }
    var selectedSavedRoadId by remember { mutableStateOf<Long?>(null) }
    var selectedCollectionId by remember { mutableStateOf<Long?>(null) }

    fun buildGpxFromRoute(route: Route): String {
        val gpx = StringBuilder()
        gpx.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        gpx.append("<gpx version=\"1.1\" creator=\"ScenicRoutes\">\n")
        gpx.append("  <trk>\n")
        gpx.append("    <name>Route</name>\n")
        gpx.append("    <trkseg>\n")
        route.geometry.forEach { coord ->
            if (coord.size >= 2) {
                gpx.append("      <trkpt lat=\"${coord[0]}\" lon=\"${coord[1]}\"></trkpt>\n")
            }
        }
        gpx.append("    </trkseg>\n")
        gpx.append("  </trk>\n")
        gpx.append("</gpx>\n")
        return gpx.toString()
    }

    fun exportGPX(gpxContent: String, fileName: String) {
        try {
            if (gpxContent.isBlank()) {
                exportError = "GPX content is empty"
                isExporting = false
                return
            }

            val externalDir = context.getExternalFilesDir(null)
            if (externalDir == null || !externalDir.exists()) {
                exportError = "External storage not available"
                isExporting = false
                return
            }

            val file = File(externalDir, fileName)
            FileOutputStream(file).use { output ->
                output.write(gpxContent.toByteArray())
            }

            if (!file.exists() || file.length() == 0L) {
                exportError = "Failed to write GPX file"
                isExporting = false
                return
            }

            // Share file using FileProvider for better compatibility
            val fileUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file,
            )

            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "application/gpx+xml"
                putExtra(android.content.Intent.EXTRA_STREAM, fileUri)
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(android.content.Intent.createChooser(shareIntent, "Share GPX"))

            exportMessage = "GPX exported successfully to ${file.name}"
            coroutineScope.launch {
                kotlinx.coroutines.delay(2000)
                onDismiss()
            }
        } catch (e: Exception) {
            android.util.Log.e("GPXExport", "Error exporting GPX: ${e.message}", e)
            exportError = "Error: ${e.message ?: "Unknown error occurred"}"
            isExporting = false
        }
    }

    FeatureGate(
        feature = "gpx_export",
        fallback = { requiredTier ->
            AlertDialog(
                onDismissRequest = onDismiss,
                title = { Text("Export GPX") },
                text = {
                    com.scenicroutes.app.ui.components.UpgradePrompt(
                        requiredTier = requiredTier,
                        feature = "gpx_export",
                        navController = navController,
                    )
                },
                confirmButton = {
                    TextButton(onClick = onDismiss) {
                        Text("Close")
                    }
                },
            )
        },
        content = {
            AlertDialog(
                onDismissRequest = onDismiss,
                title = { Text("Export GPX") },
                text = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Text(
                            text = "Select what to export as GPX",
                            style = MaterialTheme.typography.bodyMedium,
                        )

                        // Export type selection
                        if (route != null) {
                            FilterChip(
                                selected = selectedExportType == "route",
                                onClick = { selectedExportType = "route" },
                                label = { Text("Current Route") },
                                leadingIcon = if (selectedExportType == "route") {
                                    { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp)) }
                                } else {
                                    null
                                },
                            )
                        }

                        if (savedRoads.isNotEmpty()) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                FilterChip(
                                    selected = selectedExportType == "saved_road",
                                    onClick = { selectedExportType = "saved_road" },
                                    label = { Text("Saved Road") },
                                    leadingIcon = if (selectedExportType == "saved_road") {
                                        { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp)) }
                                    } else {
                                        null
                                    },
                                )

                                if (selectedExportType == "saved_road") {
                                    savedRoads.forEach { savedRoad ->
                                        FilterChip(
                                            selected = selectedSavedRoadId == savedRoad.id,
                                            onClick = { selectedSavedRoadId = savedRoad.id },
                                            label = { Text(savedRoad.road_name) },
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                    }
                                }
                            }
                        }

                        if (collections.isNotEmpty()) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                FilterChip(
                                    selected = selectedExportType == "collection",
                                    onClick = { selectedExportType = "collection" },
                                    label = { Text("Collection") },
                                    leadingIcon = if (selectedExportType == "collection") {
                                        { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp)) }
                                    } else {
                                        null
                                    },
                                )

                                if (selectedExportType == "collection") {
                                    collections.forEach { collection ->
                                        FilterChip(
                                            selected = selectedCollectionId == collection.id,
                                            onClick = { selectedCollectionId = collection.id },
                                            label = { Text(collection.name) },
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                    }
                                }
                            }
                        }

                        exportMessage?.let { message ->
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                                ),
                            ) {
                                Text(
                                    text = message,
                                    modifier = Modifier.padding(12.dp),
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                            }
                        }

                        exportError?.let { error ->
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.errorContainer,
                                ),
                            ) {
                                Text(
                                    text = error,
                                    modifier = Modifier.padding(12.dp),
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                )
                            }
                        }

                        if (isExporting) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                LinearProgressIndicator(
                                    progress = exportProgress,
                                    modifier = Modifier.fillMaxWidth(),
                                )
                                Row(
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        progress = exportProgress,
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text("Exporting GPX... ${(exportProgress * 100).toInt()}%")
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            isExporting = true
                            exportProgress = 0f
                            exportMessage = null
                            exportError = null

                            coroutineScope.launch {
                                try {
                                    exportProgress = 0.1f
                                    val tokenManager = TokenManager(context)
                                    val token = tokenManager.token.first()

                                    if (token == null) {
                                        exportError = "Please log in to export GPX files"
                                        isExporting = false
                                        return@launch
                                    }

                                    exportProgress = 0.3f
                                    val apiService = NetworkModule.apiService

                                    exportProgress = 0.5f
                                    when (selectedExportType) {
                                        "route" -> {
                                            if (route != null) {
                                                if (route.geometry.isEmpty()) {
                                                    exportError = "Route has no geometry to export"
                                                } else {
                                                    exportProgress = 0.8f
                                                    val gpxContent = buildGpxFromRoute(route)
                                                    exportProgress = 0.9f
                                                    exportGPX(gpxContent, "route_${System.currentTimeMillis()}.gpx")
                                                }
                                            } else {
                                                exportError = "No route selected"
                                            }
                                        }
                                        "saved_road" -> {
                                            selectedSavedRoadId?.let { roadId ->
                                                exportProgress = 0.6f
                                                val responseBody = apiService.exportSavedRoadToGPX(
                                                    "Bearer $token",
                                                    roadId,
                                                )
                                                exportProgress = 0.8f
                                                val gpxContent = responseBody.body()?.string() ?: ""
                                                exportProgress = 0.9f
                                                exportGPX(gpxContent, "saved_road_${roadId}_${System.currentTimeMillis()}.gpx")
                                            } ?: run {
                                                exportError = "Please select a saved road"
                                            }
                                        }
                                        "collection" -> {
                                            selectedCollectionId?.let { collectionId ->
                                                exportProgress = 0.6f
                                                val responseBody = apiService.exportCollectionToGPX(
                                                    "Bearer $token",
                                                    collectionId,
                                                )
                                                exportProgress = 0.8f
                                                val gpxContent = responseBody.body()?.string() ?: ""
                                                exportProgress = 0.9f
                                                exportGPX(gpxContent, "collection_${collectionId}_${System.currentTimeMillis()}.gpx")
                                            } ?: run {
                                                exportError = "Please select a collection"
                                            }
                                        }
                                        null -> {
                                            exportError = "Please select an export type"
                                        }
                                        else -> {
                                            exportError = "Invalid export type"
                                        }
                                    }
                                    exportProgress = 1f
                                } catch (e: Exception) {
                                    android.util.Log.e("GPXExport", "Error exporting GPX: ${e.message}", e)
                                    exportError = "Error: ${e.message}"
                                } finally {
                                    isExporting = false
                                }
                            }
                        },
                        enabled = !isExporting && selectedExportType != null &&
                            (selectedExportType != "saved_road" || selectedSavedRoadId != null) &&
                            (selectedExportType != "collection" || selectedCollectionId != null),
                    ) {
                        Icon(Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Export GPX")
                    }
                },
                dismissButton = {
                    TextButton(onClick = onDismiss, enabled = !isExporting) {
                        Text("Back to Map")
                    }
                },
            )
        },
    )
}
