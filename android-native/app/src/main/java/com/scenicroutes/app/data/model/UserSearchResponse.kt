package com.scenicroutes.app.data.model

data class UserSearchResponse(
    val users: List<User> = emptyList(),
    val total: Int = 0,
)

data class UserRecommendationsResponse(
    val users: List<User> = emptyList(),
    val type: String? = null,
)
