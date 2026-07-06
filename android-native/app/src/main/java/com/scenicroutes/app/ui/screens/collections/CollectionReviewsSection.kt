package com.scenicroutes.app.ui.screens.collections

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.api.ReviewRequest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun CollectionReviewsSection(
    collectionId: Long,
    modifier: Modifier = Modifier,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var reviews by remember { mutableStateOf<List<com.scenicroutes.app.data.model.Review>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddReviewDialog by remember { mutableStateOf(false) }

    LaunchedEffect(collectionId) {
        try {
            val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
            val response = apiService.getCollectionReviews(collectionId)
            if (response.isSuccessful && response.body() != null) {
                reviews = response.body()!!
            }
        } catch (e: Exception) {
            android.util.Log.e("CollectionReviews", "Error loading reviews: ${e.message}", e)
        }
        isLoading = false
    }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Reviews (${reviews.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            TextButton(onClick = { showAddReviewDialog = true }) {
                Text("Add Review")
            }
        }

        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.fillMaxWidth())
        } else if (reviews.isEmpty()) {
            Text(
                text = "No reviews yet. Be the first to review!",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            reviews.take(3).forEach { review ->
                ReviewCard(review = review)
            }
            if (reviews.size > 3) {
                TextButton(onClick = { /* Show all reviews */ }) {
                    Text("View All Reviews (${reviews.size})")
                }
            }
        }
    }

    if (showAddReviewDialog) {
        AddCollectionReviewDialog(
            collectionId = collectionId,
            onDismiss = { showAddReviewDialog = false },
            onReviewAdded = {
                showAddReviewDialog = false
                // Reload reviews
                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
                    try {
                        val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                        val response = apiService.getCollectionReviews(collectionId)
                        if (response.isSuccessful && response.body() != null) {
                            reviews = response.body()!!
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("CollectionReviews", "Error reloading reviews: ${e.message}", e)
                    }
                }
            },
        )
    }
}

@Composable
fun ReviewCard(review: com.scenicroutes.app.data.model.Review) {
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
                review.user?.let { user ->
                    Text(
                        text = user.name ?: "Anonymous",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
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
fun AddCollectionReviewDialog(
    collectionId: Long,
    onDismiss: () -> Unit,
    onReviewAdded: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var rating by remember { mutableStateOf(0) }
    var comment by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Review") },
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
                                val response = apiService.addCollectionReview(
                                    "Bearer $token",
                                    collectionId,
                                    ReviewRequest(
                                        rating = rating,
                                        comment = comment.takeIf { it.isNotBlank() },
                                    ),
                                )
                                if (response.isSuccessful) {
                                    onReviewAdded()
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("AddReview", "Error adding review: ${e.message}", e)
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
