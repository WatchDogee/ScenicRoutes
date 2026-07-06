package com.scenicroutes.app.data.model

data class Review(
    val id: Long,
    val user_id: Long,
    val saved_road_id: Long,
    val rating: Int,
    val comment: String? = null,
    val created_at: String,
    val updated_at: String,
    val user: User? = null,
    val photos: List<ReviewPhoto>? = null,
)

data class ReviewPhoto(
    val id: Long,
    val review_id: Long,
    val photo_path: String,
    val url: String? = null,
    val thumbnail_url: String? = null,
    val caption: String? = null,
)
