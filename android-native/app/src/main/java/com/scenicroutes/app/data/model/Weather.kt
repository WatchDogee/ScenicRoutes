package com.scenicroutes.app.data.model

import com.google.gson.annotations.SerializedName

data class Weather(
    val temperature: Double,
    val condition: String,
    val description: String? = null,
    val humidity: Double? = null,
    @SerializedName("wind_speed")
    val wind_speed: Double? = null,
    val icon: String? = null,
)

data class WeatherRequest(
    val lat: Double,
    val lng: Double,
)
