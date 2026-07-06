package com.scenicroutes.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.searchHistoryDataStore: DataStore<Preferences> by preferencesDataStore(name = "search_history")

data class SearchHistoryItem(
    val id: String,
    val query: String,
    val lat: Double? = null,
    val lon: Double? = null,
    val radius: Double? = null,
    val roadType: String? = null,
    val curvatureType: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
)

class SearchHistoryManager(private val context: Context) {
    private val historyKey = stringPreferencesKey("search_history")
    private val gson = Gson()
    private val maxHistorySize = 20

    val history: Flow<List<SearchHistoryItem>> = context.searchHistoryDataStore.data.map { preferences ->
        val historyJson = preferences[historyKey] ?: "[]"
        try {
            val type = object : TypeToken<List<SearchHistoryItem>>() {}.type
            gson.fromJson<List<SearchHistoryItem>>(historyJson, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    suspend fun addSearch(
        query: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        radius: Double? = null,
        roadType: String? = null,
        curvatureType: String? = null,
    ) {
        context.searchHistoryDataStore.edit { preferences ->
            val currentHistory = try {
                val historyJson = preferences[historyKey] ?: "[]"
                val type = object : TypeToken<List<SearchHistoryItem>>() {}.type
                gson.fromJson<List<SearchHistoryItem>>(historyJson, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }

            val newItem = SearchHistoryItem(
                id = System.currentTimeMillis().toString(),
                query = query ?: "Road Search",
                lat = lat,
                lon = lon,
                radius = radius,
                roadType = roadType,
                curvatureType = curvatureType,
                timestamp = System.currentTimeMillis(),
            )

            // Remove duplicates (same query/location) and add new item at the beginning
            val filteredHistory = currentHistory.filterNot {
                it.query == newItem.query &&
                    it.lat == newItem.lat &&
                    it.lon == newItem.lon &&
                    it.roadType == newItem.roadType &&
                    it.curvatureType == newItem.curvatureType
            }

            val updatedHistory = (listOf(newItem) + filteredHistory).take(maxHistorySize)
            preferences[historyKey] = gson.toJson(updatedHistory)
        }
    }

    suspend fun clearHistory() {
        context.searchHistoryDataStore.edit { preferences ->
            preferences.remove(historyKey)
        }
    }

    suspend fun removeSearch(itemId: String) {
        context.searchHistoryDataStore.edit { preferences ->
            val currentHistory = try {
                val historyJson = preferences[historyKey] ?: "[]"
                val type = object : TypeToken<List<SearchHistoryItem>>() {}.type
                gson.fromJson<List<SearchHistoryItem>>(historyJson, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
            preferences[historyKey] = gson.toJson(currentHistory.filter { it.id != itemId })
        }
    }
}
















