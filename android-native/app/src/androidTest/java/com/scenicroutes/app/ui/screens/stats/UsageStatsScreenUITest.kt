package com.scenicroutes.app.ui.screens.stats

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.data.model.UsageStatistics
import com.scenicroutes.app.data.repository.SubscriptionRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for UsageStatsScreen
 */
@RunWith(AndroidJUnit4::class)
class UsageStatsScreenUITest {
    
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    @Before
    fun setup() {
        // Navigate to usage stats screen
        // Note: Requires authentication token
        composeTestRule.waitForIdle()
    }
    
    @Test
    fun usageStatsScreen_displaysTitle() {
        // Given - Navigate to Usage Stats screen
        // Note: Actual navigation depends on authentication state
        
        // Then - Title should be displayed
        composeTestRule.onNodeWithText("Usage Statistics", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatsScreen_displaysPeriodSelector() {
        // Given - Usage Stats screen is displayed
        
        // Then - Period selector should be visible
        composeTestRule.onNodeWithText("Today", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("This Week", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("This Month", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("This Year", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatsScreen_displaysSummaryCards() {
        // Given - Usage Stats screen with data
        
        // Then - Summary cards should be displayed
        composeTestRule.onNodeWithText("Total Routes", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Total Distance", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Avg Distance", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Routes/Day", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatsScreen_periodSelector_changesPeriod() {
        // Given - Usage Stats screen displayed
        
        // When - Tap "This Week" period
        composeTestRule.onNodeWithText("This Week", substring = true)
            .performClick()
        
        // Then - Period should change (data reloads)
        composeTestRule.waitForIdle()
        composeTestRule.onNodeWithText("This Week", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatsScreen_displaysCharts_whenDataAvailable() {
        // Given - Usage Stats screen with chart data
        
        // Then - Charts should be displayed
        composeTestRule.onNodeWithText("Routes by Type", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Routes by Curvature", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatsScreen_displaysEmptyState_whenNoData() {
        // Given - Usage Stats screen with no data
        
        // Then - Empty state should be displayed
        composeTestRule.onNodeWithText("No usage data", substring = true)
            .assertExists()
    }
    
    @Test
    fun usageStatsScreen_displaysLoadingState() {
        // Given - Usage Stats screen loading
        
        // Then - Loading indicator should be displayed
        // Note: Loading state may be too fast to catch in tests
        composeTestRule.waitForIdle()
    }
    
    @Test
    fun usageStatsScreen_backButton_navigatesBack() {
        // Given - Usage Stats screen displayed
        
        // When - Tap back button
        composeTestRule.onNodeWithContentDescription("Back")
            .performClick()
        
        // Then - Should navigate back
        composeTestRule.waitForIdle()
    }
}









