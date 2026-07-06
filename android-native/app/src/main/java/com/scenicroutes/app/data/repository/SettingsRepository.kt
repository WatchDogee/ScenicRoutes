package com.scenicroutes.app.data.repository

import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.network.NetworkModule

class SettingsRepository {
    private val apiService: ApiService = NetworkModule.apiService

    suspend fun getSettings(token: String): Result<Map<String, Any>> {
        return try {
            val response = apiService.getSettings("Bearer $token")
            if (response.isSuccessful && response.body() != null) {
                val responseBody = response.body()!!
                // Backend returns {"settings": {...}}
                val settingsMap = responseBody["settings"] as? Map<String, Any> ?: responseBody
                Result.success(settingsMap)
            } else {
                val errorBody = response.errorBody()?.string() ?: "No error body"
                android.util.Log.e("SettingsRepository", "Get settings failed: ${response.code()} ${response.message()}")
                android.util.Log.e("SettingsRepository", "Error body: $errorBody")
                Result.failure(Exception("Failed to get settings: ${response.message()}. $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SettingsRepository", "Exception getting settings: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun updateSetting(token: String, key: String, value: Any): Result<Map<String, Any>> {
        return try {
            android.util.Log.d("SettingsRepository", "Updating setting: $key = $value (type: ${value.javaClass.simpleName})")
            val request = com.scenicroutes.app.data.model.SettingsUpdateRequest(key = key, value = value)
            val response = apiService.updateSetting("Bearer $token", request)
            android.util.Log.d("SettingsRepository", "Update setting response: code=${response.code()}, isSuccessful=${response.isSuccessful}")
            
            if (response.isSuccessful && response.body() != null) {
                val responseBody = response.body()!!
                android.util.Log.d("SettingsRepository", "Update setting response body: $responseBody")
                
                // Backend returns {"message": "...", "setting": {"key": "...", "value": ...}}
                // We need to extract the settings map or return the full response
                val settingsMap = if (responseBody.containsKey("settings")) {
                    responseBody["settings"] as? Map<String, Any> ?: responseBody
                } else if (responseBody.containsKey("setting")) {
                    val setting = responseBody["setting"] as? Map<*, *>
                    if (setting != null) {
                        mapOf(setting["key"] as String to (setting["value"] ?: value))
                    } else {
                        responseBody
                    }
                } else {
                    // If response doesn't have "settings" or "setting", assume it's the full settings map
                    responseBody
                }
                android.util.Log.d("SettingsRepository", "Extracted settings map: $settingsMap")
                Result.success(settingsMap)
            } else {
                val errorBody = response.errorBody()?.string() ?: "No error body"
                android.util.Log.e("SettingsRepository", "Update setting failed: ${response.code()} ${response.message()}")
                android.util.Log.e("SettingsRepository", "Error body: $errorBody")
                Result.failure(Exception("Failed to update setting: ${response.message()}. $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SettingsRepository", "Exception updating setting: ${e.message}", e)
            e.printStackTrace()
            Result.failure(e)
        }
    }

    suspend fun updateSettingsBatch(token: String, settings: Map<String, Any>): Result<Map<String, Any>> {
        return try {
            val request = com.scenicroutes.app.data.model.SettingsBatchUpdateRequest(settings = settings)
            val response = apiService.updateSettingsBatch("Bearer $token", request)
            if (response.isSuccessful && response.body() != null) {
                val responseBody = response.body()!!
                // Backend returns {"message": "...", "settings": {...}}
                val settingsMap = responseBody["settings"] as? Map<String, Any> ?: responseBody
                Result.success(settingsMap)
            } else {
                val errorBody = response.errorBody()?.string() ?: "No error body"
                android.util.Log.e("SettingsRepository", "Batch update failed: ${response.code()} ${response.message()}")
                android.util.Log.e("SettingsRepository", "Error body: $errorBody")
                Result.failure(Exception("Failed to update settings: ${response.message()}. $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SettingsRepository", "Exception updating settings batch: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun deleteAccount(token: String, password: String?): Result<Map<String, Any>> {
        return try {
            val request = mutableMapOf<String, String?>()
            if (!password.isNullOrBlank()) {
                request["password"] = password
            }
            val response = apiService.deleteAccount("Bearer $token", request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string() ?: "No error body"
                android.util.Log.e("SettingsRepository", "Delete account failed: ${response.code()} ${response.message()}")
                android.util.Log.e("SettingsRepository", "Error body: $errorBody")
                Result.failure(Exception("Failed to delete account: ${response.message()}. $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SettingsRepository", "Exception deleting account: ${e.message}", e)
            Result.failure(e)
        }
    }
}
