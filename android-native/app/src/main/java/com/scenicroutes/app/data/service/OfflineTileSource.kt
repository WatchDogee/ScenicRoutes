package com.scenicroutes.app.data.service

import android.content.Context
import org.osmdroid.tileprovider.tilesource.OnlineTileSourceBase
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import java.io.File
import java.io.InputStream

/**
 * Custom offline tile source that checks local cache first, then falls back to online
 * Uses OSMDroid's tile caching system with offline-first strategy
 */
class OfflineTileSource(
    private val context: Context,
    private val downloadedRegionIds: Set<String> = emptySet(),
) : OnlineTileSourceBase("offline-first", 1, 20, 256, "", arrayOf("https://tile.openstreetmap.org")) {
    
    private val offlineTilesDir = File(context.filesDir, "offline/tiles")
    
    override fun getTileURLString(aTileIndex: Long): String {
        // Fall back to online tiles - we'll intercept tile loading elsewhere
        return (TileSourceFactory.MAPNIK as? OnlineTileSourceBase)?.getTileURLString(aTileIndex) 
            ?: "https://tile.openstreetmap.org/\${z}/\${x}/\${y}.png"
    }
    
    /**
     * Check if a tile exists in offline cache for any of the downloaded regions
     */
    fun getOfflineTile(zoom: Int, x: Int, y: Int): InputStream? {
        // Try to find tile in any of the downloaded regions
        for (regionId in downloadedRegionIds) {
            val tileFile = File(offlineTilesDir, "$regionId/$zoom/$x/$y.png")
            if (tileFile.exists() && tileFile.length() > 0) {
                return tileFile.inputStream()
            }
        }
        return null
    }
    
    /**
     * Update which regions are available offline
     */
    fun updateDownloadedRegions(regionIds: Set<String>) {
        // This would require creating a new instance, so better to handle in service
    }
}
