package com.scenicroutes.app.ui.screens.map

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog

@Composable
fun ReviewDialog(
    onDismiss: () -> Unit,
    onSubmit: (Int, String?) -> Unit,
    initialRating: Int? = null,
    initialComment: String? = null,
    isEdit: Boolean = false,
) {
    var rating by remember(initialRating) { mutableStateOf(initialRating ?: 0) }
    var comment by remember(initialComment) { mutableStateOf(initialComment ?: "") }
    var isSubmitting by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .fillMaxHeight(0.7f),
            shape = RoundedCornerShape(24.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = if (isEdit) "Edit Review" else "Add Review",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                HorizontalDivider()

                // Rating
                Text(
                    text = "Rating",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    repeat(5) { index ->
                        IconButton(
                            onClick = { rating = index + 1 },
                            modifier = Modifier.size(48.dp),
                        ) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = "${index + 1} stars",
                                modifier = Modifier.size(32.dp),
                                tint = if (index < rating) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                                },
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
                    minLines = 4,
                    maxLines = 6,
                    leadingIcon = {
                        Icon(Icons.Filled.Comment, contentDescription = null)
                    },
                    placeholder = {
                        Text("Share your experience with this road...")
                    },
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
                            if (rating > 0) {
                                isSubmitting = true
                                onSubmit(rating, comment.takeIf { it.isNotBlank() })
                            }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = rating > 0 && !isSubmitting,
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Submitting...")
                        } else {
                            Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (isEdit) "Update" else "Submit")
                        }
                    }
                }
            }
        }
    }
}
