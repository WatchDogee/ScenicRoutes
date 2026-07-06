package com.scenicroutes.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * Room database for local ride storage
 */
@Database(
    entities = [Ride::class],
    version = 1,
    exportSchema = false
)
abstract class RideDatabase : RoomDatabase() {
    
    abstract fun rideDao(): RideDao
    
    companion object {
        @Volatile
        private var INSTANCE: RideDatabase? = null
        
        fun getInstance(context: Context): RideDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    RideDatabase::class.java,
                    "scenic_routes_rides.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                
                INSTANCE = instance
                instance
            }
        }
    }
}
