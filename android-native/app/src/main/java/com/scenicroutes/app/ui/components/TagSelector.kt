package com.scenicroutes.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.model.Tag

/**
 * Enhanced Tag Selector Component
 * Allows users to select multiple tags with search and filtering
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TagSelector(
    selectedTags: Set<Long>,
    onTagsChanged: (Set<Long>) -> Unit,
    modifier: Modifier = Modifier,
    availableTags: List<Tag>? = null,
    isLoading: Boolean = false,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var allTags by remember { mutableStateOf<List<Tag>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var showAllTags by remember { mutableStateOf(false) }

    // Load tags if not provided
    LaunchedEffect(Unit) {
        if (availableTags == null) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val response = apiService.getAllTags()
                if (response.isSuccessful && response.body() != null) {
                    allTags = response.body()!!
                }
            } catch (e: Exception) {
                android.util.Log.e("TagSelector", "Error loading tags: ${e.message}", e)
            }
        } else {
            allTags = availableTags
        }
    }

    val tagsToShow = if (availableTags != null) availableTags else allTags
    val filteredTags = tagsToShow.filter { tag ->
        searchQuery.isBlank() || tag.name.contains(searchQuery, ignoreCase = true)
    }

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Header with search
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Tags",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            TextButton(onClick = { showAllTags = !showAllTags }) {
                Text(if (showAllTags) "Show Less" else "Show All")
                Icon(
                    if (showAllTags) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            }
        }

        // Search field
        if (showAllTags) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search tags...") },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
            )
        }

        // Selected tags
        if (selectedTags.isNotEmpty()) {
            val selectedTagObjects = tagsToShow.filter { it.id in selectedTags }
            if (selectedTagObjects.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Selected (${selectedTagObjects.size})",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        items(selectedTagObjects) { tag ->
                            FilterChip(
                                selected = true,
                                onClick = {
                                    onTagsChanged(selectedTags - tag.id)
                                },
                                label = { Text(tag.name) },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Check,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp),
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                ),
                            )
                        }
                    }
                }
            }
        }

        // Available tags
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
            }
        } else if (showAllTags || selectedTags.isEmpty()) {
            if (filteredTags.isEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Default.Label,
                            contentDescription = null,
                            modifier = Modifier.size(32.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = if (searchQuery.isNotBlank()) "No tags found" else "No tags available",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = if (showAllTags) "Available Tags" else "Suggestions",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        filteredTags.forEach { tag ->
                            val isSelected = tag.id in selectedTags
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    if (isSelected) {
                                        onTagsChanged(selectedTags - tag.id)
                                    } else {
                                        onTagsChanged(selectedTags + tag.id)
                                    }
                                },
                                label = { Text(tag.name) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                ),
                            )
                        }
                    }
                }
            }
        }
    }
}
