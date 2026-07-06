package com.scenicroutes.app.data.api

data class CollectionRequest(
    val name: String,
    val description: String? = null,
    val is_public: Boolean = false,
    val road_ids: List<Long>? = null,
)
















