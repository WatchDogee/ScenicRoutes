package com.scenicroutes.app.viewmodels

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.Ride
import com.scenicroutes.app.data.RideDatabase
import com.scenicroutes.app.services.RideRecordingService
import kotlinx.coroutines.launch

/**
 * ViewModel for Ride Recording UI
 * 
 * Provides:
 * - Control methods (start/pause/resume/stop)
 * - Observable state (isRecording, isPaused, stats)
 * - Ride history access
 * 
 * Bridges service to native Android UI
 */
class RideRecordingViewModel(application: Application) : AndroidViewModel(application) {
    
    private val context = application.applicationContext
    private val database = RideDatabase.getInstance(context)
    
    private var recordingService: RideRecordingService? = null
    private var serviceBound = false
    
    // Observable state
    private val _isRecording = MutableLiveData(false)
    val isRecording: LiveData<Boolean> = _isRecording
    
    private val _isPaused = MutableLiveData(false)
    val isPaused: LiveData<Boolean> = _isPaused
    
    private val _currentRideId = MutableLiveData<String?>(null)
    val currentRideId: LiveData<String?> = _currentRideId
    
    private val _distance = MutableLiveData(0.0)
    val distance: LiveData<Double> = _distance
    
    private val _duration = MutableLiveData(0L)
    val duration: LiveData<Long> = _duration
    
    private val _averageSpeed = MutableLiveData(0.0)
    val averageSpeed: LiveData<Double> = _averageSpeed
    
    private val _currentSpeed = MutableLiveData(0.0)
    val currentSpeed: LiveData<Double> = _currentSpeed
    
    private val _rideHistory = MutableLiveData<List<Ride>>(emptyList())
    val rideHistory: LiveData<List<Ride>> = _rideHistory
    
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val binderImpl = binder as RideRecordingService.RideRecordingBinder
            recordingService = binderImpl.getService()
            serviceBound = true
            
            recordingService?.addStateListener(stateListener)
            
            // Sync current state
            _isRecording.postValue(recordingService?.isRecording() ?: false)
            _isPaused.postValue(recordingService?.isPaused() ?: false)
            _currentRideId.postValue(recordingService?.getCurrentRide()?.id)
        }
        
        override fun onServiceDisconnected(name: ComponentName?) {
            recordingService?.removeStateListener(stateListener)
            recordingService = null
            serviceBound = false
        }
    }
    
    private val stateListener = object : RideRecordingService.RideStateListener {
        override fun onRideStarted(rideId: String) {
            _isRecording.postValue(true)
            _currentRideId.postValue(rideId)
            _distance.postValue(0.0)
            _duration.postValue(0L)
        }
        
        override fun onRidePaused() {
            _isPaused.postValue(true)
        }
        
        override fun onRideResumed() {
            _isPaused.postValue(false)
        }
        
        override fun onRideStopped(ride: Ride) {
            _isRecording.postValue(false)
            _isPaused.postValue(false)
            _currentRideId.postValue(null)
            loadRideHistory()
        }
        
        override fun onRideUpdated(distance: Double, duration: Long, speed: Double) {
            _distance.postValue(distance)
            _duration.postValue(duration)
            _currentSpeed.postValue(speed)
            
            if (duration > 0) {
                _averageSpeed.postValue(distance / duration)
            }
        }
    }
    
    init {
        bindToService()
        loadRideHistory()
    }
    
    override fun onCleared() {
        super.onCleared()
        unbindFromService()
    }
    
    // Public API
    
    fun startRecording(linkedRouteId: String? = null) {
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_START
            linkedRouteId?.let { putExtra(RideRecordingService.EXTRA_LINKED_ROUTE_ID, it) }
        }
        context.startForegroundService(intent)
    }
    
    fun pauseRecording() {
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_PAUSE
        }
        context.startService(intent)
    }
    
    fun resumeRecording() {
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_RESUME
        }
        context.startService(intent)
    }
    
    fun stopRecording() {
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_STOP
        }
        context.startService(intent)
    }
    
    fun deleteRide(rideId: String) {
        viewModelScope.launch {
            try {
                database.rideDao().deleteById(rideId)
                loadRideHistory()
            } catch (e: Exception) {
                _error.postValue("Failed to delete ride: ${e.message}")
            }
        }
    }
    
    fun loadRideHistory() {
        viewModelScope.launch {
            try {
                val rides = database.rideDao().getAllRides()
                _rideHistory.postValue(rides)
            } catch (e: Exception) {
                _error.postValue("Failed to load rides: ${e.message}")
            }
        }
    }
    
    // Private methods
    
    private fun bindToService() {
        val intent = Intent(context, RideRecordingService::class.java)
        context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
    }
    
    private fun unbindFromService() {
        if (serviceBound) {
            recordingService?.removeStateListener(stateListener)
            context.unbindService(serviceConnection)
            serviceBound = false
        }
    }
}
