package com.scenicroutes.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.repository.SavedRoadRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class TripsViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SavedRoadRepository()
    private val tokenManager = TokenManager(application)

    private val _savedRoads = MutableStateFlow<List<com.scenicroutes.app.data.model.SavedRoad>>(emptyList())
    val savedRoads: StateFlow<List<com.scenicroutes.app.data.model.SavedRoad>> = _savedRoads.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    init {
        android.util.Log.d("TripsViewModel", "TripsViewModel initialized, loading saved roads...")
        loadSavedRoads()
    }

    fun loadSavedRoads() {
        android.util.Log.d("TripsViewModel", "=== loadSavedRoads called ===")
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val token = tokenManager.token.first()
            android.util.Log.d("TripsViewModel", "Token available: ${token != null}")
            
            if (token == null) {
                // Not authenticated, show empty state
                android.util.Log.w("TripsViewModel", "No token available, clearing roads")
                _savedRoads.value = emptyList()
                _errorMessage.value = "Please log in to view your saved roads"
                return@launch
            }

            _isLoading.value = true
            _errorMessage.value = null
            android.util.Log.d("TripsViewModel", "Fetching saved roads from repository...")
            
            try {
                val result = repository.getSavedRoads(token)
                result.fold(
                    onSuccess = { roads ->
                        android.util.Log.d("TripsViewModel", "Successfully loaded ${roads.size} saved roads")
                        roads.forEachIndexed { index, road ->
                            android.util.Log.d("TripsViewModel", "  [$index] ${road.road_name} (ID: ${road.id})")
                        }
                        _savedRoads.value = roads
                        _errorMessage.value = null
                    },
                    onFailure = { error ->
                        android.util.Log.e("TripsViewModel", "Error loading saved roads: ${error.message}", error)
                        android.util.Log.e("TripsViewModel", "Error type: ${error.javaClass.name}")
                        
                        // Specific error handling
                        val errorMsg = when (error) {
                            is java.net.ConnectException -> "No internet connection. Your saved roads will appear here when you're back online."
                            is java.net.SocketTimeoutException -> "Connection timeout. Please check your internet connection."
                            is java.net.UnknownHostException -> "No internet connection. Please check your network settings."
                            is com.google.gson.JsonSyntaxException -> "Unable to load your roads. Please try again later."
                            else -> "Unable to load your roads. ${if (error.message?.contains("Unable to resolve host") == true) "Please check your internet connection." else "Please try again later."}"
                        }
                        _errorMessage.value = errorMsg
                        
                        // Don't clear existing roads on error - preserve what we have
                        // Only clear if we have no roads yet (first load)
                        if (_savedRoads.value.isEmpty()) {
                            _savedRoads.value = emptyList()
                        } else {
                            android.util.Log.w("TripsViewModel", "Preserving existing ${_savedRoads.value.size} roads despite error")
                        }
                    },
                )
            } catch (e: Exception) {
                android.util.Log.e("TripsViewModel", "Unexpected exception loading saved roads: ${e.message}", e)
                _errorMessage.value = "Unexpected error: ${e.message}"
                if (_savedRoads.value.isEmpty()) {
                    _savedRoads.value = emptyList()
                }
            } finally {
                _isLoading.value = false
                android.util.Log.d("TripsViewModel", "Loading complete. Final count: ${_savedRoads.value.size}")
            }
        }
    }

    fun deleteRoad(id: Long) {
        android.util.Log.d("TripsViewModel", "Deleting road ID: $id")
        viewModelScope.launch {
            val token = tokenManager.token.first()
            if (token == null) {
                android.util.Log.w("TripsViewModel", "Cannot delete road - no token")
                _errorMessage.value = "Please log in to delete roads"
                return@launch
            }

            try {
                val result = repository.deleteRoad(token, id)
                result.fold(
                    onSuccess = {
                        android.util.Log.d("TripsViewModel", "Road deleted successfully, refreshing list")
                        loadSavedRoads() // Refresh list
                    },
                    onFailure = { error ->
                        android.util.Log.e("TripsViewModel", "Error deleting road: ${error.message}", error)
                        _errorMessage.value = "Failed to delete road: ${error.message}"
                    },
                )
            } catch (e: Exception) {
                android.util.Log.e("TripsViewModel", "Unexpected error deleting road: ${e.message}", e)
                _errorMessage.value = "Unexpected error: ${e.message}"
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun refresh() {
        android.util.Log.d("TripsViewModel", "Manual refresh requested")
        loadSavedRoads()
    }
}












