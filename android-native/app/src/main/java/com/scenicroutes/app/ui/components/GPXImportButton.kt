package com.scenicroutes.app.ui.components

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream

@Composable
fun GPXImportButton(
    onRouteImported: (com.scenicroutes.app.data.model.Route) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var isImporting by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
    ) { uri: Uri? ->
        uri?.let {
            isImporting = true
            coroutineScope.launch {
                try {
                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                    val token = tokenManager.token.first()

                    // Convert URI to File
                    val file = withContext(Dispatchers.IO) {
                        val inputStream = context.contentResolver.openInputStream(uri)
                        val file = File(context.cacheDir, "import_${System.currentTimeMillis()}.gpx")
                        val outputStream = FileOutputStream(file)
                        inputStream?.copyTo(outputStream)
                        inputStream?.close()
                        outputStream.close()
                        file
                    }

                    val gpxMediaType = "application/gpx+xml".toMediaTypeOrNull() ?: throw IllegalArgumentException("Invalid media type: application/gpx+xml")
                    val requestFile = file.readBytes().toRequestBody(gpxMediaType)
                    val filePart = okhttp3.MultipartBody.Part.createFormData("file", file.name, requestFile)

                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.importGPX(token?.let { "Bearer $it" }, filePart)

                    if (response.isSuccessful && response.body() != null) {
                        val routeData = response.body()!!
                        // Parse route from response
                        // This is simplified - you may need to adjust based on actual API response
                        android.widget.Toast.makeText(
                            context,
                            "GPX imported successfully",
                            android.widget.Toast.LENGTH_SHORT,
                        ).show()
                    } else {
                        android.widget.Toast.makeText(
                            context,
                            "Failed to import GPX: ${response.message()}",
                            android.widget.Toast.LENGTH_SHORT,
                        ).show()
                    }
                } catch (e: Exception) {
                    android.util.Log.e("GPXImport", "Error importing GPX: ${e.message}", e)
                    android.widget.Toast.makeText(
                        context,
                        "Error: ${e.message}",
                        android.widget.Toast.LENGTH_SHORT,
                    ).show()
                } finally {
                    isImporting = false
                }
            }
        }
    }

    Button(
        onClick = { launcher.launch("application/gpx+xml") },
        modifier = modifier,
        enabled = !isImporting,
    ) {
        if (isImporting) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = MaterialTheme.colorScheme.onPrimary,
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Importing...")
        } else {
            Icon(Icons.Default.FileUpload, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text("Import GPX")
        }
    }
}
