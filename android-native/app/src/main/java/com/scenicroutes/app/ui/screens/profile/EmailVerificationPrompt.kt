package com.scenicroutes.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.launch

@Composable
fun EmailVerificationPrompt(
    userEmail: String,
    onVerificationComplete: () -> Unit = {},
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isResending by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f),
        ),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(
                    Icons.Default.Email,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Verify Your Email",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Please verify your email address.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            message?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }

            errorMessage?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        isResending = true
                        message = null
                        errorMessage = null
                        coroutineScope.launch {
                            try {
                                val apiService = NetworkModule.apiService
                                val response = apiService.resendVerificationEmailPublic(
                                    mapOf("email" to userEmail)
                                )
                                if (response.isSuccessful) {
                                    message = "Verification email sent! Please check your inbox."
                                    onVerificationComplete()
                                } else {
                                    errorMessage = "Failed to send verification email. Please try again."
                                }
                            } catch (e: Exception) {
                                errorMessage = "Error: ${e.message}"
                                android.util.Log.e("EmailVerification", "Error resending verification: ${e.message}", e)
                            } finally {
                                isResending = false
                            }
                        }
                    },
                    enabled = !isResending,
                    modifier = Modifier.weight(1f),
                ) {
                    if (isResending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text("Resend Verification Email")
                }
            }
        }
    }
}
