package com.scenicroutes.app.data.api

import com.scenicroutes.app.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit interface defining all API endpoints
 */
interface ApiService {
    // ==================== Authentication ====================
    @POST("login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @GET("user")
    suspend fun getUser(@Header("Authorization") token: String): Response<User>

    @POST("logout")
    suspend fun logout(@Header("Authorization") token: String): Response<ResponseBody>

    @HTTP(method = "DELETE", path = "account", hasBody = true)
    suspend fun deleteAccount(
        @Header("Authorization") token: String,
        @Body request: Map<String, String?>,
    ): Response<Map<String, Any>>

    @PUT("profile")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: Map<String, String>,
    ): Response<User>

    @POST("forgot-password")
    suspend fun forgotPassword(@Body request: Map<String, String>): Response<ResponseBody>

    @POST("email/verification-notification")
    suspend fun resendVerificationEmail(@Header("Authorization") token: String): Response<ResponseBody>

    @POST("email/resend-verification")
    suspend fun resendVerificationEmailPublic(@Body request: Map<String, String>): Response<ResponseBody>

    @POST("reset-password")
    suspend fun resetPassword(@Body request: Map<String, String>): Response<ResponseBody>

    @Multipart
    @POST("profile/picture")
    suspend fun updateProfilePicture(
        @Header("Authorization") token: String,
        @Part photo: MultipartBody.Part,
    ): Response<Map<String, Any>>

    // ==================== Routes ====================
    @POST("routes/calculate")
    suspend fun calculateRoute(@Body request: RouteCalculationRequest): Response<RouteApiResponse>

    @POST("routes/graphhopper")
    suspend fun calculateRouteGraphHopper(@Body request: RouteCalculationRequest): Response<RouteApiResponse>

    @POST("routes/calculate-curved")
    suspend fun calculateCurvedRoute(@Body request: RouteCalculationRequest): Response<RouteApiResponse>

    @POST("routes/round-trip")
    suspend fun calculateRoundTrip(
        @Header("Authorization") token: String,
        @Body request: RoundTripRequest
    ): Response<RouteApiResponse>

    @POST("routes/segment-curvature")
    suspend fun calculateSegmentCurvatureRoute(@Body request: SegmentCurvatureRequest): Response<RouteApiResponse>

    // ==================== Saved Roads ====================
    @GET("saved-roads")
    suspend fun getSavedRoads(@Header("Authorization") token: String): Response<List<SavedRoad>>

    @GET("saved-roads/{id}")
    suspend fun getSavedRoad(
        @Header("Authorization") token: String,
        @Path("id") id: Long,
    ): Response<SavedRoad>

    @POST("saved-roads")
    suspend fun saveRoad(
        @Header("Authorization") token: String,
        @Body request: SavedRoadRequest,
    ): Response<SavedRoad>

    @PUT("saved-roads/{id}")
    suspend fun updateSavedRoad(
        @Header("Authorization") token: String,
        @Path("id") id: Long,
        @Body request: SavedRoadRequest,
    ): Response<SavedRoad>

    @DELETE("saved-roads/{id}")
    suspend fun deleteSavedRoad(
        @Header("Authorization") token: String,
        @Path("id") id: Long,
    ): Response<ResponseBody>

    @GET("public-roads")
    suspend fun getPublicRoads(
        @Query("lat") lat: Double? = null,
        @Query("lon") lng: Double? = null, // Backend expects "lon" not "lng"
        @Query("radius") radius: Double? = null,
        @Query("country") country: String? = null,
        @Query("region") region: String? = null,
        @Query("location") location: String? = null,
        @Query("query") query: String? = null,
        @Query("tags") tags: String? = null,
        @Query("length_filter") lengthFilter: String? = null,
        @Query("curviness_filter") curvinessFilter: String? = null,
        @Query("min_rating") minRating: Double? = null,
        @Query("sort_by") sortBy: String? = null,
    ): Response<PublicRoadsResponse>
    
    @GET("public-roads/{id}")
    suspend fun getPublicRoad(@Path("id") id: Long): Response<SavedRoad>

    // ==================== Road Network Search ====================
    // Search actual road network (Overpass API) - not saved roads
    @GET("roads")
    suspend fun searchRoadNetwork(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double,
        @Query("radius") radius: Double, // in km
        @Query("type") type: String = "all", // "all", "primary", "secondary"
    ): Response<List<RoadNetworkSearch>>

    @Multipart
    @POST("saved-roads/{id}/photos")
    suspend fun uploadRoadPhoto(
        @Header("Authorization") token: String,
        @Path("id") roadId: Long,
        @Part photo: MultipartBody.Part,
        @Part("caption") caption: RequestBody?,
    ): Response<Map<String, Any>>

    @DELETE("saved-roads/photos/{photoId}")
    suspend fun deleteRoadPhoto(
        @Header("Authorization") token: String,
        @Path("photoId") photoId: Long,
    ): Response<ResponseBody>

    // ==================== Reviews & Comments ====================
    @POST("saved-roads/{id}/reviews")
    suspend fun addReview(
        @Header("Authorization") token: String,
        @Path("id") roadId: Long,
        @Body request: ReviewRequest,
    ): Response<Review>

    @POST("saved-roads/{id}/comments")
    suspend fun addComment(
        @Header("Authorization") token: String,
        @Path("id") roadId: Long,
        @Body request: CommentRequest,
    ): Response<ResponseBody>

    // ==================== Offline Maps ====================
    @GET("offline-maps/regions")
    suspend fun getOfflineMapRegions(): Response<List<Map<String, Any>>>

    @GET("offline-maps/saved")
    suspend fun getSavedOfflineRegions(
        @Header("Authorization") token: String
    ): Response<List<Map<String, Any>>>

    @POST("offline-maps/save")
    suspend fun saveOfflineRegion(
        @Header("Authorization") token: String,
        @Body request: Map<String, Any>
    ): Response<Map<String, Any>>

    @POST("offline-maps/custom")
    suspend fun saveCustomOfflineRegion(
        @Header("Authorization") token: String,
        @Body request: CustomRegionRequest
    ): Response<Map<String, Any>>

    @DELETE("offline-maps/saved/{id}")
    suspend fun deleteSavedOfflineRegion(
        @Header("Authorization") token: String,
        @Path("id") id: Long
    ): Response<ResponseBody>

    @GET("offline-maps/downloads")
    suspend fun getDownloadedOfflineRegions(
        @Header("Authorization") token: String
    ): Response<List<Map<String, Any>>>

    @POST("offline-maps/downloads")
    suspend fun reportOfflineRegionDownload(
        @Header("Authorization") token: String,
        @Body request: Map<String, Any>
    ): Response<Map<String, Any>>

    // ==================== POIs ====================
    @GET("pois/search")
    suspend fun searchPOIs(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius") radius: Double = 5.0,
        @Query("type") type: String? = null,
    ): Response<List<POI>>

    @GET("pois/{id}")
    suspend fun getPOI(@Path("id") poiId: Long): Response<POI>

    @GET("pois/{id}/reviews")
    suspend fun getPOIReviews(@Path("id") poiId: Long): Response<List<Review>>

    @POST("pois/{id}/save")
    suspend fun savePOI(
        @Header("Authorization") token: String,
        @Path("id") poiId: Long,
    ): Response<ResponseBody>

    @DELETE("pois/{id}/save")
    suspend fun unsavePOI(
        @Header("Authorization") token: String,
        @Path("id") poiId: Long,
    ): Response<ResponseBody>

    @POST("pois/{id}/reviews")
    suspend fun addPOIReview(
        @Header("Authorization") token: String,
        @Path("id") poiId: Long,
        @Body request: ReviewRequest,
    ): Response<Review>

    @Multipart
    @POST("pois/{id}/photos")
    suspend fun uploadPOIPhoto(
        @Header("Authorization") token: String,
        @Path("id") poiId: Long,
        @Part photo: MultipartBody.Part,
        @Part("caption") caption: RequestBody?,
    ): Response<Map<String, Any>>

    // ==================== Weather ====================
    @GET("weather")
    suspend fun getWeather(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
    ): Response<Weather>

    @GET("weather/road/{roadId}")
    suspend fun getWeatherForRoad(@Path("roadId") roadId: Long): Response<Weather>

    // ==================== Collections ====================
    @GET("collections")
    suspend fun getCollections(@Header("Authorization") token: String): Response<ResponseBody>

    @GET("collections/{id}")
    suspend fun getCollection(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Long,
    ): Response<com.scenicroutes.app.data.model.Collection>

    @POST("collections")
    suspend fun createCollection(
        @Header("Authorization") token: String,
        @Body request: CollectionRequest,
    ): Response<com.scenicroutes.app.data.model.Collection>

    @PUT("collections/{id}")
    suspend fun updateCollection(
        @Header("Authorization") token: String,
        @Path("id") id: Long,
        @Body request: CollectionRequest,
    ): Response<com.scenicroutes.app.data.model.Collection>

    @DELETE("collections/{id}")
    suspend fun deleteCollection(
        @Header("Authorization") token: String,
        @Path("id") id: Long,
    ): Response<ResponseBody>

    @GET("collections/public")
    suspend fun getPublicCollections(): Response<List<com.scenicroutes.app.data.model.Collection>>

    @GET("public-collections")
    suspend fun getPublicCollectionsV2(
        @Query("query") query: String? = null,
        @Query("country") country: String? = null,
        @Query("tags") tags: String? = null,
    ): Response<Map<String, Any>> // Returns paginated response

    @GET("collections/{id}/reviews")
    suspend fun getCollectionReviews(@Path("id") collectionId: Long): Response<List<Review>>

    @POST("collections/{id}/reviews")
    suspend fun addCollectionReview(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Long,
        @Body request: ReviewRequest,
    ): Response<Review>

    @POST("collections/{id}/share")
    suspend fun shareCollection(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Long,
    ): Response<Map<String, String>>

    @DELETE("collections/{id}/roads/{roadId}")
    suspend fun removeRoadFromCollection(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Long,
        @Path("roadId") roadId: Long,
    ): Response<ResponseBody>

    @POST("collections/{id}/roads")
    suspend fun addRoadsToCollection(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Long,
        @Body request: AddRoadsRequest,
    ): Response<com.scenicroutes.app.data.model.Collection>

    @Multipart
    @POST("collections/{id}/cover")
    suspend fun uploadCollectionCoverImage(
        @Header("Authorization") token: String,
        @Path("id") collectionId: Long,
        @Part photo: MultipartBody.Part,
    ): Response<com.scenicroutes.app.data.model.Collection>

    // ==================== Explore ====================
    @GET("explore/top-rated-roads")
    suspend fun getTopRatedRoads(): Response<List<SavedRoad>>

    @GET("explore/featured-collections")
    suspend fun getFeaturedCollections(): Response<List<com.scenicroutes.app.data.model.Collection>>

    @GET("explore/most-reviewed-roads")
    suspend fun getMostReviewedRoads(): Response<List<SavedRoad>>

    @GET("explore/popular-by-country")
    suspend fun getPopularRoadsByCountry(): Response<Map<String, List<SavedRoad>>>

    @GET("explore/most-active-users")
    suspend fun getMostActiveUsers(): Response<List<User>>

    @GET("explore/most-followed-users")
    suspend fun getMostFollowedUsers(): Response<List<User>>

    @GET("explore/top-rated-collections")
    suspend fun getTopRatedCollections(): Response<List<com.scenicroutes.app.data.model.Collection>>

    // ==================== Leaderboard ====================
    @GET("leaderboard/top-rated")
    suspend fun getLeaderboardTopRatedRoads(
        @Query("limit") limit: Int? = null,
    ): Response<List<SavedRoad>>

    @GET("leaderboard/most-reviewed")
    suspend fun getLeaderboardMostReviewedRoads(
        @Query("limit") limit: Int? = null,
    ): Response<List<SavedRoad>>

    @GET("leaderboard/most-popular")
    suspend fun getLeaderboardMostPopularRoads(
        @Query("limit") limit: Int? = null,
    ): Response<List<SavedRoad>>

    @GET("leaderboard/popular-roads-by-country")
    suspend fun getLeaderboardPopularRoadsByCountry(
        @Query("limit") limit: Int? = null,
    ): Response<List<Map<String, Any>>> // Returns [{"country": "...", "roads": [...]}, ...]

    @GET("leaderboard/most-active-users")
    suspend fun getLeaderboardMostActiveUsers(
        @Query("limit") limit: Int? = null,
    ): Response<List<User>>

    @GET("leaderboard/most-followed-users")
    suspend fun getLeaderboardMostFollowedUsers(
        @Query("limit") limit: Int? = null,
    ): Response<List<User>>

    // Raw fallbacks for diagnosing malformed/partial JSON responses
    @GET("leaderboard/most-active-users")
    suspend fun getLeaderboardMostActiveUsersRaw(
        @Query("limit") limit: Int? = null,
    ): Response<ResponseBody>

    @GET("leaderboard/most-followed-users")
    suspend fun getLeaderboardMostFollowedUsersRaw(
        @Query("limit") limit: Int? = null,
    ): Response<ResponseBody>

    @GET("leaderboard/featured-collections")
    suspend fun getLeaderboardFeaturedCollections(
        @Query("limit") limit: Int? = null,
    ): Response<List<com.scenicroutes.app.data.model.Collection>>

    @GET("leaderboard/top-rated-collections")
    suspend fun getLeaderboardTopRatedCollections(
        @Query("limit") limit: Int? = null,
    ): Response<List<com.scenicroutes.app.data.model.Collection>>

    // ==================== Social ====================
    @GET("feed")
    suspend fun getFeed(@Header("Authorization") token: String): Response<Map<String, Any>>
    
    @GET("following")
    suspend fun getFollowing(
        @Header("Authorization") token: String,
        @Query("page") page: Int? = null,
        @Query("per_page") perPage: Int? = null,
    ): Response<PaginatedResponse<User>>
    
    @GET("followers")
    suspend fun getFollowers(
        @Header("Authorization") token: String,
        @Query("page") page: Int? = null,
        @Query("per_page") perPage: Int? = null,
    ): Response<PaginatedResponse<User>>

    @GET("users/search")
    suspend fun searchUsers(
        @Header("Authorization") token: String,
        @Query("query") query: String? = null,
        @Query("q") q: String? = null,
        @Query("country") country: String? = null,
        @Query("region") region: String? = null,
        @Query("sort_by") sortBy: String? = null, // popular, newest, most_roads, most_followers
        @Query("limit") limit: Int? = null,
    ): Response<UserSearchResponse>
    
    @GET("users/recommendations")
    suspend fun getUserRecommendations(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int? = null,
        @Query("type") type: String? = null, // all, similar_interests, same_location, popular
    ): Response<UserRecommendationsResponse>

    @GET("public/users/{id}")
    suspend fun getPublicUser(@Path("id") userId: Long): Response<User>

    @GET("users/{id}/stats")
    suspend fun getUserStats(
        @Header("Authorization") token: String,
        @Path("id") userId: Long,
    ): Response<Map<String, Any>>

    @GET("users/{id}/follow-status")
    suspend fun getFollowStatus(
        @Header("Authorization") token: String,
        @Path("id") userId: Long,
    ): Response<Map<String, Any>>

    @GET("public/users/{id}/roads")
    suspend fun getPublicUserRoads(@Path("id") userId: Long): Response<List<SavedRoad>>

    @GET("public/users/{id}/collections")
    suspend fun getPublicUserCollections(@Path("id") userId: Long): Response<List<com.scenicroutes.app.data.model.Collection>>

    @POST("users/{id}/follow")
    suspend fun followUser(
        @Header("Authorization") token: String,
        @Path("id") userId: Long,
    ): Response<ResponseBody>

    @DELETE("users/{id}/follow")
    suspend fun unfollowUser(
        @Header("Authorization") token: String,
        @Path("id") userId: Long,
    ): Response<ResponseBody>

    // ==================== Settings ====================
    @GET("settings")
    suspend fun getSettings(@Header("Authorization") token: String): Response<Map<String, Any>>

    @POST("settings")
    suspend fun updateSetting(
        @Header("Authorization") token: String,
        @Body request: com.scenicroutes.app.data.model.SettingsUpdateRequest,
    ): Response<Map<String, Any>>

    @POST("settings/batch")
    suspend fun updateSettingsBatch(
        @Header("Authorization") token: String,
        @Body request: com.scenicroutes.app.data.model.SettingsBatchUpdateRequest,
    ): Response<Map<String, Any>>

    // ==================== Tags ====================
    @GET("tags")
    suspend fun getAllTags(): Response<List<com.scenicroutes.app.data.model.Tag>>

    // ==================== Route Sharing ====================
    @POST("routes/share")
    suspend fun shareRoute(
        @Header("Authorization") token: String?,
        @Body request: RouteShareRequest,
    ): Response<Map<String, String>>

    @GET("routes/shared/{token}/stats")
    suspend fun getShareStats(
        @Header("Authorization") token: String,
        @Path("token") shareToken: String,
    ): Response<Map<String, Any>>

    // ==================== GPX Import/Export ====================
    @Multipart
    @POST("routes/import/gpx")
    suspend fun importGPX(
        @Header("Authorization") token: String?,
        @Part file: MultipartBody.Part,
    ): Response<Map<String, Any>>

    @GET("routes/{id}/gpx")
    suspend fun exportRouteToGPX(
        @Header("Authorization") token: String?,
        @Path("id") routeId: Long,
    ): Response<ResponseBody>

    @GET("saved-roads/{id}/gpx")
    suspend fun exportSavedRoadToGPX(
        @Header("Authorization") token: String?,
        @Path("id") roadId: Long,
    ): Response<ResponseBody>

    @GET("collections/{id}/gpx")
    suspend fun exportCollectionToGPX(
        @Header("Authorization") token: String?,
        @Path("id") collectionId: Long,
    ): Response<ResponseBody>

    // ==================== Telemetry ====================
    @POST("telemetry")
    suspend fun logTelemetryEvent(@Body event: Map<String, Any?>): Response<ResponseBody>

    // ==================== Subscriptions ====================
    @GET("subscriptions/current")
    suspend fun getCurrentSubscription(@Header("Authorization") token: String): Response<com.scenicroutes.app.data.model.SubscriptionResponse>

    @GET("subscriptions/plans")
    suspend fun getSubscriptionPlans(): Response<Map<String, Any>>

    @GET("subscriptions/usage")
    suspend fun getSubscriptionUsage(@Header("Authorization") token: String): Response<SubscriptionUsage>
    
    @GET("subscriptions/usage")
    suspend fun getUsageStatistics(
        @Header("Authorization") token: String,
        @Query("period") period: String = "month",
    ): Response<com.scenicroutes.app.data.model.UsageStatistics>

    @POST("subscriptions/checkout")
    suspend fun createCheckout(
        @Header("Authorization") token: String,
        @Body request: Map<String, String>,
    ): Response<Map<String, String>>

    @POST("subscriptions/verify")
    suspend fun verifySubscription(
        @Header("Authorization") token: String,
    ): Response<Map<String, Any>>
    @POST("subscriptions/cancel")
    suspend fun cancelSubscription(
        @Header("Authorization") token: String,
        @Body request: Map<String, Boolean> = mapOf("at_period_end" to true),
    ): Response<Subscription>

    @POST("subscriptions/resume")
    suspend fun resumeSubscription(@Header("Authorization") token: String): Response<Subscription>

    @POST("subscriptions/payment-method")
    suspend fun updatePaymentMethod(@Header("Authorization") token: String): Response<Map<String, String>>
    
    // ==================== Google Play Billing ====================
    @POST("google-play/verify")
    suspend fun verifyGooglePlayPurchase(
        @Header("Authorization") authorization: String,
        @Body request: Map<String, String>,
    ): Response<Map<String, Any>>

    // Overloaded version with individual parameters for convenience
    suspend fun verifyGooglePlayPurchase(
        authorization: String,
        productId: String,
        purchaseToken: String,
    ): Response<Map<String, Any>> {
        return verifyGooglePlayPurchase(
            authorization = authorization,
            request = mapOf(
                "product_id" to productId,
                "purchase_token" to purchaseToken,
            ),
        )
    }

    @POST("google-play/sync")
    suspend fun syncGooglePlaySubscription(
        @Header("Authorization") authorization: String,
        @Body request: Map<String, String>,
    ): Response<Map<String, Any>>

    // Overloaded version with individual parameters for convenience
    suspend fun syncGooglePlaySubscription(
        authorization: String,
        productId: String,
        purchaseToken: String,
    ): Response<Map<String, Any>> {
        return syncGooglePlaySubscription(
            authorization = authorization,
            request = mapOf(
                "product_id" to productId,
                "purchase_token" to purchaseToken,
            ),
        )
    }
}
