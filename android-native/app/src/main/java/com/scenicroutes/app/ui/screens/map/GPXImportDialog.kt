package com.scenicroutes.app.ui.screens.map

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GPXImportDialog(
    onDismiss: () -> Unit,
    onImportSuccess: (com.scenicroutes.app.data.model.Route) -> Unit = {},
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isImporting by remember { mutableStateOf(false) }
    var importProgress by remember { mutableStateOf(0f) }
    var importMessage by remember { mutableStateOf<String?>(null) }
    var importError by remember { mutableStateOf<String?>(null) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri: Uri? ->
        uri?.let { fileUri ->
            isImporting = true
            importMessage = null
            importError = null

            coroutineScope.launch {
                try {
                    importProgress = 0.1f
                    val tokenManager = TokenManager(context)
                    val token = tokenManager.token.first()

                    if (token == null) {
                        importError = "Please log in to import GPX files"
                        isImporting = false
                        return@launch
                    }

                    importProgress = 0.2f
                    // Copy file to cache directory
                    val inputStream = context.contentResolver.openInputStream(fileUri)
                    if (inputStream == null) {
                        importError = "Failed to read file. Please try again."
                        isImporting = false
                        return@launch
                    }

                    val cacheFile = File(context.cacheDir, "gpx_import_${System.currentTimeMillis()}.gpx")
                    inputStream.use { input ->
                        FileOutputStream(cacheFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    importProgress = 0.5f

                    if (!cacheFile.exists() || cacheFile.length() == 0L) {
                        importError = "File is empty or could not be read"
                        isImporting = false
                        cacheFile.delete()
                        return@launch
                    }

                    importProgress = 0.6f
                    val apiService = NetworkModule.apiService
                    val mediaType = "application/gpx+xml".toMediaTypeOrNull()
                        ?: "application/xml".toMediaTypeOrNull()
                        ?: throw IllegalArgumentException("Invalid media type")

                    val requestFile = cacheFile.asRequestBody(mediaType)
                    val filePart = MultipartBody.Part.createFormData("file", cacheFile.name, requestFile)

                    importProgress = 0.7f
                    val response = apiService.importGPX(
                        "Bearer $token",
                        filePart,
                    )
                    importProgress = 0.9f

                    if (response.isSuccessful && response.body() != null) {
                        val result = response.body()!!
                        if (result["success"] == true || result.containsKey("route")) {
                            val routeData = result["route"] as? Map<*, *>
                            if (routeData != null) {
                                // Convert to Route object
                                val rawGeometry = routeData["geometry"] as? List<*>
                                val rawCoordinates = routeData["coordinates"] as? List<*>

                                val geometry = when {
                                    rawGeometry != null -> rawGeometry.mapNotNull { point ->
                                        (point as? List<*>)?.mapNotNull { it as? Double }
                                    }
                                    rawCoordinates != null -> rawCoordinates.mapNotNull { point ->
                                        when (point) {
                                            is Map<*, *> -> {
                                                val lat = (point["lat"] as? Number)?.toDouble()
                                                val lng = (point["lng"] as? Number)?.toDouble()
                                                    ?: (point["lon"] as? Number)?.toDouble()
                                                if (lat != null && lng != null) {
                                                    listOf(lat, lng)
                                                } else {
                                                    null
                                                }
                                            }
                                            is List<*> -> point.mapNotNull { it as? Double }
                                            else -> null
                                        }
                                    }
                                    else -> emptyList()
                                }

                                val distanceKm = (routeData["distance_km"] as? Number)?.toDouble()
                                val distanceMeters = (routeData["distance"] as? Number)?.toDouble()
                                val durationSec = (routeData["duration"] as? Number)?.toDouble()
                                val durationMin = (routeData["duration_min"] as? Number)?.toDouble()

                                val distanceMetersFinal = when {
                                    distanceKm != null -> distanceKm * 1000
                                    distanceMeters != null -> distanceMeters
                                    else -> 0.0
                                }
                                val durationMillisFinal = when {
                                    durationSec != null -> (durationSec * 1000).toLong()
                                    durationMin != null -> (durationMin * 60 * 1000).toLong()
                                    else -> 0L
                                }

                                val route = com.scenicroutes.app.data.model.Route(
                                    geometry = geometry,
                                    distance = distanceMetersFinal,
                                    time = durationMillisFinal,
                                    instructions = null,
                                )

                                importMessage = "GPX imported successfully!"
                                onImportSuccess(route)
                                // Auto-dismiss after 2 seconds
                                kotlinx.coroutines.delay(2000)
                                onDismiss()
                            } else {
                                importError = "Invalid response format: no route data"
                            }
                        } else {
                            importError = result["error"] as? String ?: "Failed to import GPX"
                        }
                    } else {
                        val errorBody = response.errorBody()?.string()
                        val message = if (!errorBody.isNullOrBlank()) {
                            try {
                                val json = org.json.JSONObject(errorBody)
                                json.optString("message").ifBlank {
                                    json.optString("error")
                                }
                            } catch (e: Exception) {
                                ""
                            }
                        } else {
                            ""
                        }
                        importError = message.ifBlank {
                            response.message()?.takeIf { it.isNotBlank() } ?: "Failed to import GPX"
                        }
                    }

                    // Clean up cache file
                    cacheFile.delete()
                } catch (e: Exception) {
                    android.util.Log.e("GPXImport", "Error importing GPX: ${e.message}", e)
                    importError = "Error: ${e.message}"
                } finally {
                    isImporting = false
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Import GPX File") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "Select a GPX file to import as a route",
                    style = MaterialTheme.typography.bodyMedium,
                )

                importMessage?.let { message ->
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

                importError?.let { error ->
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

                if (isImporting) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        LinearProgressIndicator(
                            progress = importProgress,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                progress = importProgress,
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Importing GPX file... ${(importProgress * 100).toInt()}%")
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    filePickerLauncher.launch(
                        arrayOf(
                            "application/gpx+xml",
                            "application/xml",
                            "text/xml",
                            "application/octet-stream",
                        ),
                    )
                },
                enabled = !isImporting,
            ) {
                Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Select GPX File")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isImporting) {
                Text("Back to Map")
            }
        },
    )
}
