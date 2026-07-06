package com.scenicroutes.app.data.service

import android.content.Context
import com.scenicroutes.app.data.api.BoundsData
import com.scenicroutes.app.data.api.CustomRegionRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import org.osmdroid.tileprovider.tilesource.ITileSource
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.util.BoundingBox
import java.io.FileOutputStream
import java.net.URL
import java.io.File

// Manifest entry describing a downloadable region package
data class OfflineRegionManifest(
    val id: String,
    val name: String,
    val latNorth: Double,
    val lonEast: Double,
    val latSouth: Double,
    val lonWest: Double,
    val zoomStart: Int,
    val zoomEnd: Int,
    val version: String = "v1",
    val avgTileBytes: Long = 6_000L,
)

data class OfflineMapRegion(
    val id: String,
    val name: String,
    val bounds: BoundingBox,
    val zoomLevels: IntRange = 10..15,
    val sizeBytes: Long = 0L,
    val downloadedBytes: Long? = null,
    val status: String = "not_downloaded", // not_downloaded, downloading, downloaded, error
    val lastUpdated: Long? = null,
    val customRadius: Double? = null, // Radius in km for custom circular areas
)

class OfflineMapsService(private val context: Context) {
    // Store tiles in filesDir so they persist across cache clears and are visible under app files
    private val tileCacheDir = File(context.filesDir, "offline/tiles")
    private val regionsFile = File(context.filesDir, "offline_regions.json")
    private val progressFile = File(context.filesDir, "offline_regions_progress.json")

    private val _downloadedRegions = MutableStateFlow<List<OfflineMapRegion>>(emptyList())
    val downloadedRegions: StateFlow<List<OfflineMapRegion>> = _downloadedRegions.asStateFlow()

    private val _downloadProgress = MutableStateFlow<Map<String, DownloadProgress>>(emptyMap())
    val downloadProgress: StateFlow<Map<String, DownloadProgress>> = _downloadProgress.asStateFlow()

    data class DownloadProgress(
        val regionId: String,
        val totalTiles: Int,
        val downloadedTiles: Int,
        val isComplete: Boolean = false,
        val error: String? = null,
    )

    init {
        loadDownloadedRegions()
        loadPersistedProgress()
    }

    /**
     * Fetch available regions from the backend API. Falls back to bundled manifest if API fails.
     */
    suspend fun fetchAvailableRegionsFromApi(): List<OfflineMapRegion> {
        return withContext(Dispatchers.IO) {
            try {
                val api = com.scenicroutes.app.data.network.NetworkModule.apiService
                val resp = api.getOfflineMapRegions()
                if (resp.isSuccessful) {
                    val body = resp.body() ?: emptyList()
                    body.mapNotNull { item ->
                        try {
                            val id = (item["id"] as? String)
                                ?: (item["region_id"] as? String)
                                ?: return@mapNotNull null
                            val name = (item["name"] as? String) ?: return@mapNotNull null
                            val boundsAny = item["bounds"] as? Map<*, *> ?: return@mapNotNull null
                            val south = (boundsAny["south"] as? Number)?.toDouble() ?: return@mapNotNull null
                            val west = (boundsAny["west"] as? Number)?.toDouble() ?: return@mapNotNull null
                            val north = (boundsAny["north"] as? Number)?.toDouble() ?: return@mapNotNull null
                            val east = (boundsAny["east"] as? Number)?.toDouble() ?: return@mapNotNull null

                            val zoomLevelsRaw = (item["zoom_levels"] as? List<*>)?.mapNotNull { (it as? Number)?.toInt() }
                            val zoomRange = if (!zoomLevelsRaw.isNullOrEmpty()) {
                                val minZ = zoomLevelsRaw.minOrNull() ?: 10
                                val maxZ = zoomLevelsRaw.maxOrNull() ?: 15
                                (minZ..maxZ)
                            } else 10..15

                            val bounds = BoundingBox(north, east, south, west)
                            OfflineMapRegion(
                                id = id,
                                name = name,
                                bounds = bounds,
                                zoomLevels = zoomRange,
                                sizeBytes = estimateRegionSizeBytes(
                                    OfflineMapRegion(id, name, bounds, zoomRange),
                                ),
                                lastUpdated = System.currentTimeMillis(),
                            )
                        } catch (e: Exception) {
                            android.util.Log.e("OfflineMapsService", "Error mapping region: ${e.message}")
                            null
                        }
                    }
                } else {
                    android.util.Log.e("OfflineMapsService", "getOfflineMapRegions() failed: ${resp.code()}")
                    loadManifestRegions()
                }
            } catch (e: Exception) {
                android.util.Log.e("OfflineMapsService", "Exception getting regions: ${e.message}", e)
                loadManifestRegions()
            }
        }
    }

    fun loadManifestRegions(): List<OfflineMapRegion> {
        return runCatching {
            val raw = context.assets.open("offline_regions_manifest.json").bufferedReader().use { it.readText() }
            val arr = org.json.JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    val entry = OfflineRegionManifest(
                        id = obj.getString("id"),
                        name = obj.getString("name"),
                        latNorth = obj.getDouble("latNorth"),
                        lonEast = obj.getDouble("lonEast"),
                        latSouth = obj.getDouble("latSouth"),
                        lonWest = obj.getDouble("lonWest"),
                        zoomStart = obj.getInt("zoomStart"),
                        zoomEnd = obj.getInt("zoomEnd"),
                        version = obj.optString("version", "v1"),
                        avgTileBytes = obj.optLong("avgTileBytes", 6_000L),
                    )
                    val bounds = BoundingBox(entry.latNorth, entry.lonEast, entry.latSouth, entry.lonWest)
                    add(
                        OfflineMapRegion(
                            id = entry.id,
                            name = entry.name,
                            bounds = bounds,
                            zoomLevels = entry.zoomStart..entry.zoomEnd,
                            sizeBytes = estimateRegionSizeBytes(
                                OfflineMapRegion(entry.id, entry.name, bounds, entry.zoomStart..entry.zoomEnd),
                                avgTileBytesOverride = entry.avgTileBytes,
                            ),
                            lastUpdated = System.currentTimeMillis(),
                        ),
                    )
                }
            }
        }.onFailure {
            android.util.Log.e("OfflineMapsService", "Failed to load manifest: ${it.message}", it)
        }.getOrDefault(emptyList())
    }

    private fun loadDownloadedRegions() {
        // Load saved regions from storage
        if (regionsFile.exists()) {
            runCatching {
                val raw = regionsFile.readText()
                val arr = org.json.JSONArray(raw)
                val restored = mutableListOf<OfflineMapRegion>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    restored.add(
                        OfflineMapRegion(
                            id = obj.getString("id"),
                            name = obj.getString("name"),
                            bounds = BoundingBox(
                                obj.getDouble("latNorth"),
                                obj.getDouble("lonEast"),
                                obj.getDouble("latSouth"),
                                obj.getDouble("lonWest"),
                            ),
                            zoomLevels = (obj.optInt("zoomStart", 10))..(obj.optInt("zoomEnd", 15)),
                            sizeBytes = obj.optLong("sizeBytes", 0L),
                            downloadedBytes = obj.optLong("downloadedBytes", 0L).takeIf { it > 0 },
                            status = obj.optString("status", "downloaded"),
                            lastUpdated = obj.optLong("lastUpdated", 0L).takeIf { it > 0 },
                        )
                    )
                }
                _downloadedRegions.value = restored
            }.onFailure {
                android.util.Log.e("OfflineMapsService", "Error loading regions: ${it.message}", it)
                _downloadedRegions.value = emptyList()
            }
        } else {
            _downloadedRegions.value = emptyList()
        }
    }

    fun getStorageUsage(): Long {
        return if (tileCacheDir.exists()) {
            tileCacheDir.walkTopDown().sumOf { it.length() }
        } else {
            0L
        }
    }

    fun getRegionStorageSizeMB(regionId: String): Long {
        val regionDir = File(tileCacheDir, regionId)
        if (!regionDir.exists()) return 0L
        val bytes = regionDir.walkTopDown().filter { it.isFile }.sumOf { it.length() }
        return (bytes / 1024L / 1024L)
    }

    suspend fun downloadRegion(region: OfflineMapRegion, tileSource: ITileSource = TileSourceFactory.MAPNIK) {
        // Heavy I/O: ensure we run off the main thread
        withContext(Dispatchers.IO) {
        val regionId = region.id
        val bounds = region.bounds
        val zoomLevels = region.zoomLevels

        // Calculate total tiles
        val totalTiles = zoomLevels.sumOf { calculateTileCount(bounds, it) }
        val estimatedBytes = estimateRegionSizeBytes(region.copy(sizeBytes = 0L))

        _downloadProgress.value = _downloadProgress.value.toMutableMap().apply {
            put(regionId, DownloadProgress(regionId, totalTiles.toInt(), 0))
        }
        persistProgress()

        try {
            var downloadedCount = 0L
            var downloadedBytes = 0L

            for (zoom in zoomLevels) {
                val result = downloadTilesForZoom(regionId, bounds, zoom, tileSource) { downloadedInZoom ->
                    _downloadProgress.value = _downloadProgress.value.toMutableMap().apply {
                        val currentTotal = (downloadedCount + downloadedInZoom).coerceAtMost(totalTiles)
                        put(regionId, DownloadProgress(regionId, totalTiles.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(), currentTotal.coerceAtMost(Int.MAX_VALUE.toLong()).toInt()))
                    }
                    persistProgress()
                }
                downloadedCount += result.first
                downloadedBytes += result.second
            }

            // Mark as complete
            _downloadProgress.value = _downloadProgress.value.toMutableMap().apply {
                put(regionId, DownloadProgress(regionId, totalTiles.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(), downloadedCount.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(), isComplete = true))
            }

            // Add to downloaded regions
            val updatedRegions = _downloadedRegions.value.toMutableList()
            updatedRegions.removeAll { it.id == region.id }
            updatedRegions.add(
                region.copy(
                    sizeBytes = estimatedBytes,
                    downloadedBytes = downloadedBytes.takeIf { it > 0 } ?: estimatedBytes,
                    status = "downloaded",
                    lastUpdated = System.currentTimeMillis(),
                )
            )
            _downloadedRegions.value = updatedRegions

            // Save to storage
            saveDownloadedRegions()
            clearProgress(regionId)
        } catch (e: Exception) {
            android.util.Log.e("OfflineMapsService", "Error downloading region: ${e.message}", e)
            _downloadProgress.value = _downloadProgress.value.toMutableMap().apply {
                put(regionId, DownloadProgress(regionId, totalTiles.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(), 0, error = e.message))
            }
            persistProgress()
        }
        }
    }

    private fun calculateTileCount(bounds: BoundingBox, zoom: Int): Long {
        val minTileX = lon2tile(bounds.lonWest, zoom)
        val maxTileX = lon2tile(bounds.lonEast, zoom)
        val minTileY = lat2tile(bounds.latNorth, zoom)
        val maxTileY = lat2tile(bounds.latSouth, zoom)

        val tilesX = (maxTileX - minTileX + 1).coerceAtLeast(0)
        val tilesY = (maxTileY - minTileY + 1).coerceAtLeast(0)
        return tilesX * tilesY
    }

    @Suppress("UNUSED_PARAMETER")
    private suspend fun downloadTilesForZoom(
        regionId: String,
        bounds: BoundingBox,
        zoom: Int,
        tileSource: ITileSource,
        onProgress: (Long) -> Unit,
    ): Pair<Long, Long> {
        return withContext(Dispatchers.IO) {
            val minTileX = lon2tile(bounds.lonWest, zoom)
            val maxTileX = lon2tile(bounds.lonEast, zoom)
            val minTileY = lat2tile(bounds.latNorth, zoom)
            val maxTileY = lat2tile(bounds.latSouth, zoom)

            var downloaded = 0L
            var downloadedBytes = 0L

            for (x in minTileX..maxTileX) {
                for (y in minTileY..maxTileY) {
                    try {
                        val tileFile = getTileFile(tileSource, regionId, zoom, x, y)
                        if (tileFile.exists() && tileFile.length() > 0) {
                            android.util.Log.d("OfflineMapsService", "Using cached tile: $zoom/$x/$y (${tileFile.length()} bytes)")
                            downloaded++
                            if (downloaded % 50L == 0L) {
                                onProgress(downloaded)
                            }
                            continue
                        }

                        val url = (tileSource as? OnlineTileSourceBase)
                            ?.getTileURLString(buildTileIndex(zoom, x.toInt(), y.toInt()))
                            ?: return@withContext Pair(downloaded, downloadedBytes)
                        android.util.Log.d("OfflineMapsService", "Downloading tile: $zoom/$x/$y from $url")
                        val conn = URL(url).openConnection()
                        conn.connectTimeout = 7000
                        conn.readTimeout = 7000
                        conn.getInputStream().use { input ->
                            tileFile.parentFile?.mkdirs()
                            FileOutputStream(tileFile).use { output ->
                                val bytes = input.readBytes()
                                output.write(bytes)
                                downloadedBytes += bytes.size
                                android.util.Log.d("OfflineMapsService", "Downloaded tile: $zoom/$x/$y (${bytes.size} bytes)")
                            }
                        }
                        downloaded++
                        if (downloaded % 20L == 0L) {
                            onProgress(downloaded)
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("OfflineMapsService", "Error downloading tile $zoom/$x/$y: ${e.message}", e)
                    }
                }
            }

            onProgress(downloaded)
            Pair(downloaded, downloadedBytes)
        }
    }

    private fun getTileFile(tileSource: ITileSource, regionId: String, zoom: Int, x: Long, y: Long): File {
        // Store tiles in OSMDroid-compatible structure: /tiles/{source}/{zoom}/{x}/{y}.png
        // This allows OSMDroid to automatically use offline tiles when no internet
        val sourceName = tileSource.name()
        val tileFile = File(tileCacheDir, "$sourceName/$zoom/$x/$y.png")
        
        // Log source name on first call per zoom level (to avoid spam)
        if (x == 0L && y == 0L) {
            android.util.Log.d("OfflineMapsService", "getTileFile: source='$sourceName', zoom=$zoom, tileFile=$tileFile")
        }
        
        return tileFile
    }

    fun estimateRegionSizeBytes(region: OfflineMapRegion, avgTileBytesOverride: Long? = null): Long {
        val totalTiles = region.zoomLevels.sumOf { calculateTileCount(region.bounds, it) }
        val avgTileBytes = avgTileBytesOverride ?: 6_000L
        val estimated = totalTiles * avgTileBytes
        return estimated.coerceIn(0, 1_500_000_000L)
    }

    fun estimateRegionSizeMB(region: OfflineMapRegion): Double {
        return estimateRegionSizeBytes(region) / 1024.0 / 1024.0
    }

    fun totalTiles(region: OfflineMapRegion): Long {
        return region.zoomLevels.sumOf { calculateTileCount(region.bounds, it) }
    }

    fun deleteRegion(regionId: String) {
        val updatedRegions = _downloadedRegions.value.filter { it.id != regionId }
        _downloadedRegions.value = updatedRegions

        val updatedProgress = _downloadProgress.value.toMutableMap()
        updatedProgress.remove(regionId)
        _downloadProgress.value = updatedProgress

        // Delete region tiles
        File(tileCacheDir, regionId).deleteRecursively()

        saveDownloadedRegions()
        persistProgress()
    }

    private fun saveDownloadedRegions() {
        runCatching {
            val arr = org.json.JSONArray()
            _downloadedRegions.value.forEach { region ->
                val obj = org.json.JSONObject()
                obj.put("id", region.id)
                obj.put("name", region.name)
                obj.put("latNorth", region.bounds.latNorth)
                obj.put("lonEast", region.bounds.lonEast)
                obj.put("latSouth", region.bounds.latSouth)
                obj.put("lonWest", region.bounds.lonWest)
                obj.put("zoomStart", region.zoomLevels.first)
                obj.put("zoomEnd", region.zoomLevels.last)
                obj.put("sizeBytes", region.sizeBytes)
                region.downloadedBytes?.let { obj.put("downloadedBytes", it) }
                obj.put("status", region.status)
                region.lastUpdated?.let { obj.put("lastUpdated", it) }
                arr.put(obj)
            }
            regionsFile.writeText(arr.toString())
        }.onFailure {
            android.util.Log.e("OfflineMapsService", "Error saving regions: ${it.message}", it)
        }
    }

    private fun persistProgress() {
        runCatching {
            val arr = org.json.JSONArray()
            _downloadProgress.value.values.forEach { progress ->
                val obj = org.json.JSONObject()
                obj.put("regionId", progress.regionId)
                obj.put("totalTiles", progress.totalTiles)
                obj.put("downloadedTiles", progress.downloadedTiles)
                obj.put("isComplete", progress.isComplete)
                progress.error?.let { obj.put("error", it) }
                arr.put(obj)
            }
            progressFile.writeText(arr.toString())
        }.onFailure {
            android.util.Log.e("OfflineMapsService", "Error saving progress: ${it.message}", it)
        }
    }

    private fun loadPersistedProgress() {
        if (!progressFile.exists()) return
        runCatching {
            val raw = progressFile.readText()
            val arr = org.json.JSONArray(raw)
            val restored = mutableMapOf<String, DownloadProgress>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val regionId = obj.getString("regionId")
                restored[regionId] = DownloadProgress(
                    regionId = regionId,
                    totalTiles = obj.getInt("totalTiles"),
                    downloadedTiles = obj.getInt("downloadedTiles"),
                    isComplete = obj.optBoolean("isComplete", false),
                    error = obj.optString("error", null),
                )
            }
            _downloadProgress.value = restored
        }.onFailure {
            android.util.Log.e("OfflineMapsService", "Error loading progress: ${it.message}", it)
        }
    }

    private fun clearProgress(regionId: String) {
        _downloadProgress.value = _downloadProgress.value.toMutableMap().apply { remove(regionId) }
        persistProgress()
    }

    // Helper functions for tile calculations
    private fun lon2tile(lon: Double, zoom: Int): Long {
        return ((lon + 180.0) / 360.0 * (1L shl zoom)).toLong()
    }

    private fun lat2tile(lat: Double, zoom: Int): Long {
        val latRad = Math.toRadians(lat)
        return ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0 * (1L shl zoom)).toLong()
    }

    // Local helper to avoid dependency on MapTileIndex (same bit layout as osmdroid)
    private fun buildTileIndex(zoom: Int, x: Int, y: Int): Long {
        return (zoom.toLong() shl 58) or (x.toLong() shl 29) or y.toLong()
    }

    /**
     * Fetch saved offline regions from the API (website)
     */
    suspend fun fetchSavedRegionsFromApi(token: String): List<Map<String, Any>> {
        return withContext(Dispatchers.IO) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val response = apiService.getSavedOfflineRegions("Bearer $token")
                if (response.isSuccessful) {
                    response.body() ?: emptyList()
                } else {
                    android.util.Log.e("OfflineMapsService", "Error fetching saved regions: ${response.code()}")
                    emptyList()
                }
            } catch (e: Exception) {
                android.util.Log.e("OfflineMapsService", "Exception fetching saved regions: ${e.message}", e)
                emptyList()
            }
        }
    }

    /**
     * Upload a custom region to the API
     */
    suspend fun uploadCustomRegion(token: String, region: OfflineMapRegion): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val request = CustomRegionRequest(
                    region_id = region.id,
                    region_name = region.name,
                    bounds = BoundsData(
                        south = region.bounds.latSouth,
                        west = region.bounds.lonWest,
                        north = region.bounds.latNorth,
                        east = region.bounds.lonEast,
                    ),
                    zoom_levels = region.zoomLevels.toList(),
                    radius_km = region.customRadius
                )

                val response = apiService.saveCustomOfflineRegion("Bearer $token", request)
                response.isSuccessful.also { success ->
                    if (success) {
                        android.util.Log.d("OfflineMapsService", "Custom region uploaded: ${region.id}")
                    } else {
                        android.util.Log.e("OfflineMapsService", "Error uploading custom region: ${response.code()}")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("OfflineMapsService", "Exception uploading custom region: ${e.message}", e)
                false
            }
        }
    }

    /**
     * Report a locally downloaded region to the API
     */
    suspend fun reportDownloadedRegion(token: String, regionId: String, regionName: String, sizeMb: Long, bounds: BoundingBox? = null, zoomLevels: IntRange? = null): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val request = mutableMapOf<String, Any>(
                    "region_id" to regionId,
                    "region_name" to regionName,
                    "size_mb" to sizeMb,
                    "download_date" to System.currentTimeMillis()
                )
                bounds?.let {
                    request["bounds"] = mapOf(
                        "south" to it.latSouth,
                        "west" to it.lonWest,
                        "north" to it.latNorth,
                        "east" to it.lonEast,
                    )
                }
                zoomLevels?.let {
                    request["zoom_levels"] = it.toList()
                }
                val response = apiService.reportOfflineRegionDownload("Bearer $token", request)
                response.isSuccessful.also { success ->
                    if (!success) {
                        android.util.Log.e("OfflineMapsService", "Error reporting download: ${response.code()}")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("OfflineMapsService", "Exception reporting download: ${e.message}", e)
                false
            }
        }
    }

    /**
     * Fetch server-known downloaded region IDs
     */
    suspend fun getServerDownloadedRegionIds(token: String): Set<String> {
        return withContext(Dispatchers.IO) {
            try {
                val apiService = com.scenicroutes.app.data.network.NetworkModule.apiService
                val response = apiService.getDownloadedOfflineRegions("Bearer $token")
                if (response.isSuccessful) {
                    val body = response.body() ?: emptyList()
                    body.mapNotNull { (it["region_id"] as? String) }.toSet()
                } else {
                    android.util.Log.e("OfflineMapsService", "Error fetching server downloads: ${response.code()}")
                    emptySet()
                }
            } catch (e: Exception) {
                android.util.Log.e("OfflineMapsService", "Exception fetching server downloads: ${e.message}", e)
                emptySet()
            }
        }
    }

    /**
     * Sync any locally downloaded regions to the server if missing
     */
    suspend fun syncDownloadedRegionsToServer(token: String) {
        withContext(Dispatchers.IO) {
            try {
                val serverIds = getServerDownloadedRegionIds(token)
                _downloadedRegions.value.forEach { local ->
                    if (local.id !in serverIds) {
                        val actualMb = getRegionStorageSizeMB(local.id)
                        val sizeMb = if (actualMb > 0L) actualMb else ((local.downloadedBytes ?: estimateRegionSizeBytes(local)) / 1024.0 / 1024.0).toLong()
                        val ok = reportDownloadedRegion(
                            token,
                            local.id,
                            local.name,
                            sizeMb,
                            local.bounds,
                            local.zoomLevels,
                        )
                        android.util.Log.d("OfflineMapsService", "Sync reported ${local.name}: ${ok}")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("OfflineMapsService", "Sync error: ${e.message}", e)
            }
        }
    }
}
