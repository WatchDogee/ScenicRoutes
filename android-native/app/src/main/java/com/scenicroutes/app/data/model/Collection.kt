package com.scenicroutes.app.data.model

data class Collection(
    val id: Long,
    val name: String,
    val description: String? = null,
    val user_id: Long,
    val is_public: Boolean = false,
    val rating: Double? = null,
    val review_count: Int = 0,
    val road_count: Int = 0,
    val cover_image_url: String? = null,
    val created_at: String,
    val updated_at: String,
    val tags: List<Tag>? = null,
    val roads: List<SavedRoad>? = null,
    val user: User? = null,
)

data class CollectionRequest(
    val name: String,
    val description: String? = null,
    val is_public: Boolean = false,
    val tags: List<Long>? = null,
)
















