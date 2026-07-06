package com.scenicroutes.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * Warning banner displayed when user is approaching or has reached route calculation limits
 */
@Composable
fun RouteLimitWarning(
    currentUsage: Int,
    limit: Int?,
    onUpgrade: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (limit == null) {
        // Unlimited - no warning needed
        return
    }

    val usagePercentage = if (limit > 0) (currentUsage.toFloat() / limit.toFloat()) else 0f
    val isNearLimit = usagePercentage >= 0.8f && usagePercentage < 1.0f
    val isAtLimit = usagePercentage >= 1.0f

    if (!isNearLimit && !isAtLimit) {
        // Not near limit - no warning needed
        return
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when {
                isAtLimit -> MaterialTheme.colorScheme.errorContainer
                else -> MaterialTheme.colorScheme.tertiaryContainer
            },
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (isAtLimit) Icons.Default.Warning else Icons.Default.Info,
                contentDescription = null,
                tint = if (isAtLimit) {
                    MaterialTheme.colorScheme.onErrorContainer
                } else {
                    MaterialTheme.colorScheme.onTertiaryContainer
                },
            )
            Column(
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = if (isAtLimit) {
                        "Route Limit Reached"
                    } else {
                        "Approaching Route Limit"
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (isAtLimit) {
                        MaterialTheme.colorScheme.onErrorContainer
                    } else {
                        MaterialTheme.colorScheme.onTertiaryContainer
                    },
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isAtLimit) {
                        "You've used all $limit route calculations. Upgrade to continue."
                    } else {
                        "You've used $currentUsage of $limit route calculations (${(usagePercentage * 100).toInt()}%)."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isAtLimit) {
                        MaterialTheme.colorScheme.onErrorContainer
                    } else {
                        MaterialTheme.colorScheme.onTertiaryContainer
                    },
                )
            }
            Button(
                onClick = onUpgrade,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isAtLimit) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.tertiary
                    },
                ),
            ) {
                Text("Upgrade")
            }
        }
    }
}












