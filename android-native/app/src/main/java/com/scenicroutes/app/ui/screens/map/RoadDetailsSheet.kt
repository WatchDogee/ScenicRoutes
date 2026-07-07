package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.Comment
import com.scenicroutes.app.data.model.Review
import com.scenicroutes.app.data.model.SavedRoad
import kotlinx.coroutines.flow.first

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoadDetailsSheet(
    road: SavedRoad,
    onDismiss: () -> Unit,
    onNavigate: () -> Unit = {},
    onSave: () -> Unit = {},
    onShare: () -> Unit = {},
    onShowOnMap: () -> Unit = {},
    onEdit: () -> Unit = {},
    reviews: List<Review> = emptyList(),
    comments: List<Comment> = emptyList(),
    onAddReview: ((Int, String?) -> Unit)? = null,
    onAddComment: ((String) -> Unit)? = null,
    navController: androidx.navigation.NavController? = null,
    currentUserId: Long? = null,
) {
    var selectedTab by remember { mutableStateOf(0) }
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
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = road.road_name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "${road.start_location} → ${road.end_location}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }

            Divider()
            
            // Creator/User Information
            road.user?.let { creator ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                    ),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Profile Picture
                        if (creator.profile_picture != null) {
                            AsyncImage(
                                model = creator.profile_picture,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop,
                            )
                        } else {
                            Surface(
                                modifier = Modifier.size(40.dp),
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primaryContainer,
                            ) {
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = creator.name.firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    )
                                }
                            }
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Created by",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = creator.name,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }
            
            // Road Description
            road.description?.takeIf { it.isNotBlank() }?.let { description ->
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Road Info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                road.distance?.let {
                    InfoCard(
                        icon = Icons.Default.Straighten,
                        label = "Distance",
                        value = com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(it),
                        modifier = Modifier.weight(1f),
                    )
                }
                road.duration?.let {
                    InfoCard(
                        icon = Icons.Default.AccessTime,
                        label = "Duration",
                        value = "${it / 60} min",
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            // Rating
            road.rating?.let { rating ->
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
                        fontWeight = FontWeight.Bold,
                    )
                    if (road.review_count > 0) {
                        Text(
                            text = "(${road.review_count} reviews)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            // Tags
            road.tags?.takeIf { it.isNotEmpty() }?.let { tags ->
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Tags",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        tags.forEach { tag ->
                            AssistChip(
                                onClick = { },
                                label = { Text(tag.name) },
                            )
                        }
                    }
                }
            }

            // Photos
            var photos by remember { mutableStateOf(road.photos ?: emptyList()) }
            var showPhotoUpload by remember { mutableStateOf(false) }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Photos (${photos.size})",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    // Upload button - only show if user owns the road
                    val context = androidx.compose.ui.platform.LocalContext.current
                    val tokenManager = com.scenicroutes.app.data.local.TokenManager(context)
                    var currentUserId by remember { mutableStateOf<Long?>(null) }
                    LaunchedEffect(Unit) {
                        currentUserId = tokenManager.userId.first()
                    }
                    if (currentUserId == road.user_id) {
                        TextButton(onClick = { showPhotoUpload = true }) {
                            Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Upload")
                        }
                    }
                }

                if (photos.isNotEmpty()) {
                    // Photo grid
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        itemsIndexed(photos) { index, photo ->
                            Card(
                                modifier = Modifier.size(120.dp),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                coil.compose.AsyncImage(
                                    model = photo.url,
                                    contentDescription = "Photo ${index + 1}",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                )
                            }
                        }
                    }
                } else {
                    Text(
                        text = "No photos yet",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            // Photo Upload Dialog
            if (showPhotoUpload) {
                PhotoUploadDialog(
                    roadId = road.id,
                    onDismiss = { showPhotoUpload = false },
                    onUploadSuccess = { uploadedPhoto ->
                        photos = photos + uploadedPhoto
                        showPhotoUpload = false
                    },
                )
            }

            Divider()

            // Tabs for Reviews, Comments, Statistics
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Reviews (${reviews.size})") },
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Comments (${comments.size})") },
                )
                Tab(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    text = { Text("Statistics") },
                )
            }

            // Tab content
            when (selectedTab) {
                0 -> ReviewsTab(
                    reviews = reviews,
                    currentUserId = currentUserId,
                    onAddReview = onAddReview,
                    navController = navController,
                )
                1 -> CommentsTab(
                    comments = comments,
                    onAddComment = onAddComment,
                    navController = navController,
                )
                2 -> StatisticsTab(road = road)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onShowOnMap,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Map, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Show on Map")
                }
                OutlinedButton(
                    onClick = onNavigate,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("road_details_navigate_button"),
                ) {
                    Icon(Icons.Default.Navigation, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Navigate")
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = onEdit,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Edit")
                }
                OutlinedButton(
                    onClick = onShare,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Share")
                }
            }
        }
    }
}

@Composable
fun ReviewsTab(
    reviews: List<Review>,
    currentUserId: Long?,
    onAddReview: ((Int, String?) -> Unit)?,
    navController: androidx.navigation.NavController? = null,
) {
    val userReview = remember(reviews, currentUserId) {
        currentUserId?.let { id ->
            reviews.firstOrNull { it.user_id == id }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 300.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (reviews.isEmpty()) {
            Text(
                text = "No reviews yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(16.dp),
            )
        } else {
            reviews.forEach { review ->
                ReviewCard(review = review, navController = navController)
            }
        }

        // Add Review Button
        onAddReview?.let { addReview ->
            var showReviewDialog by remember { mutableStateOf(false) }
            val isEditing = userReview != null

            Button(
                onClick = { showReviewDialog = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (isEditing) "Edit Your Review" else "Add Review")
            }

            if (showReviewDialog) {
                ReviewDialog(
                    onDismiss = { showReviewDialog = false },
                    onSubmit = { rating, comment ->
                        addReview(rating, comment)
                        showReviewDialog = false
                    },
                    initialRating = userReview?.rating,
                    initialComment = userReview?.comment,
                    isEdit = isEditing,
                )
            }
        }
    }
}

@Composable
fun CommentsTab(
    comments: List<Comment>,
    onAddComment: ((String) -> Unit)?,
    navController: androidx.navigation.NavController? = null,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = 300.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (comments.isEmpty()) {
            Text(
                text = "No comments yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(16.dp),
            )
        } else {
            comments.forEach { comment ->
                CommentCard(comment = comment, navController = navController)
            }
        }

        // Add Comment Button
        onAddComment?.let { addComment ->
            var showCommentDialog by remember { mutableStateOf(false) }

            Button(
                onClick = { showCommentDialog = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Comment, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add Comment")
            }

            if (showCommentDialog) {
                CommentDialog(
                    onDismiss = { showCommentDialog = false },
                    onSubmit = { comment ->
                        addComment(comment)
                        showCommentDialog = false
                    },
                )
            }
        }
    }
}

@Composable
fun StatisticsTab(road: SavedRoad) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Road Statistics
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            road.distance?.let {
                InfoCard(
                    icon = Icons.Default.Straighten,
                    label = "Total Distance",
                    value = com.scenicroutes.app.utils.DistanceFormatter.formatDistanceWithSettings(it),
                    modifier = Modifier.weight(1f),
                )
            }
            road.duration?.let {
                InfoCard(
                    icon = Icons.Default.AccessTime,
                    label = "Estimated Time",
                    value = "${it / 60} min",
                    modifier = Modifier.weight(1f),
                )
            }
        }

        // Additional stats would go here
        Text(
            text = "Created: ${road.created_at}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (road.is_public) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Public,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Public road",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
fun ReviewCard(
    review: Review,
    navController: androidx.navigation.NavController? = null,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    repeat(5) { index ->
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = if (index < review.rating) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                            },
                        )
                    }
                }
                review.user?.let { user ->
                    Text(
                        text = user.name,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = if (navController != null) {
                            Modifier.clickable {
                                android.util.Log.d("ReviewCard", "Navigating to user profile: userId=${review.user_id}")
                                navController.navigate("user_profile/${review.user_id}") {
                                    launchSingleTop = true
                                }
                            }
                        } else {
                            Modifier
                        },
                    )
                }
            }
            review.comment?.let { comment ->
                Text(
                    text = comment,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            Text(
                text = review.created_at,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun CommentCard(
    comment: Comment,
    navController: androidx.navigation.NavController? = null,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            comment.user?.let { user ->
                Text(
                    text = user.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = if (navController != null) {
                        Modifier.clickable {
                            android.util.Log.d("CommentCard", "Navigating to user profile: userId=${comment.user_id}")
                            navController.navigate("user_profile/${comment.user_id}") {
                                launchSingleTop = true
                            }
                        }
                    } else {
                        Modifier
                    },
                )
            }
            Text(
                text = comment.comment,
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                text = comment.created_at,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun InfoCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
