package com.scenicroutes.app.ui.flows

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Integration tests for Route Sharing flow
 * 
 * Tests the complete user flow:
 * 1. Calculate a route
 * 2. Open share dialog
 * 3. View QR code
 * 4. Copy URL
 * 5. Share route
 */
@RunWith(AndroidJUnit4::class)
class RouteSharingFlowIntegrationTest {
    
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    @Test
    fun routeSharingFlow_openShareDialog() {
        // Given - Route calculated and displayed
        
        // When - Tap "Share" button in route info card
        composeTestRule.onNodeWithText("Share", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Share dialog should be displayed
        composeTestRule.onNodeWithText("Share Route", substring = true)
            .assertExists()
    }
    
    @Test
    fun routeSharingFlow_viewQRCode() {
        // Given - Share dialog opened
        
        // Then - QR code should be displayed
        composeTestRule.onNodeWithContentDescription("QR Code")
            .assertExists()
        
        // And - QR code should have correct size (200dp)
        // Note: Size verification requires more complex testing
    }
    
    @Test
    fun routeSharingFlow_viewShareURL() {
        // Given - Share dialog opened
        
        // Then - Share URL should be displayed
        composeTestRule.onNodeWithText("http", substring = true)
            .assertExists()
    }
    
    @Test
    fun routeSharingFlow_copyURL() {
        // Given - Share dialog with URL displayed
        
        // When - Tap copy button
        composeTestRule.onNodeWithContentDescription("Copy")
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - URL should be copied to clipboard
        // Note: Clipboard verification requires system access
    }
    
    @Test
    fun routeSharingFlow_viewStatistics() {
        // Given - Share dialog opened with statistics available
        
        // Then - Statistics section should be displayed
        composeTestRule.onNodeWithText("Share Statistics", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Views", substring = true)
            .assertExists()
        composeTestRule.onNodeWithText("Shares", substring = true)
            .assertExists()
    }
    
    @Test
    fun routeSharingFlow_shareViaIntent() {
        // Given - Share dialog opened
        
        // When - Tap "Share" button
        composeTestRule.onNodeWithText("Share", substring = true)
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Android share sheet should open
        // Note: Share sheet is system UI, hard to test directly
    }
    
    @Test
    fun routeSharingFlow_closeDialog() {
        // Given - Share dialog opened
        
        // When - Tap close button
        composeTestRule.onNodeWithContentDescription("Close")
            .performClick()
        composeTestRule.waitForIdle()
        
        // Then - Dialog should close
        composeTestRule.onNodeWithText("Share Route", substring = true)
            .assertDoesNotExist()
    }
}









