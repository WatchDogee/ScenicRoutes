package com.scenicroutes.app.data.model

data class User(
    val id: Long,
    val name: String,
    val email: String,
    val email_verified_at: String? = null,
    val profile_picture: String? = null,
    // Optional fields returned by some endpoints
    val username: String? = null,
    val followers_count: Int? = null,
    val following_count: Int? = null,
    val saved_roads_count: Int? = null,
    val collections_count: Int? = null,
    val reviews_count: Int? = null,
    val profile_picture_url: String? = null,
    val is_following: Boolean? = null,
)

data class AuthResponse(
    val user: User,
    val token: String,
)
