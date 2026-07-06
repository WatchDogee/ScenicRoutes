package com.scenicroutes.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResetPasswordDialog(
    email: String,
    token: String,
    onDismiss: () -> Unit,
    onSuccess: () -> Unit = {},
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var password by remember { mutableStateOf("") }
    var passwordConfirm by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Reset Password") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "Enter your new password",
                    style = MaterialTheme.typography.bodyMedium,
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("New Password") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    enabled = !isLoading,
                )

                OutlinedTextField(
                    value = passwordConfirm,
                    onValueChange = { passwordConfirm = it },
                    label = { Text("Confirm Password") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    enabled = !isLoading,
                    isError = password.isNotBlank() && passwordConfirm.isNotBlank() && password != passwordConfirm,
                )

                if (password.isNotBlank() && passwordConfirm.isNotBlank() && password != passwordConfirm) {
                    Text(
                        text = "Passwords do not match",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }

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
                    if (password.isBlank()) {
                        error = "Password cannot be empty"
                        return@Button
                    }
                    if (password.length < 8) {
                        error = "Password must be at least 8 characters"
                        return@Button
                    }
                    if (password != passwordConfirm) {
                        error = "Passwords do not match"
                        return@Button
                    }

                    isLoading = true
                    message = null
                    error = null
                    coroutineScope.launch {
                        try {
                            val apiService = NetworkModule.apiService
                            val response = apiService.resetPassword(
                                mapOf(
                                    "email" to email,
                                    "token" to token,
                                    "password" to password,
                                    "password_confirmation" to passwordConfirm,
                                ),
                            )
                            if (response.isSuccessful) {
                                val body = response.body()
                                message = if (body is Map<*, *>) {
                                    body["message"] as? String
                                } else {
                                    null
                                } ?: "Password reset successfully!"
                                onSuccess()
                                kotlinx.coroutines.delay(2000)
                                onDismiss()
                            } else {
                                val body = response.body()
                                error = if (body is Map<*, *>) {
                                    body["message"] as? String
                                } else {
                                    null
                                } ?: "Failed to reset password"
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("ResetPassword", "Error: ${e.message}", e)
                            error = "Error: ${e.message}"
                        } finally {
                            isLoading = false
                        }
                    }
                },
                enabled = !isLoading && password.isNotBlank() && passwordConfirm.isNotBlank() && password == passwordConfirm,
            ) {
                Text("Reset Password")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isLoading) {
                Text("Cancel")
            }
        },
    )
}
