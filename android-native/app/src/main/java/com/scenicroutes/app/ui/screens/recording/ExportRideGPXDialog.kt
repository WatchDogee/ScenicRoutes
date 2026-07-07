package com.scenicroutes.app.ui.screens.recording

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportRideGPXDialog(
    trackedPoints: List<GeoPoint>,
    onDismiss: () -> Unit,
    onExport: () -> Unit,
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isExporting by remember { mutableStateOf(false) }
    var exportMessage by remember { mutableStateOf<String?>(null) }

    fun generateGPX(name: String): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")
        val timestamp = dateFormat.format(Date())

        val gpx = StringBuilder()
        gpx.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        gpx.append("<gpx version=\"1.1\" creator=\"ScenicRoutes\">\n")
        gpx.append("  <trk>\n")
        gpx.append("    <name>$name</name>\n")
        gpx.append("    <trkseg>\n")

        trackedPoints.forEach { point ->
            gpx.append("      <trkpt lat=\"${point.latitude}\" lon=\"${point.longitude}\">\n")
            gpx.append("        <time>$timestamp</time>\n")
            gpx.append("      </trkpt>\n")
        }

        gpx.append("    </trkseg>\n")
        gpx.append("  </trk>\n")
        gpx.append("</gpx>\n")

        return gpx.toString()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Export Ride as GPX") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "Export ${trackedPoints.size} points as GPX file",
                    style = MaterialTheme.typography.bodyMedium,
                )

                exportMessage?.let { message ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (message.contains("success", ignoreCase = true)) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.errorContainer
                            },
                        ),
                    ) {
                        Text(
                            text = message,
                            modifier = Modifier.padding(12.dp),
                            color = if (message.contains("success", ignoreCase = true)) {
                                MaterialTheme.colorScheme.onPrimaryContainer
                            } else {
                                MaterialTheme.colorScheme.onErrorContainer
                            },
                        )
                    }
                }

                if (isExporting) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Exporting...")
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    isExporting = true
                    exportMessage = null
                    coroutineScope.launch {
                        try {
                            val fileName = "ride_${System.currentTimeMillis()}.gpx"
                            val gpxContent = generateGPX("Recorded Ride")

                            // Save to external storage
                            val file = File(context.getExternalFilesDir(null), fileName)
                            FileOutputStream(file).use { output ->
                                output.write(gpxContent.toByteArray())
                            }

                            val fileUri = androidx.core.content.FileProvider.getUriForFile(
                                context,
                                "${context.packageName}.fileprovider",
                                file,
                            )

                            // Share file
                            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                type = "application/gpx+xml"
                                putExtra(android.content.Intent.EXTRA_STREAM, fileUri)
                                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            context.startActivity(android.content.Intent.createChooser(shareIntent, "Share GPX"))

                            exportMessage = "GPX exported successfully to ${file.name}"
                            onExport()
                            kotlinx.coroutines.delay(2000)
                            onDismiss()
                        } catch (e: Exception) {
                            android.util.Log.e("ExportRideGPX", "Error exporting GPX: ${e.message}", e)
                            exportMessage = "Error: ${e.message}"
                        } finally {
                            isExporting = false
                        }
                    }
                },
                enabled = !isExporting && trackedPoints.isNotEmpty(),
            ) {
                Icon(Icons.Default.FileDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Export GPX")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isExporting) {
                Text("Cancel")
            }
        },
    )
}
















