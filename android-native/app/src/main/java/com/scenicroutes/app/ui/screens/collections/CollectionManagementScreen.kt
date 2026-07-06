package com.scenicroutes.app.ui.screens.collections

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.ui.viewmodel.CollectionViewModel
import kotlinx.coroutines.flow.first

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CollectionManagementScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val viewModel: CollectionViewModel = viewModel()
    val collections by viewModel.collections.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }
    var currentUserId by remember { mutableStateOf<Long?>(null) }

    LaunchedEffect(Unit) {
        // Load current user ID for client-side filtering (defense-in-depth)
        val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
        val token = tokenManager.token.first()
        if (token != null) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val userResponse = apiService.getUser("Bearer $token")
                if (userResponse.isSuccessful && userResponse.body() != null) {
                    currentUserId = userResponse.body()!!.id
                }
            } catch (e: Exception) {
                android.util.Log.e("CollectionManagement", "Error loading current user: ${e.message}")
            }
        }
        viewModel.loadCollections()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Collections") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showCreateDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Create Collection")
                    }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Collection")
            }
        },
    ) { padding ->
        when {
            isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            errorMessage != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(
                            Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.error,
                        )
                        Text(
                            text = errorMessage ?: "Unknown error",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Button(onClick = { viewModel.loadCollections() }) {
                            Icon(Icons.Default.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Retry")
                        }
                    }
                }
            }
            collections.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Icon(
                            Icons.Default.Folder,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = "No collections",
                            style = MaterialTheme.typography.titleLarge,
                        )
                        Text(
                            text = "Create a collection to organize your favorite roads",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Button(onClick = { showCreateDialog = true }) {
                            Text("Create Collection")
                        }
                    }
                }
            }
            else -> {
                // Filter collections to only show current user's collections (defense-in-depth)
                val filteredCollections = if (currentUserId != null) {
                    collections.filter { it.user_id == currentUserId }
                } else {
                    collections
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(filteredCollections) { collection ->
                        CollectionCard(
                            collection = collection,
                            onEdit = {
                                // TODO: Implement edit collection dialog
                            },
                            onDelete = { viewModel.deleteCollection(collection.id) },
                            onClick = { 
                                navController.navigate("collection/${collection.id}")
                            },
                        )
                    }
                }
            }
        }

        // Create/Edit Dialog
        if (showCreateDialog) {
            CreateCollectionDialog(
                onDismiss = { showCreateDialog = false },
                onCreate = { name, description, isPublic ->
                    viewModel.createCollection(name, description, isPublic)
                    showCreateDialog = false
                },
            )
        }
    }
}

@Composable
fun CollectionCard(
    collection: Collection,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onClick: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(
                modifier = Modifier.size(60.dp),
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Folder,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = collection.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                collection.description?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                    )
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Route,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${collection.road_count} roads",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    if (collection.is_public) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Public,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Public",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }

            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More")
                }
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false },
                ) {
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        onClick = {
                            onEdit()
                            showMenu = false
                        },
                        leadingIcon = {
                            Icon(Icons.Default.Edit, contentDescription = null)
                        },
                    )
                    DropdownMenuItem(
                        text = { Text("Delete") },
                        onClick = {
                            onDelete()
                            showMenu = false
                        },
                        leadingIcon = {
                            Icon(Icons.Default.Delete, contentDescription = null)
                        },
                    )
                }
            }
        }
    }
}

@Composable
fun CreateCollectionDialog(
    onDismiss: () -> Unit,
    onCreate: (String, String?, Boolean) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var isPublic by remember { mutableStateOf(true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Collection") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Make Public")
                    Switch(
                        checked = isPublic,
                        onCheckedChange = { isPublic = it },
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(name, description.ifBlank { null }, isPublic) },
                enabled = name.isNotBlank(),
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}
