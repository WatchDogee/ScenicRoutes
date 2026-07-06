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
import java.io.File

@Composable
fun PhotoUploadButton(
    onPhotoSelected: (File) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
    ) { uri: Uri? ->
        uri?.let {
            selectedImageUri = it
            // Convert URI to File - this is simplified, you may need to handle content URIs properly
            val file = File(it.path ?: "")
            if (file.exists()) {
                onPhotoSelected(file)
            }
        }
    }

    Button(
        onClick = { launcher.launch("image/*") },
        modifier = modifier,
        enabled = enabled,
    ) {
        Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text("Upload Photo")
    }
}
















