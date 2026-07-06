package com.scenicroutes.app.data.service

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject

data class GeocodeResult(
    val displayName: String,
    val lat: Double,
    val lon: Double,
    val address: Map<String, String>? = null,
)

class GeocodingService {
    private val client = OkHttpClient()

    suspend fun searchLocation(query: String): List<GeocodeResult> = withContext(Dispatchers.IO) {
        try {
            val url = "https://nominatim.openstreetmap.org/search?q=${java.net.URLEncoder.encode(query, "UTF-8")}&format=json&limit=10&addressdetails=1&accept-language=en&dedupe=1"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "ScenicRoutes/1.0")
                .header("Accept", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext emptyList()

            val jsonArray = JSONArray(responseBody)
            val results = mutableListOf<GeocodeResult>()

            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                // Filter out houses and postcodes
                val type = item.optString("type", "")
                if (type == "house" || type == "postcode") continue

                val lat = item.getDouble("lat")
                val lon = item.getDouble("lon")
                val displayName = item.getString("display_name")

                val addressObj = item.optJSONObject("address")
                val addressMap = mutableMapOf<String, String>()
                if (addressObj != null) {
                    val keys = addressObj.keys()
                    while (keys.hasNext()) {
                        val key = keys.next()
                        addressMap[key] = addressObj.getString(key)
                    }
                }

                results.add(
                    GeocodeResult(
                        displayName = displayName,
                        lat = lat,
                        lon = lon,
                        address = if (addressMap.isNotEmpty()) addressMap else null,
                    ),
                )
            }

            results
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun reverseGeocode(lat: Double, lon: Double): GeocodeResult? = withContext(Dispatchers.IO) {
        try {
            val url = "https://nominatim.openstreetmap.org/reverse?lat=$lat&lon=$lon&format=json&addressdetails=1&accept-language=en"
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "ScenicRoutes/1.0")
                .header("Accept", "application/json")
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: return@withContext null
            
            if (responseBody.isEmpty() || responseBody == "{}") {
                return@withContext null
            }

            val jsonObject = JSONObject(responseBody)
            val displayName = jsonObject.optString("display_name", "")
            if (displayName.isEmpty()) {
                return@withContext null
            }

            val addressObj = jsonObject.optJSONObject("address")
            val addressMap = mutableMapOf<String, String>()
            if (addressObj != null) {
                val keys = addressObj.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    addressMap[key] = addressObj.getString(key)
                }
            }

            GeocodeResult(
                displayName = displayName,
                lat = lat,
                lon = lon,
                address = if (addressMap.isNotEmpty()) addressMap else null,
            )
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
















