package com.scenicroutes.app.data.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Binder
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.scenicroutes.app.MainActivity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.osmdroid.util.GeoPoint

class BackgroundLocationService : Service() {
    private val binder = LocalBinder()
    private lateinit var locationManager: LocationManager
    private var locationListener: LocationListener? = null

    private val _currentLocation = MutableStateFlow<GeoPoint?>(null)
    val currentLocation: StateFlow<GeoPoint?> = _currentLocation.asStateFlow()

    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking.asStateFlow()

    private val _trackedPoints = MutableStateFlow<List<GeoPoint>>(emptyList())
    val trackedPoints: StateFlow<List<GeoPoint>> = _trackedPoints.asStateFlow()

    private val _totalDistance = MutableStateFlow(0.0)
    val totalDistance: StateFlow<Double> = _totalDistance.asStateFlow()

    private var lastLocation: Location? = null

    companion object {
        private const val CHANNEL_ID = "location_tracking_channel"
        private const val NOTIFICATION_ID = 2001
    }

    inner class LocalBinder : Binder() {
        fun getService(): BackgroundLocationService = this@BackgroundLocationService
    }

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        createNotificationChannel()
    }

    override fun onBind(intent: Intent?): IBinder {
        return binder
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Background location tracking for ride recording"
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun startTracking() {
        if (_isTracking.value) return

        _isTracking.value = true
        _trackedPoints.value = emptyList()
        _totalDistance.value = 0.0
        lastLocation = null

        // Start foreground service
        startForeground(NOTIFICATION_ID, createNotification())

        locationListener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                val geoPoint = GeoPoint(location.latitude, location.longitude)
                _currentLocation.value = geoPoint

                val currentPoints = _trackedPoints.value.toMutableList()
                currentPoints.add(geoPoint)
                _trackedPoints.value = currentPoints

                lastLocation?.let { last ->
                    val distance = location.distanceTo(last)
                    _totalDistance.value = _totalDistance.value + distance
                }

                lastLocation = location

                // Update notification
                val notificationManager = getSystemService(NotificationManager::class.java)
                notificationManager.notify(NOTIFICATION_ID, createNotification())
            }

            @Deprecated("Deprecated in Java")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000L,
                5f,
                locationListener!!,
            )
        } catch (e: SecurityException) {
            android.util.Log.e("BackgroundLocation", "Security exception: ${e.message}", e)
            _isTracking.value = false
        }
    }

    fun stopTracking() {
        if (!_isTracking.value) return

        _isTracking.value = false
        locationListener?.let {
            try {
                locationManager.removeUpdates(it)
            } catch (e: Exception) {
                android.util.Log.e("BackgroundLocation", "Error stopping: ${e.message}", e)
            }
        }
        locationListener = null
        lastLocation = null

        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val distanceKm = String.format("%.2f", _totalDistance.value / 1000.0)
        val pointsCount = _trackedPoints.value.size

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording Ride")
            .setContentText("Distance: $distanceKm km • Points: $pointsCount")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopTracking()
    }
}
