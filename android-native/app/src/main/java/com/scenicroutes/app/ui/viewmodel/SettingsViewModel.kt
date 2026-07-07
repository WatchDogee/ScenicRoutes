package com.scenicroutes.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.repository.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class SettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val settingsRepository = SettingsRepository()
    private val tokenManager = TokenManager(application)
    private val settingsCache = com.scenicroutes.app.data.local.SettingsCache(application)

    private val _settings = MutableStateFlow<Map<String, Any>>(emptyMap())
    val settings: StateFlow<Map<String, Any>> = _settings.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _accountDeleted = MutableStateFlow(false)
    val accountDeleted: StateFlow<Boolean> = _accountDeleted.asStateFlow()

    private var isLoadingInProgress = false

    init {
        // Load cached settings immediately on initialization
        viewModelScope.launch {
            settingsCache.cachedSettings.collect { cachedSettings ->
                if (_settings.value.isEmpty() && cachedSettings.isNotEmpty()) {
                    _settings.value = cachedSettings
                    android.util.Log.d("SettingsViewModel", "Loaded cached settings: ${cachedSettings.size} settings")
                }
            }
        }
    }

    fun loadSettings() {
        // Prevent concurrent loads
        if (isLoadingInProgress) {
            android.util.Log.d("SettingsViewModel", "loadSettings() already in progress, skipping")
            return
        }

        viewModelScope.launch {
            isLoadingInProgress = true
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val token = tokenManager.token.first()
                if (token != null) {
                    val result = settingsRepository.getSettings(token)
                    result.fold(
                        onSuccess = { settingsMap ->
                            _settings.value = settingsMap
                            // Save to cache for next app start
                            settingsCache.saveSettings(settingsMap)
                            _isLoading.value = false
                            android.util.Log.d("SettingsViewModel", "Settings loaded successfully: ${settingsMap.size} settings")
                        },
                        onFailure = { error ->
                            val isNetworkError = error is java.io.IOException || error.cause is java.io.IOException
                            if (isNetworkError) {
                                // Offline - keep cached settings if available
                                if (_settings.value.isEmpty()) {
                                    // Cached settings already loaded in init block, but just in case
                                    android.util.Log.d("SettingsViewModel", "Offline - using cached settings")
                                }
                                _isLoading.value = false
                            } else {
                                _errorMessage.value = error.message ?: "Failed to load settings"
                                _isLoading.value = false
                                android.util.Log.e("SettingsViewModel", "Failed to load settings from API: ${error.message}")
                            }
                        },
                    )
                } else {
                    _errorMessage.value = "Not authenticated"
                    _isLoading.value = false
                }
            } finally {
                isLoadingInProgress = false
            }
        }
    }

    fun updateSetting(key: String, value: Any) {
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token != null) {
                // Optimistically update local state and cache
                val previousValue = _settings.value[key]
                _settings.value = _settings.value.toMutableMap().apply {
                    put(key, value)
                }
                settingsCache.updateSetting(key, value)

                val result = settingsRepository.updateSetting(token, key, value)
                result.fold(
                    onSuccess = { updatedSettings ->
                        // Backend returns {"message": "...", "setting": {"key": "...", "value": ...}}
                        // So updatedSettings only contains the single updated setting
                        // Just ensure our local state has the correct value
                        val currentSettings = _settings.value.toMutableMap()
                        // Merge the updated setting (should only be one key)
                        updatedSettings.forEach { (k, v) ->
                            currentSettings[k] = v
                        }
                        // Ensure the key we just updated is set correctly
                        currentSettings[key] = value
                        _settings.value = currentSettings
                        settingsCache.saveSettings(currentSettings)

                        android.util.Log.d("SettingsViewModel", "Setting updated successfully: $key = $value")
                        android.util.Log.d("SettingsViewModel", "Current settings: ${_settings.value}")

                        // Don't reload settings immediately - the optimistic update is sufficient
                        // Settings will be reloaded when the screen is next opened or on app start
                    },
                    onFailure = { error ->
                        // Revert optimistic update on failure
                        _settings.value = _settings.value.toMutableMap().apply {
                            if (previousValue != null) {
                                put(key, previousValue)
                            } else {
                                remove(key)
                            }
                        }
                        if (previousValue != null) {
                            settingsCache.updateSetting(key, previousValue)
                        }
                        android.util.Log.e("SettingsViewModel", "Failed to update setting: ${error.message}", error)
                        _errorMessage.value = error.message ?: "Failed to update setting"
                    },
                )
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun deleteAccount(password: String?) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val token = tokenManager.token.first()
                if (token != null) {
                    val result = settingsRepository.deleteAccount(token, password)
                    result.fold(
                        onSuccess = {
                            // Clear local caches and token
                            settingsCache.clearCache()
                            tokenManager.clearToken()
                            _accountDeleted.value = true
                            _isLoading.value = false
                        },
                        onFailure = { error ->
                            _errorMessage.value = error.message ?: "Failed to delete account"
                            _isLoading.value = false
                        },
                    )
                } else {
                    _errorMessage.value = "Not authenticated"
                    _isLoading.value = false
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Failed to delete account"
                _isLoading.value = false
            }
        }
    }
}
















