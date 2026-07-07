package com.scenicroutes.app.ui.activities

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.scenicroutes.app.R
import com.scenicroutes.app.data.RideDatabase
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import android.widget.TextView

/**
 * Ride Details Activity
 * 
 * Shows detailed information about a recorded ride:
 * - Date and time
 * - Total distance and duration
 * - Average/max speed
 * - Route on map
 * - Elevation profile (if available)
 */
class RideDetailsActivity : AppCompatActivity() {
    
    private val database by lazy { RideDatabase.getInstance(applicationContext) }
    private var rideId: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ride_details)
        
        rideId = intent.getStringExtra("rideId")
        
        if (rideId != null) {
            loadRideDetails(rideId!!)
        }
    }
    
    private fun loadRideDetails(rideId: String) {
        lifecycleScope.launch {
            try {
                val ride = database.rideDao().getRideById(rideId)
                
                if (ride != null) {
                    displayRideDetails(ride)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    private fun displayRideDetails(ride: com.scenicroutes.app.data.Ride) {
        // Date
        val dateFormat = SimpleDateFormat("EEEE, MMM dd, yyyy HH:mm", Locale.getDefault())
        findViewById<TextView>(R.id.rideDate).text = dateFormat.format(Date(ride.startTime))
        
        // Distance
        val km = ride.distanceMeters / 1000.0
        findViewById<TextView>(R.id.rideDistance).text = "%.2f km".format(km)
        
        // Duration
        val hours = ride.durationSeconds / 3600
        val minutes = (ride.durationSeconds % 3600) / 60
        val seconds = ride.durationSeconds % 60
        findViewById<TextView>(R.id.rideDuration).text = 
            "%02d:%02d:%02d".format(hours, minutes, seconds)
        
        // Average speed
        findViewById<TextView>(R.id.rideAvgSpeed).text = 
            "%.2f m/s".format(ride.averageSpeed)
        
        // Max speed
        findViewById<TextView>(R.id.rideMaxSpeed).text = 
            "%.2f m/s".format(ride.maxSpeed)
        
        // Linked route (if any)
        if (ride.linkedRouteId != null) {
            findViewById<TextView>(R.id.linkedRouteId).text = 
                "Linked Route: ${ride.linkedRouteId}"
        }
        
        // Sync status
        val syncStatus = findViewById<TextView>(R.id.syncStatus)
        syncStatus.text = if (ride.isSynced) "Synced" else "Not synced"
        syncStatus.setTextColor(
            if (ride.isSynced) 
                resources.getColor(R.color.green, theme)
            else 
                resources.getColor(R.color.orange, theme)
        )
    }
}
