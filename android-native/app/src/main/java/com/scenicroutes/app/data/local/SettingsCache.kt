package com.scenicroutes.app.data.local

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Local cache for user settings using SharedPreferences
 * This ensures settings persist across app restarts and are available immediately
 */
class SettingsCache(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("user_settings", Context.MODE_PRIVATE)
    
    private val _cachedSettings = MutableStateFlow<Map<String, Any>>(loadFromPrefs())
    val cachedSettings: Flow<Map<String, Any>> = _cachedSettings.asStateFlow()
    
    /**
     * Load settings from SharedPreferences
     */
    private fun loadFromPrefs(): Map<String, Any> {
        val settings = mutableMapOf<String, Any>()
        
        // Load all settings with defaults
        settings["measurement_units"] = prefs.getString("measurement_units", "metric") ?: "metric"
        settings["default_map_view"] = prefs.getString("default_map_view", "standard") ?: "standard"
        settings["show_community_by_default"] = prefs.getBoolean("show_community_by_default", false)
        settings["default_search_radius"] = prefs.getInt("default_search_radius", 10)
        settings["default_search_type"] = prefs.getString("default_search_type", "town") ?: "town"
        settings["theme"] = prefs.getString("theme", "light") ?: "light"
        settings["notifications_enabled"] = prefs.getBoolean("notifications_enabled", true)
        settings["default_navigation_app"] = prefs.getString("default_navigation_app", "google_maps") ?: "google_maps"
        
        android.util.Log.d("SettingsCache", "Loaded settings from cache: $settings")
        return settings
    }
    
    /**
     * Save settings to SharedPreferences
     */
    fun saveSettings(settings: Map<String, Any>) {
        val editor = prefs.edit()
        
        settings.forEach { (key, value) ->
            when (value) {
                is String -> editor.putString(key, value)
                is Boolean -> editor.putBoolean(key, value)
                is Int -> editor.putInt(key, value)
                is Long -> editor.putLong(key, value)
                is Float -> editor.putFloat(key, value)
                else -> {
                    // Try to convert to string as fallback
                    editor.putString(key, value.toString())
                }
            }
        }
        
        editor.apply()
        _cachedSettings.value = settings
        android.util.Log.d("SettingsCache", "Saved settings to cache: $settings")
    }
    
    /**
     * Update a single setting
     */
    fun updateSetting(key: String, value: Any) {
        val currentSettings = _cachedSettings.value.toMutableMap()
        currentSettings[key] = value
        saveSettings(currentSettings)
    }
    
    /**
     * Get a specific setting
     */
    fun getSetting(key: String): Any? {
        return _cachedSettings.value[key]
    }
    
    /**
     * Clear all cached settings
     */
    fun clearCache() {
        prefs.edit().clear().apply()
        _cachedSettings.value = loadFromPrefs()
        android.util.Log.d("SettingsCache", "Cleared settings cache")
    }
}

