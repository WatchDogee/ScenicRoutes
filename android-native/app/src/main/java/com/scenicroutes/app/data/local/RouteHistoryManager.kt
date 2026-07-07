package com.scenicroutes.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.scenicroutes.app.data.model.Route
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.routeHistoryDataStore: DataStore<Preferences> by preferencesDataStore(name = "route_history")

data class RouteHistoryItem(
    val id: String,
    val route: Route,
    val startLocation: String,
    val endLocation: String,
    val routeType: String? = null, // "straightest", "curved", "mellow", "round_trip"
    val timestamp: Long = System.currentTimeMillis(),
    val waypointsCount: Int = 0,
)

class RouteHistoryManager(private val context: Context) {
    private val historyKey = stringPreferencesKey("route_history")
    private val gson = Gson()
    private val maxHistorySize = 50

    val history: Flow<List<RouteHistoryItem>> = context.routeHistoryDataStore.data.map { preferences ->
        val historyJson = preferences[historyKey] ?: "[]"
        try {
            val type = object : TypeToken<List<RouteHistoryItem>>() {}.type
            gson.fromJson<List<RouteHistoryItem>>(historyJson, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun addRoute(
        route: Route,
        startLocation: String,
        endLocation: String,
        routeType: String? = null,
        waypointsCount: Int = 0,
    ) {
        context.routeHistoryDataStore.edit { preferences ->
            val currentHistory = try {
                val historyJson = preferences[historyKey] ?: "[]"
                val type = object : TypeToken<List<RouteHistoryItem>>() {}.type
                gson.fromJson<List<RouteHistoryItem>>(historyJson, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }

            val newItem = RouteHistoryItem(
                id = System.currentTimeMillis().toString(),
                route = route,
                startLocation = startLocation,
                endLocation = endLocation,
                routeType = routeType,
                timestamp = System.currentTimeMillis(),
                waypointsCount = waypointsCount,
            )

            // Remove duplicates (same start/end locations) and add new item at the beginning
            val filteredHistory = currentHistory.filterNot {
                it.startLocation == newItem.startLocation &&
                    it.endLocation == newItem.endLocation &&
                    it.routeType == newItem.routeType
            }

            val updatedHistory = (listOf(newItem) + filteredHistory).take(maxHistorySize)
            preferences[historyKey] = gson.toJson(updatedHistory)
        }
    }

    suspend fun clearHistory() {
        context.routeHistoryDataStore.edit { preferences ->
            preferences.remove(historyKey)
        }
    }

    suspend fun removeRoute(itemId: String) {
        context.routeHistoryDataStore.edit { preferences ->
            val currentHistory = try {
                val historyJson = preferences[historyKey] ?: "[]"
                val type = object : TypeToken<List<RouteHistoryItem>>() {}.type
                gson.fromJson<List<RouteHistoryItem>>(historyJson, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
            preferences[historyKey] = gson.toJson(currentHistory.filter { it.id != itemId })
        }
    }
}
















