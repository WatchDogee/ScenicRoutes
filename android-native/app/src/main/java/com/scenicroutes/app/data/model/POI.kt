package com.scenicroutes.app.data.model

import com.google.gson.annotations.SerializedName

data class POI(
    val id: Long? = null,
    val name: String,
    val type: POIType, // "tourism", "fuel", "charging"
    val lat: Double,
    val lng: Double,
    val address: String? = null,
    val description: String? = null,
    val rating: Double? = null,
    val review_count: Int = 0,
    val photos: List<POIPhoto>? = null,
    val reviews: List<Review>? = null,
    val is_saved: Boolean = false,
    val user_id: Long? = null,
)

enum class POIType {
    @SerializedName("tourism")
    TOURISM,

    @SerializedName("fuel")
    FUEL,

    @SerializedName("charging")
    CHARGING,
}

data class POIPhoto(
    val id: Long,
    val url: String,
    val thumbnail_url: String? = null,
)

data class POISearchRequest(
    val lat: Double,
    val lng: Double,
    val radius: Double = 5.0, // in km
    val type: POIType? = null,
)
