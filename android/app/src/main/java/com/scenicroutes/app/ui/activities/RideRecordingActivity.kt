package com.scenicroutes.app.ui.activities

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.IBinder
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.scenicroutes.app.R
import com.scenicroutes.app.data.Ride
import com.scenicroutes.app.services.RideRecordingService
import com.scenicroutes.app.ui.adapters.RideHistoryAdapter
import com.scenicroutes.app.viewmodels.RideRecordingViewModel
import kotlinx.coroutines.launch

/**
 * Ride Recording Activity
 * 
 * Main UI for ride recording with:
 * - Start/Pause/Resume/Stop controls
 * - Live stats (distance, duration, speed)
 * - Ride history
 */
class RideRecordingActivity : AppCompatActivity() {
    
    private val viewModel: RideRecordingViewModel by viewModels()
    private lateinit var recordingService: RideRecordingService
    private var serviceBound = false
    
    private lateinit var rideHistoryAdapter: RideHistoryAdapter
    
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val binderImpl = binder as RideRecordingService.RideRecordingBinder
            recordingService = binderImpl.getService()
            serviceBound = true
        }
        
        override fun onServiceDisconnected(name: ComponentName?) {
            serviceBound = false
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ride_recording)
        
        setupUI()
        bindToService()
        observeViewModel()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (serviceBound) {
            unbindService(serviceConnection)
            serviceBound = false
        }
    }
    
    private fun setupUI() {
        // Setup ride history RecyclerView
        val rideHistoryRecyclerView = findViewById<RecyclerView>(R.id.rideHistoryRecyclerView)
        rideHistoryAdapter = RideHistoryAdapter { ride ->
            onRideClicked(ride)
        }
        rideHistoryRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@RideRecordingActivity)
            adapter = rideHistoryAdapter
        }
        
        // Start recording button
        findViewById<android.widget.Button>(R.id.startRecordingButton).setOnClickListener {
            viewModel.startRecording()
        }
        
        // Pause button
        findViewById<android.widget.Button>(R.id.pauseRecordingButton).setOnClickListener {
            viewModel.pauseRecording()
        }
        
        // Resume button
        findViewById<android.widget.Button>(R.id.resumeRecordingButton).setOnClickListener {
            viewModel.resumeRecording()
        }
        
        // Stop button
        findViewById<android.widget.Button>(R.id.stopRecordingButton).setOnClickListener {
            viewModel.stopRecording()
        }
    }
    
    private fun observeViewModel() {
        // Observe recording state
        viewModel.isRecording.observe(this) { isRecording ->
            updateUIState(isRecording)
        }
        
        // Observe pause state
        viewModel.isPaused.observe(this) { isPaused ->
            updatePauseState(isPaused)
        }
        
        // Observe distance
        viewModel.distance.observe(this) { distance ->
            updateDistanceDisplay(distance)
        }
        
        // Observe duration
        viewModel.duration.observe(this) { duration ->
            updateDurationDisplay(duration)
        }
        
        // Observe speed
        viewModel.currentSpeed.observe(this) { speed ->
            updateSpeedDisplay(speed)
        }
        
        // Observe ride history
        viewModel.rideHistory.observe(this) { rides ->
            rideHistoryAdapter.submitList(rides)
        }
        
        // Observe errors
        viewModel.error.observe(this) { error ->
            if (error != null) {
                showError(error)
            }
        }
    }
    
    private fun updateUIState(isRecording: Boolean) {
        val startButton = findViewById<android.widget.Button>(R.id.startRecordingButton)
        val pauseButton = findViewById<android.widget.Button>(R.id.pauseRecordingButton)
        val stopButton = findViewById<android.widget.Button>(R.id.stopRecordingButton)
        val recordingIndicator = findViewById<android.widget.ImageView>(R.id.recordingIndicator)
        
        startButton.isEnabled = !isRecording
        pauseButton.isEnabled = isRecording
        stopButton.isEnabled = isRecording
        recordingIndicator.visibility = if (isRecording) android.view.View.VISIBLE else android.view.View.GONE
    }
    
    private fun updatePauseState(isPaused: Boolean) {
        val pauseButton = findViewById<android.widget.Button>(R.id.pauseRecordingButton)
        pauseButton.text = if (isPaused) "Resume" else "Pause"
    }
    
    private fun updateDistanceDisplay(distance: Double) {
        val distanceText = findViewById<android.widget.TextView>(R.id.distanceText)
        val km = distance / 1000.0
        distanceText.text = "%.2f km".format(km)
    }
    
    private fun updateDurationDisplay(duration: Long) {
        val durationText = findViewById<android.widget.TextView>(R.id.durationText)
        val hours = duration / 3600
        val minutes = (duration % 3600) / 60
        val seconds = duration % 60
        durationText.text = "%02d:%02d:%02d".format(hours, minutes, seconds)
    }
    
    private fun updateSpeedDisplay(speed: Double) {
        val speedText = findViewById<android.widget.TextView>(R.id.speedText)
        speedText.text = "%.1f m/s".format(speed)
    }
    
    private fun onRideClicked(ride: Ride) {
        // Show ride details
        val intent = Intent(this, RideDetailsActivity::class.java).apply {
            putExtra("rideId", ride.id)
        }
        startActivity(intent)
    }
    
    private fun showError(message: String) {
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_SHORT).show()
    }
    
    private fun bindToService() {
        val intent = Intent(this, RideRecordingService::class.java)
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
    }
}
