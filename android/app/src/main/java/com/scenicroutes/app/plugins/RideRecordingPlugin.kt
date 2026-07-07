package com.scenicroutes.app.plugins

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.scenicroutes.app.data.Ride
import com.scenicroutes.app.data.RideDatabase
import com.scenicroutes.app.services.RideRecordingService
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * Capacitor plugin for Ride Recording
 * 
 * Bridges native Android ride recording functionality to JavaScript
 */
@CapacitorPlugin(name = "RideRecording")
class RideRecordingPlugin : Plugin() {
    
    private var recordingService: RideRecordingService? = null
    private var serviceBound = false
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var database: RideDatabase
    
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val binderImpl = binder as RideRecordingService.RideRecordingBinder
            recordingService = binderImpl.getService()
            serviceBound = true
            
            // Add state listener
            recordingService?.addStateListener(stateListener)
        }
        
        override fun onServiceDisconnected(name: ComponentName?) {
            recordingService?.removeStateListener(stateListener)
            recordingService = null
            serviceBound = false
        }
    }
    
    private val stateListener = object : RideRecordingService.RideStateListener {
        override fun onRideStarted(rideId: String) {
            notifyListeners("rideStarted", JSObject().apply {
                put("rideId", rideId)
            })
        }
        
        override fun onRidePaused() {
            notifyListeners("ridePaused", JSObject())
        }
        
        override fun onRideResumed() {
            notifyListeners("rideResumed", JSObject())
        }
        
        override fun onRideStopped(ride: Ride) {
            notifyListeners("rideStopped", JSObject().apply {
                put("ride", rideToJson(ride))
            })
        }
        
        override fun onRideUpdated(distance: Double, duration: Long, speed: Double) {
            notifyListeners("rideUpdated", JSObject().apply {
                put("distance", distance)
                put("duration", duration)
                put("speed", speed)
            })
        }
    }
    
    override fun load() {
        super.load()
        database = RideDatabase.getInstance(context)
        bindToService()
    }
    
    override fun handleOnDestroy() {
        super.handleOnDestroy()
        unbindFromService()
        scope.cancel()
    }
    
    /**
     * Start recording a ride
     */
    @PluginMethod
    fun startRecording(call: PluginCall) {
        val linkedRouteId = call.getString("linkedRouteId")
        
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_START
            linkedRouteId?.let { putExtra(RideRecordingService.EXTRA_LINKED_ROUTE_ID, it) }
        }
        
        context.startForegroundService(intent)
        
        call.resolve(JSObject().apply {
            put("success", true)
        })
    }
    
    /**
     * Pause recording
     */
    @PluginMethod
    fun pauseRecording(call: PluginCall) {
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_PAUSE
        }
        
        context.startService(intent)
        
        call.resolve(JSObject().apply {
            put("success", true)
        })
    }
    
    /**
     * Resume recording
     */
    @PluginMethod
    fun resumeRecording(call: PluginCall) {
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_RESUME
        }
        
        context.startService(intent)
        
        call.resolve(JSObject().apply {
            put("success", true)
        })
    }
    
    /**
     * Stop recording
     */
    @PluginMethod
    fun stopRecording(call: PluginCall) {
        val intent = Intent(context, RideRecordingService::class.java).apply {
            action = RideRecordingService.ACTION_STOP
        }
        
        context.startService(intent)
        
        call.resolve(JSObject().apply {
            put("success", true)
        })
    }
    
    /**
     * Get current recording status
     */
    @PluginMethod
    fun getStatus(call: PluginCall) {
        val isRecording = recordingService?.isRecording() ?: false
        val isPaused = recordingService?.isPaused() ?: false
        val stats = recordingService?.getCurrentStats()
        
        call.resolve(JSObject().apply {
            put("isRecording", isRecording)
            put("isPaused", isPaused)
            stats?.let {
                put("distance", it.distance)
                put("duration", it.duration)
                put("averageSpeed", it.averageSpeed)
                put("currentSpeed", it.currentSpeed)
                put("pointCount", it.pointCount)
            }
        })
    }
    
    /**
     * Get all recorded rides
     */
    @PluginMethod
    fun getAllRides(call: PluginCall) {
        scope.launch {
            try {
                val rides = database.rideDao().getAllRides()
                val ridesArray = JSONArray()
                rides.forEach { ride ->
                    ridesArray.put(rideToJson(ride))
                }
                
                withContext(Dispatchers.Main) {
                    call.resolve(JSObject().apply {
                        put("rides", ridesArray)
                    })
                }
            } catch (e: Exception) {
                call.reject("Failed to get rides: ${e.message}")
            }
        }
    }
    
    /**
     * Get unsynced rides
     */
    @PluginMethod
    fun getUnsyncedRides(call: PluginCall) {
        scope.launch {
            try {
                val rides = database.rideDao().getUnsyncedRides()
                val ridesArray = JSONArray()
                rides.forEach { ride ->
                    ridesArray.put(rideToJson(ride))
                }
                
                withContext(Dispatchers.Main) {
                    call.resolve(JSObject().apply {
                        put("rides", ridesArray)
                    })
                }
            } catch (e: Exception) {
                call.reject("Failed to get unsynced rides: ${e.message}")
            }
        }
    }
    
    /**
     * Get ride by ID
     */
    @PluginMethod
    fun getRideById(call: PluginCall) {
        val rideId = call.getString("rideId")
        if (rideId == null) {
            call.reject("rideId is required")
            return
        }
        
        scope.launch {
            try {
                val ride = database.rideDao().getRideById(rideId)
                
                withContext(Dispatchers.Main) {
                    if (ride != null) {
                        call.resolve(JSObject().apply {
                            put("ride", rideToJson(ride))
                        })
                    } else {
                        call.reject("Ride not found")
                    }
                }
            } catch (e: Exception) {
                call.reject("Failed to get ride: ${e.message}")
            }
        }
    }
    
    /**
     * Mark ride as synced
     */
    @PluginMethod
    fun markAsSynced(call: PluginCall) {
        val rideId = call.getString("rideId")
        if (rideId == null) {
            call.reject("rideId is required")
            return
        }
        
        scope.launch {
            try {
                database.rideDao().markAsSynced(rideId)
                
                withContext(Dispatchers.Main) {
                    call.resolve(JSObject().apply {
                        put("success", true)
                    })
                }
            } catch (e: Exception) {
                call.reject("Failed to mark as synced: ${e.message}")
            }
        }
    }
    
    /**
     * Delete ride
     */
    @PluginMethod
    fun deleteRide(call: PluginCall) {
        val rideId = call.getString("rideId")
        if (rideId == null) {
            call.reject("rideId is required")
            return
        }
        
        scope.launch {
            try {
                database.rideDao().deleteById(rideId)
                
                withContext(Dispatchers.Main) {
                    call.resolve(JSObject().apply {
                        put("success", true)
                    })
                }
            } catch (e: Exception) {
                call.reject("Failed to delete ride: ${e.message}")
            }
        }
    }
    
    // Helper methods
    
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
    
    private fun rideToJson(ride: Ride): JSONObject {
        return JSONObject().apply {
            put("id", ride.id)
            put("startTime", ride.startTime)
            put("endTime", ride.endTime)
            put("distanceMeters", ride.distanceMeters)
            put("durationSeconds", ride.durationSeconds)
            put("averageSpeed", ride.averageSpeed)
            put("maxSpeed", ride.maxSpeed)
            put("pointsJson", ride.pointsJson)
            put("linkedRouteId", ride.linkedRouteId)
            put("isSynced", ride.isSynced)
            put("createdAt", ride.createdAt)
        }
    }
}
