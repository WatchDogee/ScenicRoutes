package com.scenicroutes.app.data.model

import com.google.gson.annotations.SerializedName

data class AlternativeRoutesResponse(
    @SerializedName("routes") val routes: List<RouteApiResponse>? = null,
    @SerializedName("alternative_routes") val alternativeRoutes: Boolean = false,
    @SerializedName("single_route") val singleRoute: Boolean = false,
) {
    fun toRouteCalculationResponse(): RouteCalculationResponse {
        val routesList = routes ?: emptyList()
        val mainRoute = routesList.firstOrNull()?.toRoute()
        val alternatives = if (routesList.size > 1) {
            routesList.drop(1).map { it.toRoute() }
        } else {
            emptyList()
        }
        return RouteCalculationResponse(
            route = mainRoute,
            alternativeRoutes = alternatives.takeIf { it.isNotEmpty() },
        )
    }
}
















