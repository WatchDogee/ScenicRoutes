package com.scenicroutes.app.utils

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import com.scenicroutes.app.ui.viewmodel.SettingsViewModel

/**
 * Utility class to access user settings throughout the app
 */
object SettingsManager {
    /**
     * Get measurement units setting (metric or imperial)
     */
    @Composable
    fun getMeasurementUnits(): String {
        val viewModel: SettingsViewModel = viewModel()
        val settings by viewModel.settings.collectAsState()
        return settings["measurement_units"] as? String ?: "metric"
    }

    /**
     * Get default map view setting (standard, terrain, satellite)
     */
    @Composable
    fun getDefaultMapView(): String {
        // Use Activity-scoped ViewModel to ensure all screens share the same instance
        val context = androidx.compose.ui.platform.LocalContext.current
        val activity = context as? androidx.activity.ComponentActivity
        val viewModel: SettingsViewModel = if (activity != null) {
            androidx.lifecycle.viewmodel.compose.viewModel(viewModelStoreOwner = activity)
        } else {
            androidx.lifecycle.viewmodel.compose.viewModel() // Fallback to default scoping
        }
        val settings by viewModel.settings.collectAsState()
        return settings["default_map_view"] as? String ?: "standard"
    }

    /**
     * Get default search radius in km
     */
    @Composable
    fun getDefaultSearchRadius(): Double {
        // Use Activity-scoped ViewModel to ensure all screens share the same instance
        val context = androidx.compose.ui.platform.LocalContext.current
        val activity = context as? androidx.activity.ComponentActivity
        val viewModel: SettingsViewModel = if (activity != null) {
            androidx.lifecycle.viewmodel.compose.viewModel(viewModelStoreOwner = activity)
        } else {
            androidx.lifecycle.viewmodel.compose.viewModel() // Fallback to default scoping
        }
        val settings by viewModel.settings.collectAsState()
        val radius = (settings["default_search_radius"] as? Number)?.toDouble() ?: 10.0
        return radius
    }

    /**
     * Get notifications enabled setting
     */
    @Composable
    fun getNotificationsEnabled(): Boolean {
        // Use Activity-scoped ViewModel to ensure all screens share the same instance
        val context = androidx.compose.ui.platform.LocalContext.current
        val activity = context as? androidx.activity.ComponentActivity
        val viewModel: SettingsViewModel = if (activity != null) {
            androidx.lifecycle.viewmodel.compose.viewModel(viewModelStoreOwner = activity)
        } else {
            androidx.lifecycle.viewmodel.compose.viewModel() // Fallback to default scoping
        }
        val settings by viewModel.settings.collectAsState()
        return settings["notifications_enabled"] as? Boolean ?: true
    }

    /**
     * Get theme setting (light, dark, system)
     */
    @Composable
    fun getTheme(): String {
        // Use Activity-scoped ViewModel to ensure all screens share the same instance
        val context = androidx.compose.ui.platform.LocalContext.current
        val activity = context as? androidx.activity.ComponentActivity
        val viewModel: SettingsViewModel = if (activity != null) {
            androidx.lifecycle.viewmodel.compose.viewModel(viewModelStoreOwner = activity)
        } else {
            androidx.lifecycle.viewmodel.compose.viewModel() // Fallback to default scoping
        }
        val settings by viewModel.settings.collectAsState()
        return settings["theme"] as? String ?: "light"
    }

    /**
     * Get show community roads by default setting
     */
    @Composable
    fun getShowCommunityByDefault(): Boolean {
        val viewModel: SettingsViewModel = viewModel()
        val settings by viewModel.settings.collectAsState()
        return settings["show_community_by_default"] as? Boolean ?: false
    }

    /**
     * Load settings if not already loaded
     */
    @Composable
    fun ensureSettingsLoaded() {
        // Use Activity-scoped ViewModel to ensure all screens share the same instance
        val context = androidx.compose.ui.platform.LocalContext.current
        val activity = context as? androidx.activity.ComponentActivity
        val viewModel: SettingsViewModel = if (activity != null) {
            androidx.lifecycle.viewmodel.compose.viewModel(viewModelStoreOwner = activity)
        } else {
            androidx.lifecycle.viewmodel.compose.viewModel() // Fallback to default scoping
        }
        val settings by viewModel.settings.collectAsState()
        val isLoading by viewModel.isLoading.collectAsState()
        
        // Only load if settings are empty and not currently loading
        androidx.compose.runtime.LaunchedEffect(Unit) {
            if (settings.isEmpty() && !isLoading) {
                viewModel.loadSettings()
            }
        }
    }
}







