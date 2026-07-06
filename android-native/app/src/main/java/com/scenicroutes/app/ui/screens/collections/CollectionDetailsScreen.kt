package com.scenicroutes.app.ui.screens.collections

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.ui.viewmodel.CollectionViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollectionDetailsScreen(
    collectionId: Long,
    navController: NavController,
    onNavigateBack: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val viewModel: CollectionViewModel = viewModel(
        factory = androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.getInstance(
            context.applicationContext as android.app.Application,
        ),
    )

    var collection by remember { mutableStateOf<Collection?>(null) }
    var currentUserId by remember { mutableStateOf<Long?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddRoadsDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showShareDialog by remember { mutableStateOf(false) }

    LaunchedEffect(collectionId) {
        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
        val token = tokenManager.token.first()
        if (token != null) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService

                // Load collection
                val collResponse = apiService.getCollection("Bearer $token", collectionId)
                if (collResponse.isSuccessful && collResponse.body() != null) {
                    collection = collResponse.body()!!
                }

                // Load current user to check ownership
                val userResponse = apiService.getUser("Bearer $token")
                if (userResponse.isSuccessful && userResponse.body() != null) {
                    currentUserId = userResponse.body()!!.id
                }
            } catch (e: Exception) {
                android.util.Log.e(
                    "CollectionDetails",
                    "Error loading collection: ${e.message}",
                    e,
                )
            }
        }
        isLoading = false
    }

    val isOwner = collection?.user_id == currentUserId
    android.util.Log.d(
        "CollectionDetails",
        "Collection user_id=${collection?.user_id}, Current user_id=$currentUserId, " +
            "Is owner=$isOwner",
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(collection?.name ?: "Collection") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    collection?.let { _ ->
                        if (isOwner) {
                            IconButton(onClick = { showEditDialog = true }) {
                                Icon(Icons.Default.Edit, contentDescription = "Edit")
                            }
                        }
                        IconButton(onClick = {
                            showShareDialog = true
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Share")
                        }
                    }
                },
            )
        },
        floatingActionButton = {
            if (isOwner) {
                FloatingActionButton(
                    onClick = { showAddRoadsDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Roads")
                }
            }
        },
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        } else if (collection != null) {
            CollectionDetailsContent(
                collection = collection!!,
                onCollectionUpdated = { updatedCollection ->
                    collection = updatedCollection
                },
                onRoadClick = { road ->
                    // Navigate to road details or map
                    navController.navigate("map")
                },
                onRemoveRoad = { roadId ->
                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                    kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
                        val token = tokenManager.token.first()
                        if (token != null) {
                            try {
                                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                val response = apiService.removeRoadFromCollection("Bearer $token", collection!!.id, roadId)
                                if (response.isSuccessful) {
                                    // Reload collection
                                    val reloadResponse = apiService.getCollection("Bearer $token", collectionId)
                                    if (reloadResponse.isSuccessful && reloadResponse.body() != null) {
                                        collection = reloadResponse.body()!!
                                    }
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("CollectionDetails", "Error removing road: ${e.message}", e)
                            }
                        }
                    }
                },
                modifier = Modifier.padding(padding),
            )
        }
    }

    // Add Roads Dialog
    if (showAddRoadsDialog && collection != null) {
        AddRoadsToCollectionDialog(
            collection = collection!!,
            onDismiss = { showAddRoadsDialog = false },
            onAddRoads = { roadIds ->
                val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
                    val token = tokenManager.token.first()
                    android.util.Log.d("CollectionDetails", "Add roads: token = ${if (token != null) "present" else "null"}, roadIds = $roadIds")
                    if (token != null) {
                        try {
                            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                            android.util.Log.d("CollectionDetails", "Calling addRoadsToCollection with Bearer token and ${roadIds.size} roads")
                            val addResponse = apiService.addRoadsToCollection(
                                "Bearer $token",
                                collection!!.id,
                                com.scenicroutes.app.data.api.AddRoadsRequest(roadIds),
                            )
                            android.util.Log.d("CollectionDetails", "addRoadsToCollection response: ${addResponse.code()} ${addResponse.message()}")
                            if (addResponse.isSuccessful) {
                                android.util.Log.d("CollectionDetails", "Roads added successfully, refreshing collection")
                                // Refresh collection to ensure UI reflects server state
                                val refresh = apiService.getCollection("Bearer $token", collection!!.id)
                                if (refresh.isSuccessful && refresh.body() != null) {
                                    collection = refresh.body()!!
                                    showAddRoadsDialog = false
                                    android.util.Log.d("CollectionDetails", "Collection refreshed with ${collection?.roads?.size ?: 0} roads")
                                } else {
                                    android.util.Log.w("CollectionDetails", "Added roads but failed to refresh collection: ${refresh.code()} ${refresh.message()}")
                                    showAddRoadsDialog = false
                                }
                            } else {
                                val err = addResponse.errorBody()?.string()
                                android.util.Log.e("CollectionDetails", "Failed to add roads: ${addResponse.code()} ${addResponse.message()} Body: $err")
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("CollectionDetails", "Error adding roads: ${e.message}", e)
                        }
                    } else {
                        android.util.Log.e("CollectionDetails", "Cannot add roads: token is null")
                    }
                }
            },
        )
    }

    // Edit Dialog
    if (showEditDialog && collection != null) {
        com.scenicroutes.app.ui.screens.explore.EditCollectionDialog(
            collection = collection!!,
            onDismiss = { showEditDialog = false },
            onSave = { name, description, isPublic ->
                viewModel.updateCollection(collection!!.id, name, description, isPublic)
                showEditDialog = false
                // Reload collection
                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                    val token = tokenManager.token.first()
                    if (token != null) {
                        val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                        val response = apiService.getCollection("Bearer $token", collectionId)
                        if (response.isSuccessful && response.body() != null) {
                            collection = response.body()!!
                        }
                    }
                }
            },
        )
    }

    // Share Dialog with QR Code
    if (showShareDialog && collection != null) {
        ShareCollectionDialog(
            collection = collection!!,
            onDismiss = { showShareDialog = false },
        )
    }
}

@Composable
fun CollectionDetailsContent(
    collection: Collection,
    onCollectionUpdated: (Collection) -> Unit,
    onRoadClick: (SavedRoad) -> Unit,
    onRemoveRoad: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val viewModel: CollectionViewModel = viewModel(
        factory = androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.getInstance(
            context.applicationContext as android.app.Application,
        ),
    )
    
    var showReviewDialog by remember { mutableStateOf(false) }
    var selectedRoadForReview by remember { mutableStateOf<SavedRoad?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Cover Image with Upload
        var showCoverImagePicker by remember { mutableStateOf(false) }
        var isUploadingCover by remember { mutableStateOf(false) }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clickable { showCoverImagePicker = true },
            shape = RoundedCornerShape(12.dp),
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                collection.cover_image_url?.let { coverUrl ->
                    AsyncImage(
                        model = coverUrl,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                    )
                } ?: run {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(
                                Icons.Default.Image,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = "Tap to add cover image",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                if (isUploadingCover) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.7f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
            }
        }

        // Cover Image Picker
        val localContext = context
        val localViewModel = viewModel
        val localCoroutineScope = coroutineScope
        if (showCoverImagePicker) {
            val launcher = rememberLauncherForActivityResult(
                contract = androidx.activity.result.contract.ActivityResultContracts.GetContent(),
            ) { uri: android.net.Uri? ->
                uri?.let { selectedUri ->
                    isUploadingCover = true
                    localCoroutineScope.launch {
                        try {
                            val tokenManager = com.scenicroutes.app.data.local.TokenManager(localContext)
                            val token = tokenManager.token.first()
                            if (token != null) {
                                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService

                                // Read file and create multipart
                                val inputStream = localContext.contentResolver.openInputStream(selectedUri)
                                val fileBytes = inputStream?.readBytes()
                                inputStream?.close()

                                if (fileBytes != null) {
                                    val mediaType = "image/*".toMediaTypeOrNull() ?: "image/jpeg".toMediaTypeOrNull()
                                    val requestFile = fileBytes.toRequestBody(mediaType)
                                    val photoPart = okhttp3.MultipartBody.Part.createFormData(
                                        "photo",
                                        "cover.jpg",
                                        requestFile,
                                    )

                                    val response = apiService.uploadCollectionCoverImage(
                                        "Bearer $token",
                                        collection.id,
                                        photoPart,
                                    )

                                    if (response.isSuccessful && response.body() != null) {
                                        // Reload collection data
                                        val reloadResponse = apiService.getCollection("Bearer $token", collection.id)
                                        if (reloadResponse.isSuccessful && reloadResponse.body() != null) {
                                            onCollectionUpdated(reloadResponse.body()!!)
                                        }
                                        android.widget.Toast.makeText(
                                            localContext,
                                            "Cover image uploaded successfully",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    } else {
                                        android.widget.Toast.makeText(
                                            localContext,
                                            "Failed to upload cover image",
                                            android.widget.Toast.LENGTH_SHORT,
                                        ).show()
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("CollectionDetails", "Error uploading cover image: ${e.message}", e)
                            android.widget.Toast.makeText(
                                localContext,
                                "Error: ${e.message}",
                                android.widget.Toast.LENGTH_SHORT,
                            ).show()
                        } finally {
                            isUploadingCover = false
                            showCoverImagePicker = false
                        }
                    }
                }
            }

            LaunchedEffect(Unit) {
                launcher.launch("image/*")
            }
        }

        // Collection Info
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = collection.name,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            collection.description?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Route, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${collection.road_count} roads")
                }
                collection.rating?.let {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(String.format("%.1f", it))
                    }
                }
            }
        }

        Divider()

        // Collection Reviews Section
        CollectionReviewsSection(
            collectionId = collection.id,
            modifier = Modifier.fillMaxWidth(),
        )

        Divider()

        // Roads List
        Text(
            text = "Roads in Collection",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )

        if (collection.roads.isNullOrEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.Default.Route,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = "No roads in this collection yet",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else {
            val context = androidx.compose.ui.platform.LocalContext.current
            // Use regular items in the Column instead of nested LazyColumn
            collection.roads!!.forEach { road ->
                CollectionRoadCard(
                    road = road,
                    onClick = { onRoadClick(road) },
                    onRemove = { onRemoveRoad(road.id) },
                    onViewOnMap = {
                        // Navigate to map with road highlighted
                        onRoadClick(road)
                    },
                    onNavigate = {
                        // TODO: Implement in-app turn-by-turn navigation (Premium feature)
                        android.widget.Toast.makeText(context, "Turn-by-turn navigation available in Premium tier", android.widget.Toast.LENGTH_SHORT).show()
                    },
                    onReview = {
                        // Open review dialog
                        selectedRoadForReview = road
                        showReviewDialog = true
                    },
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
    
    // Review Dialog
    if (showReviewDialog && selectedRoadForReview != null) {
        var rating by remember { mutableStateOf(5) }
        var reviewText by remember { mutableStateOf("") }
        var isSubmitting by remember { mutableStateOf(false) }
        
        AlertDialog(
            onDismissRequest = { 
                showReviewDialog = false
                selectedRoadForReview = null
            },
            title = { Text("Review ${selectedRoadForReview!!.road_name}") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Rating:", style = MaterialTheme.typography.titleSmall)
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        (1..5).forEach { star ->
                            IconButton(onClick = { rating = star }) {
                                Icon(
                                    if (star <= rating) Icons.Default.Star else Icons.Default.StarOutline,
                                    contentDescription = "$star stars",
                                    tint = if (star <= rating) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                    
                    OutlinedTextField(
                        value = reviewText,
                        onValueChange = { reviewText = it },
                        label = { Text("Your Review") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        maxLines = 5,
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
                            if (token != null) {
                                try {
                                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                                    val response = apiService.addReview(
                                        "Bearer $token",
                                        selectedRoadForReview!!.id,
                                        com.scenicroutes.app.data.api.ReviewRequest(
                                            rating = rating,
                                            comment = reviewText,
                                        ),
                                    )
                                    if (response.isSuccessful) {
                                        android.widget.Toast.makeText(context, "Review submitted!", android.widget.Toast.LENGTH_SHORT).show()
                                        showReviewDialog = false
                                        selectedRoadForReview = null
                                    } else {
                                        android.widget.Toast.makeText(context, "Failed to submit review", android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("ReviewDialog", "Error: ${e.message}", e)
                                    android.widget.Toast.makeText(context, "Error: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSubmitting = false
                                }
                            }
                        }
                    },
                    enabled = !isSubmitting && reviewText.isNotBlank(),
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text("Submit")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showReviewDialog = false
                    selectedRoadForReview = null
                }) {
                    Text("Cancel")
                }
            },
        )
    }
}

@Composable
fun CollectionRoadCard(
    road: SavedRoad,
    onClick: () -> Unit,
    onRemove: () -> Unit,
    onViewOnMap: () -> Unit = {},
    onNavigate: () -> Unit = {},
    onReview: () -> Unit = {},
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = road.road_name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "${road.start_location} → ${road.end_location}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        road.distance?.let {
                            Text(
                                text = com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(it),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        road.average_rating?.let {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp),
                            ) {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                                Text(
                                    text = String.format("%.1f", it),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Remove",
                        tint = MaterialTheme.colorScheme.error,
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onViewOnMap,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp),
                ) {
                    Icon(
                        Icons.Default.Map,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Map", style = MaterialTheme.typography.bodySmall)
                }
                
                OutlinedButton(
                    onClick = onNavigate,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp),
                ) {
                    Icon(
                        Icons.Default.Navigation,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Navigate", style = MaterialTheme.typography.bodySmall)
                }
                
                OutlinedButton(
                    onClick = onReview,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp),
                ) {
                    Icon(
                        Icons.Default.RateReview,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Review", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
fun AddRoadsToCollectionDialog(
    collection: Collection,
    onDismiss: () -> Unit,
    onAddRoads: (List<Long>) -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var availableRoads by remember { mutableStateOf<List<SavedRoad>>(emptyList()) }
    var selectedRoadIds by remember { mutableStateOf<Set<Long>>(emptySet()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
        val token = tokenManager.token.first()
        if (token != null) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val response = apiService.getSavedRoads("Bearer $token")
                if (response.isSuccessful && response.body() != null) {
                    val allRoads = response.body()!!
                    val collectionRoadIds = collection.roads?.map { it.id }?.toSet() ?: emptySet()
                    availableRoads = allRoads.filter { it.id !in collectionRoadIds }
                }
            } catch (e: Exception) {
                android.util.Log.e("AddRoadsDialog", "Error loading roads: ${e.message}", e)
            }
        }
        isLoading = false
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Roads to Collection") },
        text = {
            if (isLoading) {
                CircularProgressIndicator()
            } else {
                LazyColumn(
                    modifier = Modifier.height(400.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(availableRoads) { road ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedRoadIds = if (road.id in selectedRoadIds) {
                                        selectedRoadIds - road.id
                                    } else {
                                        selectedRoadIds + road.id
                                    }
                                },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(
                                checked = road.id in selectedRoadIds,
                                onCheckedChange = {
                                    selectedRoadIds = if (road.id in selectedRoadIds) {
                                        selectedRoadIds - road.id
                                    } else {
                                        selectedRoadIds + road.id
                                    }
                                },
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(road.road_name, style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    text = "${road.start_location} → ${road.end_location}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onAddRoads(selectedRoadIds.toList())
                },
                enabled = selectedRoadIds.isNotEmpty(),
            ) {
                Text("Add ${selectedRoadIds.size} Road(s)")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}
