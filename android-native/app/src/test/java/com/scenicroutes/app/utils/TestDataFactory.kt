package com.scenicroutes.app.utils

import com.scenicroutes.app.data.model.*

/**
 * Factory for creating test data objects.
 * Use this to create consistent test data across all tests.
 */
object TestDataFactory {

    fun createRoute(
        distance: Double = 100.0,
        time: Long = 3600000L, // 1 hour in milliseconds
        geometry: List<List<Double>> = listOf(
            listOf(24.1052, 56.9496),
            listOf(24.1062, 56.9506),
        ),
        curvature: Double? = 0.5,
        curvatureLevel: String? = "curvy",
    ): Route {
        return Route(
            distance = distance,
            time = time,
            geometry = geometry,
            waypoints = emptyList(),
            curvature = curvature,
            curvatureLevel = curvatureLevel,
            instructions = null,
        )
    }

    fun createRouteCalculationRequest(
        startLat: Double = 56.9496,
        startLng: Double = 24.1052,
        endLat: Double = 56.9496,
        endLng: Double = 24.1052,
        curvatureLevel: String? = "curvy",
        avoidHighways: Boolean = false,
        avoidUnpaved: Boolean = false,
        avoidTolls: Boolean = false,
        avoidFerries: Boolean = false,
        showAlternativeRoutes: Boolean = false,
    ): RouteCalculationRequest {
        return RouteCalculationRequest(
            startLat = startLat,
            startLng = startLng,
            endLat = endLat,
            endLng = endLng,
            curvatureLevel = curvatureLevel,
            avoidOptions = AvoidOptions(
                highways = avoidHighways,
                unpaved = avoidUnpaved,
                tolls = avoidTolls,
                ferries = avoidFerries,
            ),
            showAlternativeRoutes = showAlternativeRoutes,
        )
    }

    fun createRouteApiResponse(
        coordinates: List<List<Double>> = listOf(
            listOf(24.1052, 56.9496),
            listOf(24.1062, 56.9506),
        ),
        distance: Double = 100.0,
        duration: Double = 3600.0,
    ): RouteApiResponse {
        return RouteApiResponse(
            coordinates = coordinates,
            distance = distance,
            duration = duration,
        )
    }

    fun createSavedRoad(
        id: Long = 1L,
        roadName: String = "Test Road",
        distance: Double? = 50.0,
        rating: Double? = 4.5,
        isPublic: Boolean = true,
    ): SavedRoad {
        return SavedRoad(
            id = id,
            road_name = roadName,
            start_location = "Start",
            end_location = "End",
            distance = distance,
            duration = null,
            geometry = emptyList(),
            user_id = 1L,
            is_public = isPublic,
            rating = rating,
            average_rating = rating,
            review_count = 0,
            created_at = "2024-01-01T00:00:00Z",
            updated_at = "2024-01-01T00:00:00Z",
        )
    }

    fun createPOI(
        id: Long? = 1L,
        name: String = "Test POI",
        lat: Double = 56.9496,
        lng: Double = 24.1052,
        type: POIType = POIType.TOURISM,
    ): POI {
        return POI(
            id = id,
            name = name,
            lat = lat,
            lng = lng,
            type = type,
            description = "Test description",
        )
    }

    fun createUser(
        id: Long = 1L,
        name: String = "Test User",
        email: String = "test@example.com",
    ): User {
        return User(
            id = id,
            name = name,
            email = email,
            email_verified_at = null,
            profile_picture = null,
        )
    }

    fun createCollection(
        id: Long = 1L,
        name: String = "Test Collection",
        description: String? = "Test description",
        roadCount: Int = 5,
        rating: Double? = 4.5,
    ): com.scenicroutes.app.data.model.Collection {
        return com.scenicroutes.app.data.model.Collection(
            id = id,
            name = name,
            description = description,
            road_count = roadCount,
            rating = rating,
            user_id = 1L,
            is_public = false,
            review_count = 0,
            cover_image_url = null,
            created_at = "2024-01-01T00:00:00Z",
            updated_at = "2024-01-01T00:00:00Z",
        )
    }

    fun createWeather(
        temperature: Double = 20.0,
        condition: String = "sunny",
        windSpeed: Double? = 10.0,
    ): Weather {
        return Weather(
            temperature = temperature,
            condition = condition,
            description = "Clear sky",
            humidity = 60.0,
            wind_speed = windSpeed,
            icon = null,
        )
    }
    
    fun createUsageStatistics(
        total: Int = 45,
        byType: Map<String, Int>? = mapOf(
            "graphhopper" to 30,
            "round_trip" to 15,
        ),
        byCurvature: Map<String, Int>? = mapOf(
            "curvy" to 20,
            "extra_curvy" to 10,
            "straightest" to 15,
        ),
        totalDistanceKm: Double? = 1250.5,
        period: String? = "month",
    ): com.scenicroutes.app.data.model.UsageStatistics {
        return com.scenicroutes.app.data.model.UsageStatistics(
            total = total,
            by_type = byType,
            by_curvature = byCurvature,
            total_distance_km = totalDistanceKm,
            period = period,
            start_date = null,
        )
    }
}
