package com.scenicroutes.app.services

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.scenicroutes.app.R
import com.scenicroutes.app.data.Ride
import com.scenicroutes.app.data.RideDatabase
import com.scenicroutes.app.data.RidePoint
import com.scenicroutes.app.location.LocationProvider
import kotlinx.coroutines.*
import java.util.*
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Foreground service for recording motorcycle rides.
 * 
 * Features:
 * - Independent from navigation lifecycle
 * - Records raw GPS points (no route snapping)
 * - Survives app backgrounding and screen off
 * - Supports pause/resume/stop
 * - Persists data locally for later sync
 */
class RideRecordingService : Service() {
    
    private val binder = RideRecordingBinder()
    private var wakeLock: PowerManager.WakeLock? = null
    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    
    // Recording state
    private var currentRide: Ride? = null
    private val recordedPoints = mutableListOf<RidePoint>()
    private var isPaused = false
    private var startTime: Long = 0
    private var pausedTime: Long = 0
    private var totalPausedDuration: Long = 0
    private var totalDistance: Double = 0.0
    private var lastLocation: Location? = null
    
    // Location tracking
    private lateinit var locationProvider: LocationProvider
    private var locationCallback: ((Location) -> Unit)? = null
    
    // Database
    private lateinit var database: RideDatabase
    
    // Callbacks
    private val stateListeners = mutableSetOf<RideStateListener>()
    
    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "ride_recording_channel"
        private const val WAKE_LOCK_TAG = "ScenicRoutes::RideRecording"
        
        // Recording thresholds
        private const val MIN_DISTANCE_METERS = 5.0 // Minimum distance to record point
        private const val MAX_SPEED_MPS = 100.0 // ~360 km/h - filter impossible speeds
        private const val MIN_ACCURACY_METERS = 50.0 // Minimum GPS accuracy
        
        const val ACTION_START = "com.scenicroutes.app.RIDE_START"
        const val ACTION_PAUSE = "com.scenicroutes.app.RIDE_PAUSE"
        const val ACTION_RESUME = "com.scenicroutes.app.RIDE_RESUME"
        const val ACTION_STOP = "com.scenicroutes.app.RIDE_STOP"
        
        const val EXTRA_LINKED_ROUTE_ID = "linked_route_id"
    }
    
    inner class RideRecordingBinder : Binder() {
        fun getService(): RideRecordingService = this@RideRecordingService
    }
    
    interface RideStateListener {
        fun onRideStarted(rideId: String)
        fun onRidePaused()
        fun onRideResumed()
        fun onRideStopped(ride: Ride)
        fun onRideUpdated(distance: Double, duration: Long, speed: Double)
    }
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize database
        database = RideDatabase.getInstance(applicationContext)
        
        // Initialize location provider
        locationProvider = LocationProvider.getInstance(applicationContext)
        
        // Acquire wake lock to keep CPU running
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            WAKE_LOCK_TAG
        ).apply {
            acquire(10 * 60 * 60 * 1000L) // 10 hours max
        }
        
        createNotificationChannel()
    }
    
    override fun onBind(intent: Intent?): IBinder = binder
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val linkedRouteId = intent.getStringExtra(EXTRA_LINKED_ROUTE_ID)
                startRecording(linkedRouteId)
            }
            ACTION_PAUSE -> pauseRecording()
            ACTION_RESUME -> resumeRecording()
            ACTION_STOP -> stopRecording()
        }
        
        return START_STICKY // Restart service if killed
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopRecording()
        wakeLock?.release()
        serviceScope.cancel()
    }
    
    // Public API
    
    fun addStateListener(listener: RideStateListener) {
        stateListeners.add(listener)
    }
    
    fun removeStateListener(listener: RideStateListener) {
        stateListeners.remove(listener)
    }
    
    fun isRecording(): Boolean = currentRide != null && !isPaused
    
    fun isPaused(): Boolean = isPaused
    
    fun getCurrentRide(): Ride? = currentRide
    
    fun getRecordedPoints(): List<RidePoint> = recordedPoints.toList()
    
    fun getCurrentStats(): RideStats {
        val duration = if (isPaused) {
            pausedTime - startTime - totalPausedDuration
        } else {
            System.currentTimeMillis() - startTime - totalPausedDuration
        }
        
        val avgSpeed = if (duration > 0) {
            (totalDistance / (duration / 1000.0)) // m/s
        } else {
            0.0
        }
        
        return RideStats(
            distance = totalDistance,
            duration = duration / 1000, // seconds
            averageSpeed = avgSpeed,
            currentSpeed = lastLocation?.speed?.toDouble() ?: 0.0,
            pointCount = recordedPoints.size
        )
    }
    
    // Recording control
    
    private fun startRecording(linkedRouteId: String?) {
        if (currentRide != null) return // Already recording
        
        val rideId = UUID.randomUUID().toString()
        startTime = System.currentTimeMillis()
        totalPausedDuration = 0
        totalDistance = 0.0
        isPaused = false
        recordedPoints.clear()
        lastLocation = null
        
        currentRide = Ride(
            id = rideId,
            startTime = startTime,
            endTime = null,
            distanceMeters = 0.0,
            durationSeconds = 0,
            averageSpeed = 0.0,
            maxSpeed = 0.0,
            pointsJson = "[]",
            linkedRouteId = linkedRouteId,
            isSynced = false
        )
        
        // Start foreground notification
        startForeground(NOTIFICATION_ID, createNotification())
        
        // Start location updates
        startLocationUpdates()
        
        // Notify listeners
        stateListeners.forEach { it.onRideStarted(rideId) }
    }
    
    private fun pauseRecording() {
        if (currentRide == null || isPaused) return
        
        isPaused = true
        pausedTime = System.currentTimeMillis()
        
        stopLocationUpdates()
        updateNotification()
        
        stateListeners.forEach { it.onRidePaused() }
    }
    
    private fun resumeRecording() {
        if (currentRide == null || !isPaused) return
        
        val pauseDuration = System.currentTimeMillis() - pausedTime
        totalPausedDuration += pauseDuration
        isPaused = false
        
        startLocationUpdates()
        updateNotification()
        
        stateListeners.forEach { it.onRideResumed() }
    }
    
    private fun stopRecording() {
        if (currentRide == null) return
        
        stopLocationUpdates()
        
        val endTime = System.currentTimeMillis()
        val duration = (endTime - startTime - totalPausedDuration) / 1000 // seconds
        
        // Calculate stats
        val maxSpeed = recordedPoints.maxOfOrNull { it.speed } ?: 0.0
        val avgSpeed = if (duration > 0) totalDistance / duration else 0.0
        
        // Update ride
        val completedRide = currentRide!!.copy(
            endTime = endTime,
            distanceMeters = totalDistance,
            durationSeconds = duration,
            averageSpeed = avgSpeed,
            maxSpeed = maxSpeed,
            pointsJson = serializePoints(recordedPoints)
        )
        
        // Save to database
        serviceScope.launch {
            try {
                database.rideDao().insert(completedRide)
            } catch (e: Exception) {
                // Log error but don't crash
                e.printStackTrace()
            }
        }
        
        // Notify listeners
        stateListeners.forEach { it.onRideStopped(completedRide) }
        
        // Clean up
        currentRide = null
        recordedPoints.clear()
        lastLocation = null
        
        // Stop foreground service
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    
    // Location tracking
    
    private fun startLocationUpdates() {
        locationCallback = { location ->
            onLocationUpdate(location)
        }
        
        locationProvider.requestLocationUpdates(
            intervalMs = 1000, // 1 second
            callback = locationCallback!!
        )
    }
    
    private fun stopLocationUpdates() {
        locationCallback?.let { callback ->
            locationProvider.removeLocationUpdates(callback)
        }
        locationCallback = null
    }
    
    private fun onLocationUpdate(location: Location) {
        if (isPaused) return
        
        // Filter bad GPS data
        if (!isLocationValid(location)) return
        
        // Calculate distance from last point
        val distanceFromLast = lastLocation?.let { last ->
            calculateDistance(last, location)
        } ?: 0.0
        
        // Only record if moved minimum distance or first point
        if (lastLocation == null || distanceFromLast >= MIN_DISTANCE_METERS) {
            
            // Validate speed (filter GPS jumps)
            if (lastLocation != null && location.hasSpeed()) {
                if (location.speed > MAX_SPEED_MPS) {
                    return // Skip impossible speed
                }
            }
            
            // Create ride point
            val point = RidePoint(
                latitude = location.latitude,
                longitude = location.longitude,
                altitude = if (location.hasAltitude()) location.altitude else null,
                speed = if (location.hasSpeed()) location.speed.toDouble() else 0.0,
                heading = if (location.hasBearing()) location.bearing.toDouble() else null,
                accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else null,
                timestamp = location.time
            )
            
            recordedPoints.add(point)
            
            // Update total distance
            if (lastLocation != null) {
                totalDistance += distanceFromLast
            }
            
            lastLocation = location
            
            // Update notification
            updateNotification()
            
            // Notify listeners
            val stats = getCurrentStats()
            stateListeners.forEach { 
                it.onRideUpdated(stats.distance, stats.duration, stats.currentSpeed)
            }
        }
    }
    
    private fun isLocationValid(location: Location): Boolean {
        // Check accuracy
        if (location.hasAccuracy() && location.accuracy > MIN_ACCURACY_METERS) {
            return false
        }
        
        // Check for valid coordinates
        if (location.latitude == 0.0 && location.longitude == 0.0) {
            return false
        }
        
        return true
    }
    
    private fun calculateDistance(from: Location, to: Location): Double {
        val results = FloatArray(1)
        Location.distanceBetween(
            from.latitude, from.longitude,
            to.latitude, to.longitude,
            results
        )
        return results[0].toDouble()
    }
    
    // Notification
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Ride Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows ride recording status"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val pauseIntent = Intent(this, RideRecordingService::class.java).apply {
            action = if (isPaused) ACTION_RESUME else ACTION_PAUSE
        }
        val pausePendingIntent = PendingIntent.getService(
            this, 1, pauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val stopIntent = Intent(this, RideRecordingService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 2, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val stats = getCurrentStats()
        val distanceKm = stats.distance / 1000.0
        val hours = stats.duration / 3600
        val minutes = (stats.duration % 3600) / 60
        val seconds = stats.duration % 60
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording Ride")
            .setContentText("%.2f km • %02d:%02d:%02d".format(distanceKm, hours, minutes, seconds))
            .setSmallIcon(R.drawable.ic_notification) // You'll need to add this icon
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(
                if (isPaused) R.drawable.ic_play else R.drawable.ic_pause,
                if (isPaused) "Resume" else "Pause",
                pausePendingIntent
            )
            .addAction(R.drawable.ic_stop, "Stop", stopPendingIntent)
            .build()
    }
    
    private fun updateNotification() {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager?.notify(NOTIFICATION_ID, createNotification())
    }
    
    // Data serialization
    
    private fun serializePoints(points: List<RidePoint>): String {
        // Simple JSON serialization - you can use Gson or kotlinx.serialization
        return points.joinToString(",", "[", "]") { point ->
            """{"lat":${point.latitude},"lng":${point.longitude},"spd":${point.speed},"ts":${point.timestamp}}"""
        }
    }
    
    data class RideStats(
        val distance: Double,
        val duration: Long,
        val averageSpeed: Double,
        val currentSpeed: Double,
        val pointCount: Int
    )
}
