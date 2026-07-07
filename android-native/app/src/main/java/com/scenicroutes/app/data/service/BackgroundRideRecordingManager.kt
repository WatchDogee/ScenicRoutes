package com.scenicroutes.app.data.service

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Manages background ride recording using a foreground service.
 * This allows recording to continue in the background while user navigates.
 */
class BackgroundRideRecordingManager(private val context: Context) {
    
    private var service: RideRecordingForegroundService? = null
    private var bound = false
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()
    
    private val _isPaused = MutableStateFlow(false)
    val isPaused: StateFlow<Boolean> = _isPaused.asStateFlow()
    
    private val _recordedDistance = MutableStateFlow(0.0)
    val recordedDistance: StateFlow<Double> = _recordedDistance.asStateFlow()
    
    private val _elapsedTime = MutableStateFlow(0L)
    val elapsedTime: StateFlow<Long> = _elapsedTime.asStateFlow()

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(className: ComponentName, binder: IBinder) {
            val localBinder = binder as RideRecordingForegroundService.LocalBinder
            service = localBinder.getService()
            bound = true
            
            // Sync state from service
            scope.launch {
                service?.isRecording?.collect { _isRecording.value = it }
            }
            scope.launch {
                service?.isPaused?.collect { _isPaused.value = it }
            }
            scope.launch {
                service?.recordedDistance?.collect { _recordedDistance.value = it }
            }
            scope.launch {
                service?.elapsedTime?.collect { _elapsedTime.value = it }
            }
            
            android.util.Log.d("BackgroundRideRecording", "Service connected and state synced")
        }

        override fun onServiceDisconnected(className: ComponentName) {
            service = null
            bound = false
            android.util.Log.d("BackgroundRideRecording", "Service disconnected")
        }
    }

    /**
     * Start recording in background with optional route link
     */
    fun startBackgroundRecording(linkedRouteId: String? = null) {
        android.util.Log.d("BackgroundRideRecording", "Starting background ride recording${linkedRouteId?.let { " (route: $it)" } ?: ""}")
        
        val intent = Intent(context, RideRecordingForegroundService::class.java).apply {
            action = RideRecordingForegroundService.ACTION_START_RECORDING
            linkedRouteId?.let { putExtra(RideRecordingForegroundService.EXTRA_ROUTE_ID, it) }
        }
        
        context.startForegroundService(intent)
        context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    /**
     * Pause recording
     */
    fun pauseRecording() {
        android.util.Log.d("BackgroundRideRecording", "Pausing ride recording")
        service?.pauseRecording()
    }

    /**
     * Resume recording
     */
    fun resumeRecording() {
        android.util.Log.d("BackgroundRideRecording", "Resuming ride recording")
        service?.resumeRecording()
    }

    /**
     * Stop recording and return the recorded data
     */
    fun stopBackgroundRecording(): BackgroundRecordedRide? {
        android.util.Log.d("BackgroundRideRecording", "Stopping background ride recording")
        val ride = service?.stopRecording()
        
        if (bound) {
            context.unbindService(connection)
            bound = false
        }
        
        return ride
    }

    /**
     * Cancel recording without saving
     */
    fun cancelRecording() {
        android.util.Log.d("BackgroundRideRecording", "Cancelling background ride recording")
        stopBackgroundRecording()
    }

    /**
     * Check if currently recording
     */
    fun isCurrentlyRecording(): Boolean = _isRecording.value
    
    /**
     * Check if currently paused
     */
    fun isCurrentlyPaused(): Boolean = _isPaused.value
}
