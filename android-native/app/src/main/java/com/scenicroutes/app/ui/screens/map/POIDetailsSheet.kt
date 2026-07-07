package com.scenicroutes.app.ui.screens.map

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.POI
import com.scenicroutes.app.data.model.POIType
import com.scenicroutes.app.data.model.Review
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POIDetailsSheet(
    poi: POI,
    onDismiss: () -> Unit,
    onNavigate: () -> Unit = {},
    onAddToRoute: () -> Unit = {},
    onSave: (Boolean) -> Unit = {},
    onReview: () -> Unit = {},
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isSaving by remember { mutableStateOf(false) }
    var isSaved by remember { mutableStateOf(poi.is_saved) }
    var showPOIReviewDialog by remember { mutableStateOf(false) }
    var poiReviews by remember { mutableStateOf<List<com.scenicroutes.app.data.model.Review>>(emptyList()) }

    // Load POI reviews
    LaunchedEffect(poi.id) {
        poi.id?.let { poiId ->
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val response = apiService.getPOIReviews(poiId)
                if (response.isSuccessful && response.body() != null) {
                    poiReviews = response.body()!!
                }
            } catch (e: Exception) {
                android.util.Log.e("POIDetails", "Error loading reviews: ${e.message}", e)
            }
        }
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxHeight(0.8f),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        imageVector = when (poi.type) {
                            POIType.TOURISM -> Icons.Default.Place
                            POIType.FUEL -> Icons.Default.LocalGasStation
                            POIType.CHARGING -> Icons.Default.ElectricCar
                        },
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column {
                        Text(
                            text = poi.name,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = when (poi.type) {
                                POIType.TOURISM -> "Tourism"
                                POIType.FUEL -> "Fuel Station"
                                POIType.CHARGING -> "EV Charging"
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            Divider()

            // Address
            poi.address?.let { address ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = address,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            // Description
            poi.description?.let { description ->
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Rating and Review Count
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                poi.rating?.let { rating ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            text = String.format("%.1f", rating),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        if (poi.review_count > 0) {
                            Text(
                                text = "(${poi.review_count} reviews)",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                IconButton(
                    onClick = {
                        coroutineScope.launch {
                            try {
                                isSaving = true
                                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                val token = tokenManager.token.first()
                                if (token != null) {
                                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                    if (isSaved) {
                                        apiService.unsavePOI("Bearer $token", poi.id ?: 0L)
                                    } else {
                                        apiService.savePOI("Bearer $token", poi.id ?: 0L)
                                    }
                                    isSaved = !isSaved
                                    onSave(isSaved)
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("POIDetails", "Error saving POI: ${e.message}", e)
                            } finally {
                                isSaving = false
                            }
                        }
                    },
                    enabled = !isSaving && poi.id != null,
                ) {
                    Icon(
                        if (isSaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                        contentDescription = if (isSaved) "Unsave POI" else "Save POI",
                        tint = if (isSaved) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // Photos
            var poiPhotos by remember { mutableStateOf(poi.photos ?: emptyList()) }
            var showPhotoUploadDialog by remember { mutableStateOf(false) }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Photos (${poiPhotos.size})",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (poi.id != null) {
                        TextButton(onClick = { showPhotoUploadDialog = true }) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Photo")
                        }
                    }
                }
                if (poiPhotos.isNotEmpty()) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        itemsIndexed(poiPhotos) { index, photo ->
                            Card(
                                modifier = Modifier.size(120.dp),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                AsyncImage(
                                    model = photo.url,
                                    contentDescription = "Photo ${index + 1}",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop,
                                )
                            }
                        }
                    }
                } else if (poi.id != null) {
                    TextButton(onClick = { showPhotoUploadDialog = true }) {
                        Text("Be the first to add a photo")
                    }
                }
            }

            // Photo Upload Dialog
            if (showPhotoUploadDialog && poi.id != null) {
                POIPhotoUploadDialog(
                    poiId = poi.id!!,
                    onDismiss = { showPhotoUploadDialog = false },
                    onPhotoUploaded = {
                        showPhotoUploadDialog = false
                        // Reload POI photos
                        coroutineScope.launch {
                            try {
                                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                val response = apiService.getPOI(poi.id!!)
                                if (response.isSuccessful && response.body() != null) {
                                    poiPhotos = response.body()!!.photos ?: emptyList()
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("POIDetails", "Error reloading photos: ${e.message}", e)
                            }
                        }
                    },
                )
            }

            // Reviews Section
            val allReviews = poiReviews.ifEmpty { poi.reviews ?: emptyList() }
            if (allReviews.isNotEmpty() || poi.id != null) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Reviews (${allReviews.size})",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                        )
                        if (poi.id != null) {
                            TextButton(onClick = { showPOIReviewDialog = true }) {
                                Text("Add Review")
                            }
                        }
                    }
                    if (allReviews.isNotEmpty()) {
                        allReviews.take(3).forEach { review ->
                            ReviewItem(review = review)
                        }
                        if (allReviews.size > 3) {
                            TextButton(onClick = { showPOIReviewDialog = true }) {
                                Text("View All Reviews")
                            }
                        }
                    } else if (poi.id != null) {
                        TextButton(onClick = { showPOIReviewDialog = true }) {
                            Text("Be the first to review")
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onNavigate,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Navigate")
                }
                Button(
                    onClick = onAddToRoute,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add to Route")
                }
            }
        }
    }

    // POI Review Dialog
    if (showPOIReviewDialog && poi.id != null) {
        AddPOIReviewDialog(
            poiId = poi.id!!,
            onDismiss = { showPOIReviewDialog = false },
            onReviewAdded = {
                showPOIReviewDialog = false
                // Reload reviews
                coroutineScope.launch {
                    try {
                        val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                        val response = apiService.getPOIReviews(poi.id!!)
                        if (response.isSuccessful && response.body() != null) {
                            poiReviews = response.body()!!
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("POIDetails", "Error reloading reviews: ${e.message}", e)
                    }
                }
            },
        )
    }
}

@Composable
fun AddPOIReviewDialog(
    poiId: Long,
    onDismiss: () -> Unit,
    onReviewAdded: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var rating by remember { mutableStateOf(0) }
    var comment by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add POI Review") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Rating selector
                Text("Rating")
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    repeat(5) { index ->
                        IconButton(onClick = { rating = index + 1 }) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = if (index < rating) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f),
                            )
                        }
                    }
                }

                // Comment
                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    label = { Text("Comment (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 4,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    isSubmitting = true
                    coroutineScope.launch {
                        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                        val token = tokenManager.token.first()
                        if (token != null && rating > 0) {
                            try {
                                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                val response = apiService.addPOIReview(
                                    "Bearer $token",
                                    poiId,
                                    com.scenicroutes.app.data.api.ReviewRequest(
                                        rating = rating,
                                        comment = comment.takeIf { it.isNotBlank() },
                                    ),
                                )
                                if (response.isSuccessful) {
                                    onReviewAdded()
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("AddPOIReview", "Error adding review: ${e.message}", e)
                            }
                        }
                        isSubmitting = false
                    }
                },
                enabled = rating > 0 && !isSubmitting,
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                } else {
                    Text("Submit")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}

@Composable
fun ReviewItem(review: Review) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    review.user?.let { user ->
                        Text(
                            text = user.name ?: "Anonymous",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    repeat(review.rating) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
            review.comment?.let { comment ->
                Text(
                    text = comment,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
fun POIPhotoUploadDialog(
    poiId: Long,
    onDismiss: () -> Unit,
    onPhotoUploaded: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var selectedImageUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var caption by remember { mutableStateOf("") }
    var isUploading by remember { mutableStateOf(false) }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.GetContent(),
    ) { uri: android.net.Uri? ->
        selectedImageUri = uri
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Upload POI Photo") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (selectedImageUri == null) {
                    Button(onClick = { imagePickerLauncher.launch("image/*") }) {
                        Icon(Icons.Default.Photo, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Select Photo")
                    }
                } else {
                    AsyncImage(
                        model = selectedImageUri,
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentScale = ContentScale.Crop,
                    )
                    OutlinedTextField(
                        value = caption,
                        onValueChange = { caption = it },
                        label = { Text("Caption (optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2,
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    selectedImageUri?.let { uri ->
                        isUploading = true
                        coroutineScope.launch {
                            try {
                                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                                val token = tokenManager.token.first()
                                if (token != null) {
                                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                    val inputStream = context.contentResolver.openInputStream(uri)
                                    val file = java.io.File(context.cacheDir, "poi_photo_${System.currentTimeMillis()}.jpg")
                                    inputStream?.use { stream ->
                                        file.outputStream().use { output ->
                                            stream.copyTo(output)
                                        }
                                    }
                                    val imageMediaType = "image/*".toMediaTypeOrNull() ?: throw IllegalArgumentException("Invalid media type")
                                    val fileBytes = file.readBytes()
                                    val requestFile = fileBytes.toRequestBody(imageMediaType)
                                    val photoPart = okhttp3.MultipartBody.Part.createFormData("photo", file.name, requestFile)
                                    val captionPart = caption.takeIf { it.isNotBlank() }?.let {
                                        val textMediaType = "text/plain".toMediaTypeOrNull()
                                        it.toRequestBody(textMediaType)
                                    }
                                    val response = apiService.uploadPOIPhoto("Bearer $token", poiId, photoPart, captionPart)
                                    if (response.isSuccessful) {
                                        onPhotoUploaded()
                                    }
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("POIPhotoUpload", "Error uploading photo: ${e.message}", e)
                            } finally {
                                isUploading = false
                            }
                        }
                    }
                },
                enabled = selectedImageUri != null && !isUploading,
            ) {
                if (isUploading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                } else {
                    Text("Upload")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}
