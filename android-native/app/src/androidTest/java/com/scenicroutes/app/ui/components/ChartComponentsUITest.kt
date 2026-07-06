package com.scenicroutes.app.ui.components

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for chart components (BarChart, PieChart)
 */
@RunWith(AndroidJUnit4::class)
class ChartComponentsUITest {
    
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    @Test
    fun barChart_rendersWithData() {
        // Given
        val data = mapOf(
            "graphhopper" to 30,
            "round_trip" to 15,
        )
        
        // When
        composeTestRule.setContent {
            BarChart(data = data)
        }
        
        // Then
        composeTestRule.onNodeWithText("Routes by Type")
            .assertExists()
        composeTestRule.onNodeWithText("Graphhopper", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Round Trip", substring = true)
            .assertExists()
    }
    
    @Test
    fun barChart_doesNotRenderWithEmptyData() {
        // Given
        val emptyData = emptyMap<String, Int>()
        
        // When
        composeTestRule.setContent {
            BarChart(data = emptyData)
        }
        
        // Then
        composeTestRule.onNodeWithText("Routes by Type")
            .assertDoesNotExist()
    }
    
    @Test
    fun pieChart_rendersWithData() {
        // Given
        val data = mapOf(
            "curvy" to 20,
            "extra_curvy" to 10,
            "straightest" to 15,
        )
        
        // When
        composeTestRule.setContent {
            PieChart(data = data)
        }
        
        // Then
        composeTestRule.onNodeWithText("Routes by Curvature")
            .assertExists()
        composeTestRule.onNodeWithText("Curvy", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Extra Curvy", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Straightest", substring = true)
            .assertExists()
    }
    
    @Test
    fun pieChart_doesNotRenderWithEmptyData() {
        // Given
        val emptyData = emptyMap<String, Int>()
        
        // When
        composeTestRule.setContent {
            PieChart(data = emptyData)
        }
        
        // Then
        composeTestRule.onNodeWithText("Routes by Curvature")
            .assertDoesNotExist()
    }
    
    @Test
    fun pieChart_doesNotRenderWithZeroTotal() {
        // Given
        val zeroData = mapOf(
            "curvy" to 0,
            "straightest" to 0,
        )
        
        // When
        composeTestRule.setContent {
            PieChart(data = zeroData)
        }
        
        // Then
        composeTestRule.onNodeWithText("Routes by Curvature")
            .assertDoesNotExist()
    }
    
    @Test
    fun barChart_formatsLabelsCorrectly() {
        // Given
        val data = mapOf(
            "graphhopper" to 10,
            "round_trip" to 5,
        )
        
        // When
        composeTestRule.setContent {
            BarChart(data = data)
        }
        
        // Then - Labels should be formatted (capitalized, underscores replaced)
        composeTestRule.onNodeWithText("Graphhopper", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Round Trip", substring = true)
            .assertExists()
    }
    
    @Test
    fun pieChart_formatsLabelsCorrectly() {
        // Given
        val data = mapOf(
            "extra_curvy" to 10,
            "straightest" to 5,
        )
        
        // When
        composeTestRule.setContent {
            PieChart(data = data)
        }
        
        // Then - Labels should be formatted
        composeTestRule.onNodeWithText("Extra Curvy", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Straightest", substring = true)
            .assertExists()
    }
}









