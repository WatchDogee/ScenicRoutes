package com.scenicroutes.app.ui.viewmodel

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.model.User
import com.scenicroutes.app.data.repository.AuthRepository
import com.scenicroutes.app.data.network.NetworkModule
import com.scenicroutes.app.data.exception.VerificationRequiredException
import java.io.IOException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody

class ProfileViewModel(private val context: Context? = null) : ViewModel() {
    private val authRepository = AuthRepository()
    private val tokenManager = context?.let { TokenManager(it) }

    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()

    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _showEmailVerification = MutableStateFlow(false)
    val showEmailVerification: StateFlow<Boolean> = _showEmailVerification.asStateFlow()

    private val _verificationEmail = MutableStateFlow<String?>(null)
    val verificationEmail: StateFlow<String?> = _verificationEmail.asStateFlow()

    private val _isPhotoUploading = MutableStateFlow(false)
    val isPhotoUploading: StateFlow<Boolean> = _isPhotoUploading.asStateFlow()

    private val _userStats = MutableStateFlow<Map<String, Any>?>(null)
    val userStats: StateFlow<Map<String, Any>?> = _userStats.asStateFlow()

    private val _isInitializing = MutableStateFlow(true)
    val isInitializing: StateFlow<Boolean> = _isInitializing.asStateFlow()

    init {
        checkAuth()
    }

    private fun isOnline(): Boolean {
        val ctx = context ?: return true
        val connectivityManager = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val network = connectivityManager?.activeNetwork
        val capabilities = network?.let { connectivityManager.getNetworkCapabilities(it) }
        return capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    }

    private fun checkAuth() {
        viewModelScope.launch {
            try {
                if (tokenManager != null) {
                    val token = tokenManager.token.first()
                    android.util.Log.d("ProfileViewModel", "checkAuth: token = ${if (token != null) "present" else "null"}")
                    if (token != null) {
                        // If offline, use cached user data immediately
                        if (!isOnline()) {
                            val cachedEmail = tokenManager.userEmail.first()
                            val cachedName = tokenManager.userName.first()
                            val cachedUserId = tokenManager.userId.first()

                            if (cachedEmail != null && cachedName != null && cachedUserId != null) {
                                _user.value = User(
                                    id = cachedUserId,
                                    name = cachedName,
                                    email = cachedEmail,
                                    email_verified_at = null,
                                    profile_picture = null,
                                )
                                _isAuthenticated.value = true
                                _isInitializing.value = false
                                android.util.Log.d("ProfileViewModel", "checkAuth: Offline - loaded cached user")
                                return@launch
                            }
                        }

                        // Try to get user with saved token
                        val result = authRepository.getUser(token)
                        result.fold(
                            onSuccess = { user ->
                                android.util.Log.d("ProfileViewModel", "checkAuth: User loaded successfully")
                                _user.value = user
                                _isAuthenticated.value = true
                                _isInitializing.value = false
                                // Save user data to cache for offline access
                                tokenManager.saveUserData(user.email, user.name)
                                // Load user stats in background
                                loadUserStats()
                            },
                            onFailure = { error ->
                                android.util.Log.d("ProfileViewModel", "checkAuth: Token invalid or user fetch failed: ${error.message}")
                                val isNetworkError = error is IOException || error.cause is IOException
                                if (isNetworkError) {
                                    // Offline: try to load cached user data
                                    val cachedEmail = tokenManager.userEmail.first()
                                    val cachedName = tokenManager.userName.first()
                                    val cachedUserId = tokenManager.userId.first()
                                    
                                    if (cachedEmail != null && cachedName != null && cachedUserId != null) {
                                        // Reconstruct user from cached data
                                        _user.value = User(
                                            id = cachedUserId,
                                            name = cachedName,
                                            email = cachedEmail,
                                            email_verified_at = null,
                                            profile_picture = null
                                        )
                                        _isAuthenticated.value = true
                                        android.util.Log.d("ProfileViewModel", "checkAuth: Offline - loaded cached user")
                                    }
                                    _isInitializing.value = false
                                } else {
                                    // Token invalid, clear it
                                    tokenManager.clearToken()
                                    _isAuthenticated.value = false
                                    _isInitializing.value = false
                                }
                            },
                        )
                    } else {
                        android.util.Log.d("ProfileViewModel", "checkAuth: No token found")
                        _isAuthenticated.value = false
                        _isInitializing.value = false
                    }
                } else {
                    android.util.Log.d("ProfileViewModel", "checkAuth: TokenManager is null")
                    _isAuthenticated.value = false
                    _isInitializing.value = false
                }
            } catch (e: Exception) {
                android.util.Log.e("ProfileViewModel", "Error during checkAuth: ${e.message}", e)
                _isAuthenticated.value = false
                _isInitializing.value = false
            }
        }
    }

    fun login(email: String, password: String, rememberMe: Boolean = false) {
        if (email.isBlank() || password.isBlank()) {
            _errorMessage.value = "Please enter email and password"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            val result = authRepository.login(email, password)
            result.fold(
                onSuccess = { authResponse ->
                    _user.value = authResponse.user
                    _isAuthenticated.value = true
                    _isLoading.value = false
                    _errorMessage.value = null
                    _showEmailVerification.value = false
                    // Save token to DataStore with rememberMe preference
                    tokenManager?.saveToken(authResponse.token, authResponse.user.id, rememberMe)
                    // Save user data to cache for offline access
                    tokenManager?.saveUserData(authResponse.user.email, authResponse.user.name)
                },
                onFailure = { error ->
                    _isLoading.value = false
                    // Check if this is a verification required exception with email
                    if (error is VerificationRequiredException) {
                        _errorMessage.value = error.message ?: "Email not verified. Please verify your email address."
                        _verificationEmail.value = error.email
                        _showEmailVerification.value = true
                    } else {
                        val errorMsg = error.message ?: "Login failed. Please check your credentials."
                        _errorMessage.value = errorMsg
                        _showEmailVerification.value = false
                    }
                },
            )
        }
    }

    fun closeEmailVerification() {
        _showEmailVerification.value = false
        _verificationEmail.value = null
    }

    fun register(username: String, name: String, email: String, password: String, rememberMe: Boolean = false) {
        if (username.isBlank() || name.isBlank() || email.isBlank() || password.isBlank()) {
            _errorMessage.value = "Please fill in all fields"
            return
        }

        if (password.length < 8) {
            _errorMessage.value = "Password must be at least 8 characters"
            return
        }

        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            _isLoading.value = true
            _errorMessage.value = null

            val result = authRepository.register(username, name, email, password, password)
            result.fold(
                onSuccess = { authResponse ->
                    // If email is not verified yet, prompt user instead of auto-login
                    if (authResponse.user.email_verified_at.isNullOrEmpty()) {
                        _isAuthenticated.value = false
                        _isLoading.value = false
                        _errorMessage.value = "Registration successful! Please verify your email. Check your inbox for the verification link."
                        // Do NOT persist token until verified
                        return@fold
                    }

                    _user.value = authResponse.user
                    _isAuthenticated.value = true
                    _isLoading.value = false
                    _errorMessage.value = null
                    // Save token to DataStore with rememberMe preference
                    tokenManager?.saveToken(authResponse.token, authResponse.user.id, rememberMe)
                    // Save user data to cache for offline access
                    tokenManager?.saveUserData(authResponse.user.email, authResponse.user.name)
                },
                onFailure = { error ->
                    _isLoading.value = false
                    _errorMessage.value = error.message ?: "Registration failed. Please try again."
                },
            )
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun logout() {
        viewModelScope.launch {
            if (tokenManager != null) {
                val token = tokenManager.token.first()
                if (token != null) {
                    authRepository.logout(token)
                }
                tokenManager.clearToken()
            }
            _user.value = null
            _isAuthenticated.value = false
        }
    }

    suspend fun getToken(): String? {
        return tokenManager?.token?.first()
    }

    fun updateProfile(
        name: String,
        email: String,
        currentPassword: String? = null,
        newPassword: String? = null,
    ) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            _isLoading.value = true
            _errorMessage.value = null

            val token = tokenManager?.token?.first()
            if (token == null) {
                _errorMessage.value = "Not authenticated"
                _isLoading.value = false
                return@launch
            }

            val result = authRepository.updateProfile(token, name, email, currentPassword, newPassword)
            result.fold(
                onSuccess = { updatedUser ->
                    _user.value = updatedUser
                    _isLoading.value = false
                    _errorMessage.value = null
                    // Reload stats after profile update
                    loadUserStats()
                },
                onFailure = { error ->
                    _isLoading.value = false
                    _errorMessage.value = error.message ?: "Failed to update profile"
                },
            )
        }
    }

    fun loadUserStats() {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val token = tokenManager?.token?.first()
            val userId = tokenManager?.userId?.first()
            if (token != null && userId != null) {
                try {
                    val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                    val response = apiService.getUserStats("Bearer $token", userId)
                    if (response.isSuccessful && response.body() != null) {
                        _userStats.value = response.body()!!
                    } else {
                        android.util.Log.w("ProfileViewModel", "Failed to load user stats: ${response.code()}")
                    }
                } catch (e: Exception) {
                    android.util.Log.e("ProfileViewModel", "Error loading user stats: ${e.message}", e)
                    // Don't set error message for stats - it's not critical
                }
            }
        }
    }

    fun uploadProfilePicture(uri: Uri) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            val token = tokenManager?.token?.first()
            if (token == null || context == null) {
                _errorMessage.value = "Not authenticated"
                return@launch
            }

            try {
                _isPhotoUploading.value = true

                val contentResolver = context.contentResolver
                val inputStream = contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()

                if (bytes == null) {
                    _errorMessage.value = "Unable to read selected image"
                    _isPhotoUploading.value = false
                    return@launch
                }

                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                val requestBody: RequestBody = RequestBody.create(mimeType.toMediaTypeOrNull(), bytes)
                val fileName = "profile_${System.currentTimeMillis()}.jpg"
                val part = MultipartBody.Part.createFormData("profile_picture", fileName, requestBody)

                val api = NetworkModule.apiService
                val response = api.updateProfilePicture("Bearer $token", part)
                if (response.isSuccessful) {
                    // Refresh user to get new profile picture URL
                    val userResp = api.getUser("Bearer $token")
                    if (userResp.isSuccessful && userResp.body() != null) {
                        _user.value = userResp.body()!!
                    }
                    _errorMessage.value = null
                } else {
                    val body = try { response.errorBody()?.string() } catch (e: Exception) { e.message }
                    _errorMessage.value = "Failed to upload profile picture: ${response.code()} ${response.message()} ${body ?: ""}".trim()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Failed to upload profile picture"
            } finally {
                _isPhotoUploading.value = false
            }
        }
    }
}
