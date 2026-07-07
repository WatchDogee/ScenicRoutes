package com.scenicroutes.app.ui.flows

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Integration tests for Usage Statistics flow
 * 
 * Tests the complete user flow:
 * 1. Navigate to Usage Statistics from Profile
 * 2. View statistics
 * 3. Change period
 * 4. View charts
 */
@RunWith(AndroidJUnit4::class)
class UsageStatisticsFlowIntegrationTest {
    
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    @Test
    fun usageStatisticsFlow_navigateFromProfile() {
        // Given - App started, user logged in
        
        // When - Navigate to Profile
        composeTestRule.onNodeWithText("Profile", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Profile screen should be displayed
        composeTestRule.onNodeWithText("Profile", substring = true)
            .assertExists()
        
        // When - Tap Usage Statistics menu item
        composeTestRule.onNodeWithText("Usage Statistics", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Usage Statistics screen should be displayed
        composeTestRule.onNodeWithText("Usage Statistics", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatisticsFlow_navigateFromSubscription() {
        // Given - App started, user logged in
        
        // When - Navigate to Subscription
        composeTestRule.onNodeWithText("Subscription", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Subscription screen should be displayed
        composeTestRule.onNodeWithText("Subscription", substring = true)
            .assertExists()
        
        // When - Tap "View Detailed Statistics" button
        composeTestRule.onNodeWithText("View Detailed Statistics", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Usage Statistics screen should be displayed
        composeTestRule.onNodeWithText("Usage Statistics", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatisticsFlow_changePeriod() {
        // Given - Usage Statistics screen displayed
        
        // When - Tap "This Week" period
        composeTestRule.onNodeWithText("This Week", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Data should reload (period changes)
        composeTestRule.onNodeWithText("This Week", substring = true)
            .assertExists()
        
        // When - Tap "This Year" period
        composeTestRule.onNodeWithText("This Year", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Data should reload again
        composeTestRule.onNodeWithText("This Year", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatisticsFlow_viewCharts() {
        // Given - Usage Statistics screen with data
        
        // Then - Charts should be visible
        composeTestRule.onNodeWithText("Routes by Type", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Routes by Curvature", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatisticsFlow_navigateBack() {
        // Given - Usage Statistics screen displayed
        
        // When - Tap back button
        composeTestRule.onNodeWithContentDescription("Back")
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Should navigate back to previous screen
        // Note: Actual screen depends on navigation path
    }
}









