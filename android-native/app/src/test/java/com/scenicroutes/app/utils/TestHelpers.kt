package com.scenicroutes.app.utils

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.TestScope

/**
 * Helper functions for testing.
 */
object TestHelpers {

    /**
     * Get the first value from a Flow (useful for StateFlow testing).
     */
    suspend fun <T> Flow<T>.getValue(): T {
        return first()
    }

    /**
     * Collect all values from a Flow during a test.
     */
    suspend fun <T> Flow<T>.collectValues(): List<T> {
        return toList()
    }

    /**
     * Wait for a condition to be true (useful for async operations).
     */
    suspend fun waitForCondition(
        timeoutMillis: Long = 5000,
        condition: () -> Boolean,
    ): Boolean {
        val startTime = System.currentTimeMillis()
        while (System.currentTimeMillis() - startTime < timeoutMillis) {
            if (condition()) {
                return true
            }
            kotlinx.coroutines.delay(100)
        }
        return false
    }

    /**
     * Create a test scope for coroutine testing.
     */
    fun createTestScope(): TestScope {
        return TestScope()
    }
}
















