package com.scenicroutes.app.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.scenicroutes.app.R
import com.scenicroutes.app.data.Ride
import java.text.SimpleDateFormat
import java.util.*

/**
 * Adapter for displaying ride history
 */
class RideHistoryAdapter(
    private val onRideClick: (Ride) -> Unit
) : ListAdapter<Ride, RideHistoryAdapter.RideViewHolder>(RideDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RideViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_ride_history, parent, false)
        return RideViewHolder(view, onRideClick)
    }
    
    override fun onBindViewHolder(holder: RideViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    class RideViewHolder(
        itemView: View,
        private val onRideClick: (Ride) -> Unit
    ) : RecyclerView.ViewHolder(itemView) {
        
        private val dateText: TextView = itemView.findViewById(R.id.rideDate)
        private val distanceText: TextView = itemView.findViewById(R.id.rideDistance)
        private val durationText: TextView = itemView.findViewById(R.id.rideDuration)
        private val speedText: TextView = itemView.findViewById(R.id.rideSpeed)
        
        fun bind(ride: Ride) {
            // Format date
            val dateFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
            dateText.text = dateFormat.format(Date(ride.startTime))
            
            // Format distance
            val km = ride.distanceMeters / 1000.0
            distanceText.text = "%.2f km".format(km)
            
            // Format duration
            val hours = ride.durationSeconds / 3600
            val minutes = (ride.durationSeconds % 3600) / 60
            durationText.text = "%02d:%02d".format(hours, minutes)
            
            // Format speed
            speedText.text = "%.1f m/s avg".format(ride.averageSpeed)
            
            // Click handler
            itemView.setOnClickListener {
                onRideClick(ride)
            }
        }
    }
    
    class RideDiffCallback : DiffUtil.ItemCallback<Ride>() {
        override fun areItemsTheSame(oldItem: Ride, newItem: Ride): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: Ride, newItem: Ride): Boolean {
            return oldItem == newItem
        }
    }
}
