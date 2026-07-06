package com.scenicroutes.app.data.model

data class Comment(
    val id: Long,
    val user_id: Long,
    val saved_road_id: Long,
    val comment: String,
    val created_at: String,
    val updated_at: String,
    val user: User? = null,
)

data class CommentRequest(
    val comment: String,
)
















