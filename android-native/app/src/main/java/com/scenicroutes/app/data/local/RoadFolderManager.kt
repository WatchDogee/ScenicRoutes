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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.roadFoldersDataStore: DataStore<Preferences> by preferencesDataStore(name = "road_folders")

data class RoadFolder(
    val id: String,
    val name: String,
)

class RoadFolderManager(private val context: Context) {
    private val foldersKey = stringPreferencesKey("folders")
    private val roadFolderMapKey = stringPreferencesKey("road_folder_map")

    private val gson = Gson()

    val folders: Flow<List<RoadFolder>> = context.roadFoldersDataStore.data.map { preferences ->
        val foldersJson = preferences[foldersKey] ?: "[]"
        try {
            val type = object : TypeToken<List<RoadFolder>>() {}.type
            gson.fromJson<List<RoadFolder>>(foldersJson, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    val roadFolderMap: Flow<Map<Long, String>> = context.roadFoldersDataStore.data.map { preferences ->
        val mapJson = preferences[roadFolderMapKey] ?: "{}"
        try {
            val type = object : TypeToken<Map<String, String>>() {}.type
            val map = gson.fromJson<Map<String, String>>(mapJson, type) ?: emptyMap()
            map.mapKeys { it.key.toLong() }
        } catch (e: Exception) {
            emptyMap()
        }
    }

    suspend fun createFolder(name: String): RoadFolder {
        val folder = RoadFolder(
            id = System.currentTimeMillis().toString(),
            name = name,
        )
        context.roadFoldersDataStore.edit { preferences ->
            val currentFolders = try {
                val foldersJson = preferences[foldersKey] ?: "[]"
                val type = object : TypeToken<List<RoadFolder>>() {}.type
                gson.fromJson<List<RoadFolder>>(foldersJson, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
            preferences[foldersKey] = gson.toJson(currentFolders + folder)
        }
        return folder
    }

    suspend fun deleteFolder(folderId: String) {
        context.roadFoldersDataStore.edit { preferences ->
            val currentFolders = try {
                val foldersJson = preferences[foldersKey] ?: "[]"
                val type = object : TypeToken<List<RoadFolder>>() {}.type
                gson.fromJson<List<RoadFolder>>(foldersJson, type) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
            preferences[foldersKey] = gson.toJson(currentFolders.filter { it.id != folderId })

            // Remove folder from road assignments
            val currentMap = try {
                val mapJson = preferences[roadFolderMapKey] ?: "{}"
                val type = object : TypeToken<Map<String, String>>() {}.type
                gson.fromJson<Map<String, String>>(mapJson, type) ?: emptyMap()
            } catch (e: Exception) {
                emptyMap()
            }
            preferences[roadFolderMapKey] = gson.toJson(
                currentMap.filter { it.value != folderId },
            )
        }
    }

    suspend fun assignRoadToFolder(roadId: Long, folderId: String?) {
        context.roadFoldersDataStore.edit { preferences ->
            val currentMap = try {
                val mapJson = preferences[roadFolderMapKey] ?: "{}"
                val type = object : TypeToken<Map<String, String>>() {}.type
                gson.fromJson<Map<String, String>>(mapJson, type) ?: emptyMap()
            } catch (e: Exception) {
                emptyMap()
            }
            val updatedMap = if (folderId == null) {
                currentMap - roadId.toString()
            } else {
                currentMap + (roadId.toString() to folderId)
            }
            preferences[roadFolderMapKey] = gson.toJson(updatedMap)
        }
    }

    suspend fun getRoadFolder(roadId: Long): String? {
        val preferences = context.roadFoldersDataStore.data.first()
        val mapJson = preferences[roadFolderMapKey] ?: "{}"
        return try {
            val type = object : TypeToken<Map<String, String>>() {}.type
            val map = gson.fromJson<Map<String, String>>(mapJson, type) ?: emptyMap()
            map[roadId.toString()]
        } catch (e: Exception) {
            null
        }
    }
}
