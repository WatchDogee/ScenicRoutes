package com.scenicroutes.app.data

import androidx.room.*

/**
 * DAO for Ride database operations
 */
@Dao
interface RideDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(ride: Ride)
    
    @Update
    suspend fun update(ride: Ride)
    
    @Delete
    suspend fun delete(ride: Ride)
    
    @Query("SELECT * FROM rides WHERE id = :rideId")
    suspend fun getRideById(rideId: String): Ride?
    
    @Query("SELECT * FROM rides ORDER BY startTime DESC")
    suspend fun getAllRides(): List<Ride>
    
    @Query("SELECT * FROM rides WHERE isSynced = 0 ORDER BY startTime DESC")
    suspend fun getUnsyncedRides(): List<Ride>
    
    @Query("SELECT * FROM rides WHERE linkedRouteId = :routeId ORDER BY startTime DESC")
    suspend fun getRidesByRouteId(routeId: String): List<Ride>
    
    @Query("UPDATE rides SET isSynced = 1 WHERE id = :rideId")
    suspend fun markAsSynced(rideId: String)
    
    @Query("DELETE FROM rides WHERE id = :rideId")
    suspend fun deleteById(rideId: String)
    
    @Query("DELETE FROM rides WHERE endTime < :timestamp")
    suspend fun deleteOlderThan(timestamp: Long)
}
