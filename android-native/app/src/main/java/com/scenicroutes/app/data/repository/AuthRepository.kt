package com.scenicroutes.app.data.repository

import com.scenicroutes.app.data.api.LoginRequest
import com.scenicroutes.app.data.api.RegisterRequest
import com.scenicroutes.app.data.model.AuthResponse
import com.scenicroutes.app.data.model.User
import com.scenicroutes.app.data.network.NetworkModule
import com.scenicroutes.app.data.exception.VerificationRequiredException

class AuthRepository {
    private val apiService = NetworkModule.apiService
    suspend fun login(email: String, password: String): Result<AuthResponse> {
        return try {
            val request = LoginRequest(login = email, password = password)
            android.util.Log.d("AuthRepository", "Login request created")
            
            val response = apiService.login(request)
            android.util.Log.d("AuthRepository", "Login response: code=${response.code()}, isSuccessful=${response.isSuccessful}, message=${response.message()}")
            
            if (response.isSuccessful && response.body() != null) {
                android.util.Log.d("AuthRepository", "Login successful")
                Result.success(response.body()!!)
            } else {
                // Try to read error body for more details
                val errorBody = try {
                    response.errorBody()?.string() ?: "No error body"
                } catch (e: Exception) {
                    "Error reading error body: ${e.message}"
                }
                android.util.Log.e("AuthRepository", "Login failed: code=${response.code()}, message=${response.message()}")
                
                // Provide more descriptive error message
                val errorMessage = when (response.code()) {
                    404 -> "Login endpoint not found. Please check API configuration."
                    401 -> "Invalid credentials. Please check your email and password."
                    422 -> {
                        // Try to parse validation errors
                        try {
                            val errorJson = com.google.gson.Gson().fromJson(errorBody, Map::class.java)
                            (errorJson["message"] as? String) ?: "Invalid credentials"
                        } catch (e: Exception) {
                            "Invalid credentials"
                        }
                    }
                    403 -> {
                        // Check if this is a verification error
                        try {
                            val errorJson = com.google.gson.Gson().fromJson(errorBody, Map::class.java)
                            if (errorJson["verification_needed"] == true || (errorJson["message"] as? String)?.contains("verify", ignoreCase = true) == true) {
                                val userEmail = errorJson["email"] as? String ?: ""
                                throw VerificationRequiredException(
                                    errorJson["message"] as? String ?: "Email not verified. Please verify your email address.",
                                    userEmail
                                )
                            }
                        } catch (e: VerificationRequiredException) {
                            throw e
                        } catch (e: Exception) {
                            // Silently fail and return generic message
                        }
                        "Email not verified. Please verify your email address."
                    }
                    else -> "Login failed: ${response.message()}. $errorBody"
                }
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            android.util.Log.e("AuthRepository", "Login exception: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun register(
        username: String,
        name: String,
        email: String,
        password: String,
        passwordConfirmation: String,
    ): Result<AuthResponse> {
        return try {
            val response = apiService.register(
                RegisterRequest(username, name, email, password, passwordConfirmation),
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Registration failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUser(token: String): Result<User> {
        return try {
            val response = apiService.getUser("Bearer $token")
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get user: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(token: String): Result<Unit> {
        return try {
            val response = apiService.logout("Bearer $token")
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Logout failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProfile(
        token: String,
        name: String,
        email: String,
        currentPassword: String? = null,
        newPassword: String? = null,
    ): Result<User> {
        return try {
            val request = mutableMapOf<String, String>(
                "name" to name,
                "email" to email,
            )
            if (currentPassword != null && newPassword != null) {
                request["current_password"] = currentPassword
                request["new_password"] = newPassword
                request["new_password_confirmation"] = newPassword
            }
            val response = apiService.updateProfile("Bearer $token", request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(Exception("Failed to update profile: ${response.message()} - $errorBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
