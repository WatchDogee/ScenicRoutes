package com.scenicroutes.app.data.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.osmdroid.util.GeoPoint
import com.scenicroutes.app.R

/**
 * Foreground service for ride recording that survives app backgrounding.
 * Displays persistent notification with ride statistics.
 */
class RideRecordingForegroundService : Service() {
    
    private val binder = LocalBinder()
    private var locationTrackingService: LocationTrackingService? = null
    private var notificationManager: NotificationManager? = null
    
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var notificationUpdateJob: Job? = null
    
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()
    
    private val _isPaused = MutableStateFlow(false)
    val isPaused: StateFlow<Boolean> = _isPaused.asStateFlow()
    
    private val _recordedDistance = MutableStateFlow(0.0)
    val recordedDistance: StateFlow<Double> = _recordedDistance.asStateFlow()
    
    private val _elapsedTime = MutableStateFlow(0L) // milliseconds
    val elapsedTime: StateFlow<Long> = _elapsedTime.asStateFlow()
    
    private var startTime: Long = 0
    private var pausedTime: Long = 0
    private var totalPausedDuration: Long = 0
    private var linkedRouteId: String? = null
    
    inner class LocalBinder : Binder() {
        fun getService(): RideRecordingForegroundService = this@RideRecordingForegroundService
    }
    
    override fun onBind(intent: Intent?): IBinder = binder
    
    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        locationTrackingService = LocationTrackingService(this)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_RECORDING -> {
                val routeId = intent.getStringExtra(EXTRA_ROUTE_ID)
                startRecording(routeId)
            }
            ACTION_PAUSE_RECORDING -> pauseRecording()
            ACTION_RESUME_RECORDING -> resumeRecording()
            ACTION_STOP_RECORDING -> stopRecording()
        }
        return START_STICKY
    }
    
    fun startRecording(routeId: String? = null) {
        if (_isRecording.value) return
        
        linkedRouteId = routeId
        startTime = System.currentTimeMillis()
        totalPausedDuration = 0
        _isRecording.value = true
        _isPaused.value = false
        
        locationTrackingService?.startTracking(routeId)
        
        // Start foreground notification
        startForeground(NOTIFICATION_ID, createNotification())
        
        // Start updating notification periodically
        startNotificationUpdates()
        
        android.util.Log.d(TAG, "Ride recording started${routeId?.let { " (linked to route: $it)" } ?: ""}")
    }
    
    fun pauseRecording() {
        if (!_isRecording.value || _isPaused.value) return
        
        _isPaused.value = true
        pausedTime = System.currentTimeMillis()
        locationTrackingService?.stopTracking()
        
        updateNotification()
        android.util.Log.d(TAG, "Ride recording paused")
    }
    
    fun resumeRecording() {
        if (!_isRecording.value || !_isPaused.value) return
        
        totalPausedDuration += System.currentTimeMillis() - pausedTime
        _isPaused.value = false
        locationTrackingService?.startTracking(linkedRouteId)
        
        updateNotification()
        android.util.Log.d(TAG, "Ride recording resumed")
    }
    
    fun stopRecording(): BackgroundRecordedRide? {
        if (!_isRecording.value) return null
        
        val endTime = System.currentTimeMillis()
        val actualDuration = endTime - startTime - totalPausedDuration
        
        locationTrackingService?.stopTracking()
        
        val recordedRide = BackgroundRecordedRide(
            points = locationTrackingService?.trackedPoints?.value ?: emptyList(),
            locations = locationTrackingService?.trackedLocations?.value ?: emptyList(),
            totalDistance = locationTrackingService?.totalDistance?.value ?: 0.0,
            durationMs = actualDuration,
            startTime = startTime,
            endTime = endTime,
            cornerCount = locationTrackingService?.cornerCount?.value ?: 0,
            elevationStats = locationTrackingService?.elevationStats?.value,
            speedStats = locationTrackingService?.speedStats?.value,
            linkedRouteId = linkedRouteId
        )
        
        _isRecording.value = false
        _isPaused.value = false
        _elapsedTime.value = 0
        _recordedDistance.value = 0.0
        linkedRouteId = null
        
        stopNotificationUpdates()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        
        android.util.Log.d(TAG, "Ride recording stopped - Distance: ${recordedRide.totalDistance}m, Duration: ${recordedRide.durationMs}ms")
        return recordedRide
    }
    
    private fun startNotificationUpdates() {
        notificationUpdateJob?.cancel()
        notificationUpdateJob = serviceScope.launch {
            while (isActive && _isRecording.value) {
                if (!_isPaused.value) {
                    _elapsedTime.value = System.currentTimeMillis() - startTime - totalPausedDuration
                    _recordedDistance.value = locationTrackingService?.totalDistance?.value ?: 0.0
                }
                updateNotification()
                delay(1000) // Update every second
            }
        }
    }
    
    private fun stopNotificationUpdates() {
        notificationUpdateJob?.cancel()
        notificationUpdateJob = null
    }
    
    private fun createNotification(): Notification {
        val contentIntent = packageManager.getLaunchIntentForPackage(packageName)?.let { intent ->
            PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
        
        val pauseResumeIntent = if (_isPaused.value) {
            PendingIntent.getService(
                this,
                1,
                Intent(this, RideRecordingForegroundService::class.java).apply {
                    action = ACTION_RESUME_RECORDING
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            PendingIntent.getService(
                this,
                1,
                Intent(this, RideRecordingForegroundService::class.java).apply {
                    action = ACTION_PAUSE_RECORDING
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
        
        val stopIntent = PendingIntent.getService(
            this,
            2,
            Intent(this, RideRecordingForegroundService::class.java).apply {
                action = ACTION_STOP_RECORDING
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val distanceKm = _recordedDistance.value / 1000.0
        val timeFormatted = formatElapsedTime(_elapsedTime.value)
        
        val title = if (_isPaused.value) "Ride Recording Paused" else "Recording Ride"
        val text = "${String.format("%.2f", distanceKm)} km • $timeFormatted"
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_fitness_center) // You may need to create this icon
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(
                if (_isPaused.value) R.drawable.ic_play else R.drawable.ic_pause,
                if (_isPaused.value) "Resume" else "Pause",
                pauseResumeIntent
            )
            .addAction(R.drawable.ic_stop, "Stop", stopIntent)
            .build()
    }
    
    private fun updateNotification() {
        if (_isRecording.value) {
            notificationManager?.notify(NOTIFICATION_ID, createNotification())
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Ride Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows ongoing ride recording status"
                setShowBadge(false)
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }
    
    private fun formatElapsedTime(millis: Long): String {
        val totalSeconds = millis / 1000
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        
        return when {
            hours > 0 -> String.format("%d:%02d:%02d", hours, minutes, seconds)
            else -> String.format("%d:%02d", minutes, seconds)
        }
    }
    
    override fun onDestroy() {
        stopNotificationUpdates()
        locationTrackingService?.stopTracking()
        super.onDestroy()
        android.util.Log.d(TAG, "Ride recording service destroyed")
    }
    
    companion object {
        private const val TAG = "RideRecordingService"
        private const val CHANNEL_ID = "ride_recording_channel"
        private const val NOTIFICATION_ID = 1001
        
        const val ACTION_START_RECORDING = "com.scenicroutes.app.START_RECORDING"
        const val ACTION_PAUSE_RECORDING = "com.scenicroutes.app.PAUSE_RECORDING"
        const val ACTION_RESUME_RECORDING = "com.scenicroutes.app.RESUME_RECORDING"
        const val ACTION_STOP_RECORDING = "com.scenicroutes.app.STOP_RECORDING"
        const val EXTRA_ROUTE_ID = "route_id"
    }
}

/**
 * Data class for recorded ride with optional route link
 */
data class BackgroundRecordedRide(
    val points: List<GeoPoint>,
    val locations: List<android.location.Location>,
    val totalDistance: Double, // in meters
    val durationMs: Long,
    val startTime: Long,
    val endTime: Long,
    val cornerCount: Int,
    val elevationStats: ElevationStats?,
    val speedStats: SpeedStats?,
    val linkedRouteId: String? = null // Link to planned route if recording from navigation
)
