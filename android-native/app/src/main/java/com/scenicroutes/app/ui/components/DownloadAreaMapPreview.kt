package com.scenicroutes.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView

/**
 * Map preview showing download area with affected regions
 * Displays a circle representing the download zone and highlights affected regions
 */
@Composable
fun DownloadAreaMapPreview(
    centerLat: Double,
    centerLon: Double,
    radiusKm: Double,
    affectedRegionCount: Int,
    estimatedTiles: Int,
    estimatedSizeMb: Double,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Map preview
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
            ),
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                // Small embedded map view
                OSMMapViewPreview(
                    centerLat = centerLat,
                    centerLon = centerLon,
                    radiusKm = radiusKm,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }

        // Download statistics
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // Location info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Center:",
                    style = MaterialTheme.typography.labelSmall,
                )
                Text(
                    text = "%.4f°N, %.4f°E".format(centerLat, centerLon),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Radius
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Radius:",
                    style = MaterialTheme.typography.labelSmall,
                )
                Text(
                    text = "%.1f km".format(radiusKm),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Divider(modifier = Modifier.padding(vertical = 4.dp))

            // Affected regions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Affected Regions:",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                )
                Text(
                    text = "$affectedRegionCount region${if (affectedRegionCount != 1) "s" else ""}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                )
            }

            // Estimated tiles
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Estimated Tiles:",
                    style = MaterialTheme.typography.labelSmall,
                )
                Text(
                    text = estimatedTiles.toString(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Estimated size with progress bar context
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Estimated Size:",
                    style = MaterialTheme.typography.labelSmall,
                )
                Text(
                    text = "%.1f MB".format(estimatedSizeMb),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (estimatedSizeMb > 500) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = if (estimatedSizeMb > 500) androidx.compose.ui.text.font.FontWeight.Bold else androidx.compose.ui.text.font.FontWeight.Normal,
                )
            }

            // Warning if over premium limit
            if (estimatedSizeMb > 500) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Text(
                        text = "⚠️ Exceeds Premium limit (500 MB). Upgrade to Pro for unlimited.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(8.dp),
                    )
                }
            }
        }
    }
}

/**
 * Lightweight OSM map preview showing download circle
 */
@Composable
fun OSMMapViewPreview(
    centerLat: Double,
    centerLon: Double,
    radiusKm: Double,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var mapView: MapView? by remember { mutableStateOf(null) }

    AndroidView(
        factory = { ctx ->
            org.osmdroid.config.Configuration.getInstance().load(
                ctx,
                ctx.getSharedPreferences("osmdroid", android.content.Context.MODE_PRIVATE),
            )

            MapView(ctx).apply {
                setTileSource(org.osmdroid.tileprovider.tilesource.TileSourceFactory.MAPNIK)
                isTilesScaledToDpi = true
                maxZoomLevel = 18.0
                minZoomLevel = 3.0

                // Set center
                val center = GeoPoint(centerLat, centerLon)
                controller.setCenter(center)

                // Calculate appropriate zoom level based on radius
                val zoomLevel = when {
                    radiusKm <= 5 -> 13.0
                    radiusKm <= 10 -> 12.0
                    radiusKm <= 25 -> 11.0
                    radiusKm <= 50 -> 10.0
                    else -> 9.0
                }
                controller.setZoom(zoomLevel)

                // Add radius circle
                val circle = org.osmdroid.views.overlay.Polygon()
                circle.points = createCirclePoints(center, radiusKm, 60)
                circle.fillPaint.color = android.graphics.Color.argb(60, 33, 150, 243) // Semi-transparent blue
                circle.outlinePaint.color = android.graphics.Color.argb(200, 33, 150, 243)
                circle.outlinePaint.strokeWidth = 2f
                overlays.add(circle)

                // Add center marker
                val marker = org.osmdroid.views.overlay.Marker(this)
                marker.position = center
                marker.setAnchor(
                    org.osmdroid.views.overlay.Marker.ANCHOR_CENTER,
                    org.osmdroid.views.overlay.Marker.ANCHOR_CENTER,
                )
                overlays.add(marker)

                mapView = this
            }
        },
        modifier = modifier,
        update = { /* Updates handled in factory */ },
    )
}

/**
 * Create circle points for a given center and radius in km
 */
private fun createCirclePoints(center: GeoPoint, radiusKm: Double, points: Int = 60): List<GeoPoint> {
    val result = mutableListOf<GeoPoint>()
    val radiusMeters = radiusKm * 1000
    val earthRadius = 6371000.0 // meters

    repeat(points) { i ->
        val angle = (i * 360.0 / points) * Math.PI / 180.0
        val lat = center.latitude + (radiusMeters / earthRadius) * Math.cos(angle) * 180.0 / Math.PI
        val lon = center.longitude + (radiusMeters / (earthRadius * Math.cos(center.latitude * Math.PI / 180.0))) * Math.sin(angle) * 180.0 / Math.PI
        result.add(GeoPoint(lat, lon))
    }

    return result
}
