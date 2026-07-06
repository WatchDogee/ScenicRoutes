package com.scenicroutes.app.ui.screens.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CollectionsBookmark
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import coil.compose.AsyncImage
import com.scenicroutes.app.data.model.User
import com.scenicroutes.app.ui.viewmodel.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(navController: NavController) {
    val context = LocalContext.current
    val viewModel: ProfileViewModel = viewModel { ProfileViewModel(context) }

    val user by viewModel.user.collectAsState()
    val isAuthenticated by viewModel.isAuthenticated.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isInitializing by viewModel.isInitializing.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val userStats by viewModel.userStats.collectAsState()
    val isPhotoUploading by viewModel.isPhotoUploading.collectAsState()
    val showEmailVerification by viewModel.showEmailVerification.collectAsState()
    val verificationEmail by viewModel.verificationEmail.collectAsState()

    LaunchedEffect(errorMessage) {
        // Errors are shown inline; placeholder kept for future snackbar use
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            if (navController.previousBackStackEntry != null) {
                                navController.popBackStack()
                            } else {
                                navController.navigate("map") {
                                    popUpTo(navController.graph.startDestinationId) { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                        },
                    ) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(padding),
        ) {
            // Show loading spinner while checking if user is already logged in
            if (isInitializing) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = androidx.compose.ui.Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            } else if (showEmailVerification && verificationEmail != null) {
                // Show email verification prompt when login fails due to unverified email
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    EmailVerificationPrompt(
                        userEmail = verificationEmail!!,
                        onVerificationComplete = {
                            viewModel.closeEmailVerification()
                        },
                    )
                    
                    TextButton(
                        onClick = {
                            viewModel.closeEmailVerification()
                        },
                        modifier = Modifier
                            .padding(top = 16.dp)
                            .align(Alignment.CenterHorizontally),
                    ) {
                        Text("Back to Login")
                    }
                }
            } else if (isAuthenticated && user != null) {
                AuthenticatedProfile(
                    user = user!!,
                    userStats = userStats,
                    onLogout = { viewModel.logout() },
                    onSettings = { navController.navigate("settings") },
                    onSubscription = { navController.navigate("subscription") },
                    onChangePhoto = { uri -> viewModel.uploadProfilePicture(uri) },
                    isPhotoUploading = isPhotoUploading,
                    navController = navController,
                )
            } else {
                LoginScreen(
                    onLogin = { email, password, rememberMe -> viewModel.login(email, password, rememberMe) },
                    onRegister = { username, name, email, password, rememberMe -> viewModel.register(username, name, email, password, rememberMe) },
                    isLoading = isLoading,
                    errorMessage = errorMessage,
                    onDismissError = { viewModel.clearError() },
                )
            }
        }
    }
}

@Composable
fun AuthenticatedProfile(
    user: User,
    userStats: Map<String, Any>?,
    onLogout: () -> Unit,
    onSettings: () -> Unit,
    onSubscription: () -> Unit,
    onChangePhoto: (android.net.Uri) -> Unit,
    isPhotoUploading: Boolean,
    navController: NavController,
) {
    var showAboutDialog by remember { mutableStateOf(false) }
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { onChangePhoto(it) }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer,
            ),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Card(
                    modifier = Modifier
                        .size(96.dp)
                        .clip(CircleShape)
                        .clickable { imagePicker.launch("image/*") },
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                    ),
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        user.profile_picture?.let { url ->
                            AsyncImage(
                                model = url,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop,
                            )
                        } ?: Icon(
                            Icons.Filled.Person,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }

                if (isPhotoUploading) {
                    Text(
                        text = "Uploading photo…",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f)
                    )
                }

                Text(
                    text = user.name,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        userStats?.let { stats ->
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f),
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "Statistics",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        stats["total_roads"]?.let {
                            val roadsValue = (it as? Number)?.toInt() ?: (it as? String)?.toIntOrNull() ?: 0
                            StatCard(modifier = Modifier.weight(1f), icon = Icons.Filled.Route, label = "Roads", value = "$roadsValue")
                        }
                        stats["total_reviews"]?.let {
                            val reviewsValue = (it as? Number)?.toInt() ?: (it as? String)?.toIntOrNull() ?: 0
                            StatCard(modifier = Modifier.weight(1f), icon = Icons.Filled.Star, label = "Reviews", value = "$reviewsValue")
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        stats["total_distance_km"]?.let {
                            val distanceKm = (it as? Number)?.toDouble() ?: 0.0
                            val distance = "${distanceKm.toInt()} km"
                            StatCard(modifier = Modifier.weight(1f), icon = Icons.Filled.Map, label = "Distance", value = distance)
                        }
                        stats["total_collections"]?.let {
                            val collectionsValue = (it as? Number)?.toInt() ?: (it as? String)?.toIntOrNull() ?: 0
                            StatCard(modifier = Modifier.weight(1f), icon = Icons.Filled.CollectionsBookmark, label = "Collections", value = "$collectionsValue")
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        ProfileMenuItem(
            icon = Icons.Filled.Route,
            title = "My Roads",
            subtitle = "View and manage your saved roads",
            onClick = { navController.navigate("trips") },
        )

        ProfileMenuItem(
            icon = Icons.Filled.Folder,
            title = "Manage My Collections",
            subtitle = "Organize roads into collections",
            onClick = { navController.navigate("my_collections") },
        )

        ProfileMenuItem(
            icon = Icons.Filled.Settings,
            title = "Settings",
            onClick = onSettings,
        )

        ProfileMenuItem(
            icon = Icons.Filled.Star,
            title = "Subscription",
            subtitle = "Manage your subscription",
            onClick = onSubscription,
        )

        ProfileMenuItem(
            icon = Icons.Filled.Info,
            title = "About",
            onClick = { showAboutDialog = true },
        )

        Divider(modifier = Modifier.padding(vertical = 8.dp))

        ProfileMenuItem(
            icon = Icons.Filled.Logout,
            title = "Logout",
            onClick = onLogout,
            textColor = MaterialTheme.colorScheme.error,
        )

        if (showAboutDialog) {
            AlertDialog(
                onDismissRequest = { showAboutDialog = false },
                title = { Text("About ScenicRoutes") },
                text = { Text("ScenicRoutes v1.0\n\nFind and explore scenic roads for your next adventure.") },
                confirmButton = {
                    TextButton(onClick = { showAboutDialog = false }) {
                        Text("OK")
                    }
                },
            )
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
fun ProfileMenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit,
    textColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag("profile_menu_item_${title.lowercase().replace(" ", "_")}"),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = textColor,
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = textColor,
                )
                subtitle?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun LoginScreen(
    onLogin: (String, String, Boolean) -> Unit,
    onRegister: (String, String, String, String, Boolean) -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onDismissError: () -> Unit = {},
) {
    var isLoginMode by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var passwordConfirm by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(true) }
    var showForgotPasswordDialog by remember { mutableStateOf(false) }
    var showResetPasswordDialog by remember { mutableStateOf(false) }
    var resetToken by remember { mutableStateOf("") }
    var resetEmail by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = if (isLoginMode) "Login" else "Register",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )

        if (!isLoginMode) {
            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("username_input"),
                singleLine = true,
            )
            
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Name") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("name_input"),
                singleLine = true,
            )
        }

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email or Username") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("email_input"),
            singleLine = true,
        )

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier
                .fillMaxWidth()
                .testTag("password_input"),
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
        )

        if (isLoginMode) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = rememberMe,
                    onCheckedChange = { rememberMe = it },
                )
                Text(
                    text = "Remember Me",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.clickable { rememberMe = !rememberMe },
                )
            }
        }

        if (!isLoginMode) {
            OutlinedTextField(
                value = passwordConfirm,
                onValueChange = { passwordConfirm = it },
                label = { Text("Confirm Password") },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("password_confirm_input"),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
            )
        }

        errorMessage?.let { error ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                ),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodySmall,
                    )
                    IconButton(onClick = onDismissError, modifier = Modifier.size(24.dp)) {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = "Dismiss",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onErrorContainer,
                        )
                    }
                }
            }
        }

        Button(
            onClick = {
                if (isLoginMode) {
                    onLogin(email, password, rememberMe)
                } else {
                    if (password == passwordConfirm) {
                        onRegister(username, name, email, password, rememberMe)
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .testTag(if (isLoginMode) "login_button" else "register_button"),
            enabled = !isLoading && (
                if (isLoginMode) {
                    email.isNotBlank() && password.isNotBlank()
                } else {
                    username.isNotBlank() && name.isNotBlank() && email.isNotBlank() && password.isNotBlank() && password == passwordConfirm
                }
                ),
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = MaterialTheme.colorScheme.onPrimary,
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(if (isLoginMode) "Login" else "Register")
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            if (isLoginMode) {
                TextButton(
                    onClick = { showForgotPasswordDialog = true },
                ) {
                    Text("Forgot Password?")
                }

                if (showForgotPasswordDialog) {
                    ForgotPasswordDialog(
                        onDismiss = { showForgotPasswordDialog = false },
                        onSuccess = {
                            showForgotPasswordDialog = false
                        },
                    )
                }

                if (showResetPasswordDialog && resetToken.isNotBlank() && resetEmail.isNotBlank()) {
                    ResetPasswordDialog(
                        email = resetEmail,
                        token = resetToken,
                        onDismiss = { showResetPasswordDialog = false },
                        onSuccess = {
                            showResetPasswordDialog = false
                        },
                    )
                }
            }
            TextButton(
                onClick = { isLoginMode = !isLoginMode },
                modifier = Modifier.testTag("toggle_login_register"),
            ) {
                Text(
                    text = if (isLoginMode) "Don't have an account? Register" else "Already have an account? Login",
                )
            }
        }
    }
}
