package com.scenicroutes.app.ui.screens.map

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.scenicroutes.app.data.model.RoadPhoto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

@Composable
fun PhotoUploadDialog(
    roadId: Long,
    onDismiss: () -> Unit,
    onUploadSuccess: (RoadPhoto) -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var caption by remember { mutableStateOf("") }
    var isUploading by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
    ) { uri: Uri? ->
        uri?.let { selectedImageUri = it }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .fillMaxHeight(0.6f),
            shape = RoundedCornerShape(24.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
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
                        text = "Upload Photo",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Divider()

                // Select Image Button
                Button(
                    onClick = { launcher.launch("image/*") },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (selectedImageUri == null) "Select Photo" else "Change Photo")
                }

                // Caption
                OutlinedTextField(
                    value = caption,
                    onValueChange = { caption = it },
                    label = { Text("Caption (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    leadingIcon = {
                        Icon(Icons.Default.Description, contentDescription = null)
                    },
                    singleLine = true,
                )

                Spacer(modifier = Modifier.weight(1f))

                // Actions
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
                            if (selectedImageUri != null) {
                                isUploading = true
                                coroutineScope.launch {
                                    try {
                                        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                        val token = tokenManager.token.first()
                                        if (token != null) {
                                            // Convert URI to File
                                            val file = withContext(Dispatchers.IO) {
                                                val inputStream = context.contentResolver.openInputStream(selectedImageUri!!)
                                                val file = File(context.cacheDir, "upload_${System.currentTimeMillis()}.jpg")
                                                val outputStream = FileOutputStream(file)
                                                inputStream?.copyTo(outputStream)
                                                inputStream?.close()
                                                outputStream.close()
                                                file
                                            }

                                            val savedRoadRepository = com.scenicroutes.app.data.repository.SavedRoadRepository()
                                            val result = savedRoadRepository.uploadRoadPhoto(token, roadId, file, caption.takeIf { it.isNotBlank() })

                                            result.fold(
                                                onSuccess = { updatedRoad ->
                                                    val newPhoto = updatedRoad.photos?.lastOrNull()
                                                    if (newPhoto != null) {
                                                        onUploadSuccess(newPhoto)
                                                    } else {
                                                        onDismiss()
                                                    }
                                                },
                                                onFailure = { error ->
                                                    android.widget.Toast.makeText(
                                                        context,
                                                        "Failed to upload: ${error.message}",
                                                        android.widget.Toast.LENGTH_SHORT,
                                                    ).show()
                                                    isUploading = false
                                                },
                                            )
                                        }
                                    } catch (e: Exception) {
                                        android.widget.Toast.makeText(
                                            context,
                                            "Error: ${e.message}",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                        isUploading = false
                                    }
                                }
                            }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = selectedImageUri != null && !isUploading,
                    ) {
                        if (isUploading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Uploading...")
                        } else {
                            Icon(Icons.Default.Upload, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Upload")
                        }
                    }
                }
            }
        }
    }
}
