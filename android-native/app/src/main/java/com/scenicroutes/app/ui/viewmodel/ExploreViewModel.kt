package com.scenicroutes.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.model.Collection
import com.scenicroutes.app.data.model.SavedRoad
import com.scenicroutes.app.data.network.NetworkModule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ExploreViewModel : ViewModel() {
    private val apiService = NetworkModule.apiService

    private val _collections = MutableStateFlow<List<Collection>>(emptyList())
    val collections: StateFlow<List<Collection>> = _collections.asStateFlow()

    private val _topRatedRoads = MutableStateFlow<List<SavedRoad>>(emptyList())
    val topRatedRoads: StateFlow<List<SavedRoad>> = _topRatedRoads.asStateFlow()

    private val _featuredCollections = MutableStateFlow<List<Collection>>(emptyList())
    val featuredCollections: StateFlow<List<Collection>> = _featuredCollections.asStateFlow()

    private val _mostReviewedRoads = MutableStateFlow<List<SavedRoad>>(emptyList())
    val mostReviewedRoads: StateFlow<List<SavedRoad>> = _mostReviewedRoads.asStateFlow()

    private val _popularRoadsByCountry = MutableStateFlow<Map<String, List<SavedRoad>>>(emptyMap())
    val popularRoadsByCountry: StateFlow<Map<String, List<SavedRoad>>> = _popularRoadsByCountry.asStateFlow()

    private val _mostActiveUsers = MutableStateFlow<List<com.scenicroutes.app.data.model.User>>(emptyList())
    val mostActiveUsers: StateFlow<List<com.scenicroutes.app.data.model.User>> = _mostActiveUsers.asStateFlow()

    private val _mostFollowedUsers = MutableStateFlow<List<com.scenicroutes.app.data.model.User>>(emptyList())
    val mostFollowedUsers: StateFlow<List<com.scenicroutes.app.data.model.User>> = _mostFollowedUsers.asStateFlow()

    private val _topRatedCollections = MutableStateFlow<List<Collection>>(emptyList())
    val topRatedCollections: StateFlow<List<Collection>> = _topRatedCollections.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            // Load public collections
            try {
                val collectionsResponse = apiService.getPublicCollections()
                if (collectionsResponse.isSuccessful) {
                    _collections.value = collectionsResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }

            // Load top rated roads
            try {
                val roadsResponse = apiService.getTopRatedRoads()
                if (roadsResponse.isSuccessful) {
                    _topRatedRoads.value = roadsResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }

            // Load featured collections
            try {
                val featuredResponse = apiService.getFeaturedCollections()
                if (featuredResponse.isSuccessful) {
                    _featuredCollections.value = featuredResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }

            // Load most reviewed roads
            try {
                val mostReviewedResponse = apiService.getMostReviewedRoads()
                if (mostReviewedResponse.isSuccessful) {
                    _mostReviewedRoads.value = mostReviewedResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }

            // Load popular roads by country
            try {
                val popularByCountryResponse = apiService.getPopularRoadsByCountry()
                if (popularByCountryResponse.isSuccessful) {
                    val responseBody = popularByCountryResponse.body()
                    if (responseBody != null) {
                        // API returns array of {country, roads}, convert to map
                        val countryMap = mutableMapOf<String, List<SavedRoad>>()
                        // Handle both array and map formats
                        if (responseBody is Map<*, *>) {
                            responseBody.forEach { entry: Map.Entry<*, *> ->
                                val key = entry.key
                                val value = entry.value
                                if (key is String && value is List<*>) {
                                    countryMap[key] = value.filterIsInstance<SavedRoad>()
                                }
                            }
                        }
                        _popularRoadsByCountry.value = countryMap
                    }
                }
            } catch (e: Exception) {
                // Handle error
            }

            // Load most active users
            try {
                val activeUsersResponse = apiService.getMostActiveUsers()
                if (activeUsersResponse.isSuccessful) {
                    _mostActiveUsers.value = activeUsersResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }

            // Load most followed users
            try {
                val followedUsersResponse = apiService.getMostFollowedUsers()
                if (followedUsersResponse.isSuccessful) {
                    _mostFollowedUsers.value = followedUsersResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }

            // Load top rated collections
            try {
                val topRatedCollectionsResponse = apiService.getTopRatedCollections()
                if (topRatedCollectionsResponse.isSuccessful) {
                    _topRatedCollections.value = topRatedCollectionsResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun refresh() {
        loadData()
    }
}
