package com.scenicroutes.app.utils

import org.junit.Assert.assertEquals
import org.junit.Test

class DistanceFormatterTest {
    @Test
    fun testFormatDistanceMetric_SmallDistance() {
        val result = DistanceFormatter.formatDistance(500.0, "metric")
        assertEquals("500 m", result)
    }

    @Test
    fun testFormatDistanceMetric_MediumDistance() {
        val result = DistanceFormatter.formatDistance(5000.0, "metric")
        assertEquals("5.0 km", result)
    }

    @Test
    fun testFormatDistanceMetric_LargeDistance() {
        val result = DistanceFormatter.formatDistance(15000.0, "metric")
        assertEquals("15 km", result)
    }

    @Test
    fun testFormatDistanceImperial_SmallDistance() {
        val result = DistanceFormatter.formatDistance(100.0, "imperial")
        // 100m = ~328ft
        assertEquals("328 ft", result)
    }

    @Test
    fun testFormatDistanceImperial_MediumDistance() {
        val result = DistanceFormatter.formatDistance(5000.0, "imperial")
        // 5000m = ~3.1mi (formatter uses %.1f for < 10 miles)
        assertEquals("3.1 mi", result)
    }

    @Test
    fun testFormatDistanceImperial_LargeDistance() {
        val result = DistanceFormatter.formatDistance(50000.0, "imperial")
        // 50000m = ~31mi (formatter uses %.0f for >= 10 miles)
        assertEquals("31 mi", result)
    }

    @Test
    fun testFormatSpeedMetric() {
        val result = DistanceFormatter.formatSpeed(16.67, "metric") // ~60 km/h
        assertEquals("60.0 km/h", result)
    }

    @Test
    fun testFormatSpeedImperial() {
        val result = DistanceFormatter.formatSpeed(16.67, "imperial") // ~37 mph
        assertEquals("37.3 mph", result)
    }

    @Test
    fun testConvertDistanceMetric() {
        val (value, unit) = DistanceFormatter.convertDistance(5000.0, "metric")
        assertEquals(5.0, value, 0.1)
        assertEquals("km", unit)
    }

    @Test
    fun testConvertDistanceImperial() {
        val (value, unit) = DistanceFormatter.convertDistance(5000.0, "imperial")
        assertEquals(3.1, value, 0.1)
        assertEquals("mi", unit)
    }
}







