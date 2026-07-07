package com.scenicroutes.app.data.model

// Minimal paginated response wrapper used for endpoints that return data lists under a "data" key.
data class PaginatedResponse<T>(
    val data: List<T> = emptyList(),
)
