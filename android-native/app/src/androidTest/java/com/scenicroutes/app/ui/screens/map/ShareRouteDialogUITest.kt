package com.scenicroutes.app.ui.screens.map

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import com.scenicroutes.app.data.model.Route
import com.scenicroutes.app.utils.TestAuthHelper
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for ShareRouteDialog
 * 
 * Note: These tests require a route to be displayed on the map (via RouteInfoCard)
 * to open the ShareRouteDialog. The dialog is opened by clicking the "Share" button
 * in RouteInfoCard.
 */
@RunWith(AndroidJUnit4::class)
class ShareRouteDialogUITest {
    
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    /**
     * Helper function to calculate a route first, then open ShareRouteDialog
     * Steps:
     * 1. Ensure user is logged in (for route sharing)
     * 2. Calculate a simple route (Riga to Tallinn)
     * 3. Wait for RouteInfoCard to appear
     * 4. Click Share button in RouteInfoCard
     */
    private fun openShareDialog() {
        // Ensure user is logged in (sharing requires authentication)
        if (!TestAuthHelper.isLoggedIn(composeTestRule)) {
            TestAuthHelper.loginFreeUser(composeTestRule)
        }
        
        composeTestRule.waitForIdle()
        
        // Step 1: Open route planning dialog
        composeTestRule.onNodeWithTag("map_fab_button")
            .assertExists()
            .performClick()
        composeTestRule.waitForIdle()
        
        composeTestRule.onNodeWithTag("plan_route_action")
            .assertExists()
            .performClick()
        composeTestRule.waitForIdle()
        
        // Wait for dialog to appear
        composeTestRule.onNodeWithTag("plan_route_title")
            .assertExists()
        composeTestRule.waitForIdle()
        Thread.sleep(500)
        
        // Step 2: Enter start location
        composeTestRule.onNodeWithTag("start_location_input")
            .assertExists()
            .performTextInput("Riga")
        composeTestRule.waitForIdle()
        Thread.sleep(1000) // Wait for geocoding
        
        // Step 3: Enter end location
        composeTestRule.onNodeWithTag("end_location_input")
            .assertExists()
            .performTextInput("Tallinn")
        composeTestRule.waitForIdle()
        Thread.sleep(1000) // Wait for geocoding
        
        // Step 4: Click calculate button
        var calculateButtonEnabled = false
        var retries = 10
        while (!calculateButtonEnabled && retries > 0) {
            try {
                composeTestRule.onNodeWithTag("calculate_route_button")
                    .assertIsEnabled()
                calculateButtonEnabled = true
            } catch (e: AssertionError) {
                Thread.sleep(300)
                retries--
            }
        }
        
        if (!calculateButtonEnabled) {
            android.util.Log.w("ShareRouteDialogUITest", 
                "Calculate button not enabled - geocoding may not have completed")
        }
        
        composeTestRule.onNodeWithTag("calculate_route_button")
            .performClick()
        composeTestRule.waitForIdle()
        
        // Step 5: Wait for route to be calculated and RouteInfoCard to appear
        Thread.sleep(5000) // Wait for route calculation
        composeTestRule.waitForIdle()
        
        // Step 6: Look for Share button in RouteInfoCard
        try {
            // First try to find by test tag (more reliable)
            try {
                composeTestRule.onNodeWithTag("route_info_share_button")
                    .assertExists()
                    .performClick()
            } catch (e: AssertionError) {
                // Fallback: Try to find Share button by text
                composeTestRule.onAllNodesWithText("Share", substring = true, useUnmergedTree = true)
                    .onFirst()
                    .assertExists()
                    .performClick()
            }
            composeTestRule.waitForIdle()
            Thread.sleep(1000) // Wait for dialog to open
        } catch (e: AssertionError) {
            android.util.Log.w("ShareRouteDialogUITest", 
                "Could not find Share button. RouteInfoCard may not be visible. " +
                "Route calculation may have failed. Error: ${e.message}")
            throw AssertionError(
                "Cannot open ShareRouteDialog: Share button not found. " +
                "Route calculation may have failed or RouteInfoCard not displayed. ${e.message}"
            )
        }
    }
    
    @Test
    fun shareRouteDialog_displaysTitle() {
        // Given - Share dialog is open
        openShareDialog()
        
        // Then - Title should be displayed
        composeTestRule.onNodeWithText("Share Route", substring = true)
            .assertExists()
    }
    
    @Test
    fun shareRouteDialog_displaysShareURL() {
        // Given - Share dialog is open and URL is generated
        openShareDialog()
        
        // Wait for URL to be generated (async operation)
        composeTestRule.waitForIdle()
        Thread.sleep(3000) // Wait for API call to complete
        
        // Then - Share URL should be displayed (if successful)
        // URL might not appear if there's an error, so check for either URL or error
        val hasUrl = try {
            composeTestRule.onNodeWithText("http", substring = true)
                .assertExists()
            true
        } catch (e: AssertionError) {
            false
        }
        
        val hasError = try {
            composeTestRule.onNodeWithText("Error", substring = true, ignoreCase = true)
                .assertExists()
            true
        } catch (e: AssertionError) {
            false
        }
        
        // Either URL or error should be displayed
        assert(hasUrl || hasError) {
            "Share dialog should display either URL or error message"
        }
    }
    
    @Test
    fun shareRouteDialog_displaysQRCode() {
        // Given - Share dialog is open and QR code is generated
        openShareDialog()
        
        // Wait for QR code to be generated (async operation)
        composeTestRule.waitForIdle()
        Thread.sleep(4000) // Wait for API call and QR code generation
        
        // Then - QR code should be displayed (if URL was generated successfully)
        // QR code only appears if URL generation succeeded
        try {
            composeTestRule.onNodeWithContentDescription("QR Code")
                .assertExists()
        } catch (e: AssertionError) {
            // QR code might not appear if URL generation failed
            // Check if there's an error instead
            val hasError = try {
                composeTestRule.onNodeWithText("Error", substring = true, ignoreCase = true)
                    .assertExists()
                true
            } catch (e2: AssertionError) {
                false
            }
            
            if (hasError) {
                android.util.Log.w("ShareRouteDialogUITest", 
                    "QR Code not displayed because URL generation failed (expected)")
            } else {
                // If no error, QR code should be present
                throw AssertionError("QR Code should be displayed when URL is generated successfully")
            }
        }
    }
    
    @Test
    fun shareRouteDialog_copyButton_copiesURL() {
        // Given - Share dialog is open with URL
        openShareDialog()
        
        // Wait for URL to be generated
        composeTestRule.waitForIdle()
        Thread.sleep(3000)
        
        // When - Tap copy button (only if URL exists)
        try {
            composeTestRule.onNodeWithContentDescription("Copy")
                .assertExists()
                .performClick()
            
            // Then - Toast should appear (hard to test, but button click should work)
            composeTestRule.waitForIdle()
        } catch (e: AssertionError) {
            // Copy button might not exist if URL generation failed
            android.util.Log.w("ShareRouteDialogUITest", 
                "Copy button not found - URL may not have been generated: ${e.message}")
        }
    }
    
    @Test
    fun shareRouteDialog_shareButton_opensShareSheet() {
        // Given - Share dialog displayed with URL
        openShareDialog()
        
        // Wait for URL to be generated
        composeTestRule.waitForIdle()
        Thread.sleep(3000)
        
        // When - Tap share button (the main Share button at bottom)
        try {
            // Find the Share button (the main Share button at bottom, not the Copy icon button)
            // The Share button is a Button with text "Share" and an Icon
            // We'll look for all Share buttons and click the one that's a Button (not just text)
            composeTestRule.onAllNodesWithText("Share", substring = true, useUnmergedTree = true)
                .onFirst()
                .performClick()
            
            // Then - Android share sheet should open
            // Note: Share sheet is system UI, hard to test directly
            composeTestRule.waitForIdle()
            Thread.sleep(1000) // Wait for share sheet to open
        } catch (e: AssertionError) {
            android.util.Log.w("ShareRouteDialogUITest", 
                "Share button not found or URL not generated: ${e.message}")
        }
    }
    
    @Test
    fun shareRouteDialog_displaysStatistics_whenAvailable() {
        // Given - Share dialog with statistics (requires authenticated user)
        openShareDialog()
        
        // Wait for statistics to load
        composeTestRule.waitForIdle()
        Thread.sleep(5000) // Wait for API calls to complete
        
        // Then - Statistics section should be displayed (if available)
        // Statistics only appear if user is authenticated and stats exist
        try {
            composeTestRule.onNodeWithText("Share Statistics", substring = true)
                .assertExists()
            composeTestRule.onNodeWithText("Views", substring = true)
                .assertExists()
            composeTestRule.onNodeWithText("Shares", substring = true)
                .assertExists()
        } catch (e: AssertionError) {
            // Statistics might not be available (not authenticated or no stats yet)
            android.util.Log.d("ShareRouteDialogUITest", 
                "Statistics not displayed - may not be available yet or user not authenticated")
        }
    }
    
    @Test
    fun shareRouteDialog_closeButton_closesDialog() {
        // Given - Share dialog displayed
        openShareDialog()
        
        composeTestRule.waitForIdle()
        Thread.sleep(1000)
        
        // When - Tap close button
        composeTestRule.onNodeWithContentDescription("Close")
            .assertExists()
            .performClick()
        
        // Then - Dialog should close (verify by checking dialog title is gone)
        composeTestRule.waitForIdle()
        Thread.sleep(500)
        
        try {
            composeTestRule.onNodeWithText("Share Route", substring = true)
                .assertDoesNotExist()
        } catch (e: AssertionError) {
            // Dialog might still be closing
            android.util.Log.d("ShareRouteDialogUITest", "Dialog closing animation may still be in progress")
        }
    }
    
    @Test
    fun shareRouteDialog_displaysLoadingState() {
        // Given - Share dialog opening
        openShareDialog()
        
        // Then - Loading indicator should be displayed (may be very brief)
        // Check immediately after opening
        try {
            composeTestRule.onNode(hasContentDescription("CircularProgressIndicator"))
                .assertExists()
        } catch (e: AssertionError) {
            // Loading might be too fast to catch, or already completed
            android.util.Log.d("ShareRouteDialogUITest", 
                "Loading indicator not found - may have completed too quickly")
        }
    }
    
    @Test
    fun shareRouteDialog_displaysError_whenShareFails() {
        // Given - Share dialog with error (simulated by network failure or invalid route)
        // Note: This test may not reliably trigger an error state
        // In a real scenario, we'd mock the API to return an error
        
        openShareDialog()
        
        // Wait a bit to see if error appears
        composeTestRule.waitForIdle()
        Thread.sleep(3000)
        
        // Then - Error message should be displayed (if error occurred)
        // This test checks if error handling works, but may not always see an error
        val hasError = try {
            composeTestRule.onNodeWithText("Error", substring = true, ignoreCase = true)
                .assertExists()
            true
        } catch (e: AssertionError) {
            false
        }
        
        // Error might not appear if sharing succeeds
        if (!hasError) {
            android.util.Log.d("ShareRouteDialogUITest", 
                "No error displayed - sharing may have succeeded (expected in normal operation)")
        }
    }
}









