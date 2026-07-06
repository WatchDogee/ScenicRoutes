package com.scenicroutes.app.ui.screens.settings

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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.scenicroutes.app.ui.viewmodel.SettingsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    // Use Activity-scoped ViewModel to ensure all screens share the same instance
    val activity = context as? androidx.activity.ComponentActivity
    val viewModel: SettingsViewModel = if (activity != null) {
        viewModel(viewModelStoreOwner = activity)
    } else {
        viewModel() // Fallback to default scoping
    }
    val settings by viewModel.settings.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val accountDeleted by viewModel.accountDeleted.collectAsState()

    // Only load settings if they're empty (first time opening screen)
    LaunchedEffect(Unit) {
        if (settings.isEmpty()) {
            viewModel.loadSettings()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                // Measurement Units
                SettingsSection(title = "Units") {
                    val selectedUnit = settings["measurement_units"] as? String ?: "metric"

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilterChip(
                            selected = selectedUnit == "metric",
                            onClick = {
                                viewModel.updateSetting("measurement_units", "metric")
                            },
                            label = { Text("Metric") },
                            modifier = Modifier.weight(1f),
                        )
                        FilterChip(
                            selected = selectedUnit == "imperial",
                            onClick = {
                                viewModel.updateSetting("measurement_units", "imperial")
                            },
                            label = { Text("Imperial") },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                // Map View
                SettingsSection(title = "Map") {
                    // Sync with settings changes
                    var selectedView by remember(settings["default_map_view"]) { 
                        mutableStateOf(settings["default_map_view"] as? String ?: "standard") 
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Standard", "Terrain", "Satellite").forEach { view ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(view)
                                RadioButton(
                                    selected = selectedView == view.lowercase(),
                                    onClick = {
                                        selectedView = view.lowercase()
                                        viewModel.updateSetting("default_map_view", view.lowercase())
                                    },
                                )
                            }
                        }
                    }
                }

                // Search Settings
                SettingsSection(title = "Search") {
                    val searchRadius = (settings["default_search_radius"] as? Number)?.toInt() ?: 10

                    Text(
                        text = "Default Search Radius: $searchRadius km",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    Slider(
                        value = searchRadius.toFloat(),
                        onValueChange = {
                            viewModel.updateSetting("default_search_radius", it.toInt())
                        },
                        valueRange = 1f..50f,
                        steps = 49,
                    )
                }

                // Notifications
                SettingsSection(title = "Notifications") {
                    val notificationsEnabled = settings["notifications_enabled"] as? Boolean ?: true

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Enable Notifications")
                        Switch(
                            checked = notificationsEnabled,
                            onCheckedChange = {
                                viewModel.updateSetting("notifications_enabled", it)
                            },
                        )
                    }
                }


                // Theme Settings
                SettingsSection(title = "Appearance") {
                    // Sync with settings changes
                    var selectedTheme by remember(settings["theme"]) { 
                        mutableStateOf(settings["theme"] as? String ?: "light") 
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Light", "Dark", "System").forEach { theme ->
                            val themeKey = when (theme) {
                                "Light" -> "light"
                                "Dark" -> "dark"
                                "System" -> "system"
                                else -> "light"
                            }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(theme)
                                RadioButton(
                                    selected = selectedTheme == themeKey,
                                    onClick = {
                                        selectedTheme = themeKey
                                        viewModel.updateSetting("theme", themeKey)
                                    },
                                )
                            }
                        }
                    }
                }

                // Privacy Settings
                SettingsSection(title = "Privacy") {
                    val showCommunityByDefault = settings["show_community_by_default"] as? Boolean ?: false

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Show Community Roads by Default", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "Display community roads when searching",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Switch(
                            checked = showCommunityByDefault,
                            onCheckedChange = {
                                viewModel.updateSetting("show_community_by_default", it)
                            },
                        )
                    }
                }

                // Account Settings
                SettingsSection(title = "Account") {
                    var showDialog by remember { mutableStateOf(false) }
                    var confirmText by remember { mutableStateOf("") }
                    var password by remember { mutableStateOf("") }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Delete Account", style = MaterialTheme.typography.bodyMedium)
                        OutlinedButton(
                            onClick = { showDialog = true },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error,
                            ),
                        ) {
                            Text("Delete")
                        }
                    }

                    if (showDialog) {
                        AlertDialog(
                            onDismissRequest = { showDialog = false },
                            title = { Text("Confirm Account Deletion") },
                            text = {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(
                                        "This schedules account deletion and permanently removes your data after the grace period. This action cannot be undone.",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                    OutlinedTextField(
                                        value = confirmText,
                                        onValueChange = { confirmText = it },
                                        label = { Text("Type DELETE to confirm") },
                                        singleLine = true,
                                    )
                                    OutlinedTextField(
                                        value = password,
                                        onValueChange = { password = it },
                                        label = { Text("Password") },
                                        singleLine = true,
                                        trailingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                    )
                                }
                            },
                            confirmButton = {
                                val enabled = confirmText.trim().equals("DELETE", ignoreCase = false) && password.isNotBlank() && !isLoading
                                TextButton(
                                    enabled = enabled,
                                    onClick = {
                                        viewModel.deleteAccount(password.ifBlank { null })
                                        showDialog = false
                                    },
                                ) {
                                    if (isLoading) {
                                        CircularProgressIndicator(modifier = Modifier.size(18.dp))
                                    } else {
                                        Text("Delete")
                                    }
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = { showDialog = false }) { Text("Cancel") }
                            },
                        )
                    }
                }

                // Error message
                errorMessage?.let { error ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            }
        }
    }

    // After deletion: navigate to map and clear back stack
    LaunchedEffect(accountDeleted) {
        if (accountDeleted) {
            android.widget.Toast.makeText(context, "Account deletion scheduled", android.widget.Toast.LENGTH_SHORT).show()
            navController.navigate("map") {
                popUpTo(0) { inclusive = true }
                launchSingleTop = true
            }
        }
    }
}

@Composable
fun SettingsSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            content()
        }
    }
}
