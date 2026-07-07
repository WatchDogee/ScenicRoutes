package com.scenicroutes.app.data.model

data class UserSettings(
    val measurement_units: String = "metric", // "metric" or "imperial"
    val default_map_view: String = "standard", // "standard", "terrain", "satellite"
    val show_community_by_default: Boolean = false,
    val default_search_radius: Int = 10, // km
    val default_search_type: String = "town", // "town", "city", "region"
    val theme: String = "light", // "light" or "dark"
    val notifications_enabled: Boolean = true,
    val default_navigation_app: String = "google_maps", // "google_maps", "waze", "apple_maps"
)

data class SettingsUpdateRequest(
    val key: String,
    val value: Any,
)

data class SettingsBatchUpdateRequest(
    val settings: Map<String, Any>,
)
















