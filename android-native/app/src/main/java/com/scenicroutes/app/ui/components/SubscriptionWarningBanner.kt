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
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * Warning banner displayed when subscription is expiring or expired
 */
@Composable
fun SubscriptionWarningBanner(
    subscriptionStatus: String?,
    expiresAt: String?,
    onRenew: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (subscriptionStatus == null || expiresAt == null) {
        return
    }

    val isExpired = subscriptionStatus == "expired" || subscriptionStatus == "cancelled"
    val isExpiring = !isExpired && expiresAt.isNotBlank()

    if (!isExpired && !isExpiring) {
        return
    }

    val daysRemaining = if (isExpiring) {
        try {
            val formatter = DateTimeFormatter.ISO_DATE_TIME
            val expireDate = LocalDate.parse(expiresAt.substringBefore('T'), DateTimeFormatter.ISO_DATE)
            val today = LocalDate.now()
            ChronoUnit.DAYS.between(today, expireDate).toInt()
        } catch (e: Exception) {
            null
        }
    } else {
        null
    }

    // Only show warning if expiring within 30 days (not a full year)
    if (isExpiring && daysRemaining != null && daysRemaining > 30) {
        return
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isExpired) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.tertiaryContainer
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
                imageVector = if (isExpired) Icons.Default.Warning else Icons.Default.Info,
                contentDescription = null,
                tint = if (isExpired) {
                    MaterialTheme.colorScheme.onErrorContainer
                } else {
                    MaterialTheme.colorScheme.onTertiaryContainer
                },
            )
            Column(
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = if (isExpired) {
                        "Subscription Expired"
                    } else {
                        "Subscription Expiring Soon"
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (isExpired) {
                        MaterialTheme.colorScheme.onErrorContainer
                    } else {
                        MaterialTheme.colorScheme.onTertiaryContainer
                    },
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isExpired) {
                        "Your subscription has expired. Renew to continue using premium features."
                    } else {
                        daysRemaining?.let {
                            when {
                                it <= 0 -> "Your subscription expires today."
                                it == 1 -> "Your subscription expires tomorrow."
                                else -> "Your subscription expires in $it days."
                            }
                        } ?: "Your subscription is expiring soon."
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isExpired) {
                        MaterialTheme.colorScheme.onErrorContainer
                    } else {
                        MaterialTheme.colorScheme.onTertiaryContainer
                    },
                )
            }
            Button(
                onClick = onRenew,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isExpired) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.tertiary
                    },
                ),
            ) {
                Text(if (isExpired) "Renew" else "Renew Now")
            }
        }
    }
}












