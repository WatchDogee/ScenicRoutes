package com.scenicroutes.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordDialog(
    onDismiss: () -> Unit,
    onSuccess: () -> Unit = {},
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Forgot Password") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "Enter your email address and we'll send you a link to reset your password.",
                    style = MaterialTheme.typography.bodyMedium,
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                    enabled = !isLoading,
                )

                message?.let { msg ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    ) {
                        Text(
                            text = msg,
                            modifier = Modifier.padding(12.dp),
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }

                error?.let { err ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Text(
                            text = err,
                            modifier = Modifier.padding(12.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        )
                    }
                }

                if (isLoading) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (email.isNotBlank() && android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                        isLoading = true
                        message = null
                        error = null
                        coroutineScope.launch {
                            try {
                                val apiService = NetworkModule.apiService
                                val response = apiService.forgotPassword(mapOf("email" to email))
                                if (response.isSuccessful) {
                                    val body = response.body()
                                    message = if (body is Map<*, *>) {
                                        body["message"] as? String
                                    } else {
                                        null
                                    } ?: "Password reset link sent to your email!"
                                    onSuccess()
                                    kotlinx.coroutines.delay(2000)
                                    onDismiss()
                                } else {
                                    val body = response.body()
                                    error = if (body is Map<*, *>) {
                                        body["message"] as? String
                                    } else {
                                        null
                                    } ?: "Failed to send reset link"
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("ForgotPassword", "Error: ${e.message}", e)
                                error = "Error: ${e.message}"
                            } finally {
                                isLoading = false
                            }
                        }
                    } else {
                        error = "Please enter a valid email address"
                    }
                },
                enabled = !isLoading && email.isNotBlank(),
            ) {
                Text("Send Reset Link")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isLoading) {
                Text("Cancel")
            }
        },
    )
}
