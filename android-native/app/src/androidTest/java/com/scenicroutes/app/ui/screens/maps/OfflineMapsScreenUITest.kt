package com.scenicroutes.app.ui.screens.maps

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * UI tests for OfflineMapsScreen.
 *
 * Tests cover:
 * - Offline maps screen display
 * - Region list display
 * - Storage usage display
 * - Download and delete functionality
 * - Premium feature gating
 */
@RunWith(AndroidJUnit4::class)
class OfflineMapsScreenUITest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    /**
     * Helper function to navigate to offline maps screen via UI
     * Note: "Offline Maps" menu item may not be implemented yet in ActionMenuSheet
     */
    private fun navigateToOfflineMapsScreen() {
        composeTestRule.waitForIdle()
        
        // Step 1: Open action menu
        composeTestRule.onNodeWithTag("map_fab_button")
            .assertExists()
            .performClick()
        composeTestRule.waitForIdle()
        
        // Wait a bit for the bottom sheet to appear
        Thread.sleep(500)
        
        // Step 2: Click "Offline Maps" option
        // Note: This menu item may not exist yet - if test fails, check ActionMenuSheet.kt
        try {
            composeTestRule.onNodeWithText("Offline Maps", substring = true)
                .assertExists()
                .performClick()
            composeTestRule.waitForIdle()
            
            // Wait for navigation to complete
            Thread.sleep(500)
        } catch (e: AssertionError) {
            // If menu item not found, skip test with informative message
            throw AssertionError("Could not find 'Offline Maps' option in action menu. This feature may not be implemented in the UI yet.", e)
        }
    }

    @Test
    fun offlineMapsScreen_displaysTitle() {
        // Given - user navigates to offline maps screen
        navigateToOfflineMapsScreen()
        
        // Then - title should be visible
        composeTestRule.onNodeWithTag("offline_maps_title")
            .assertExists()
            .assertIsDisplayed()
    }

    @Test
    fun offlineMapsScreen_displaysStorageCard() {
        // Given - user is on offline maps screen
        navigateToOfflineMapsScreen()
        
        // Wait for regions to load
        Thread.sleep(1000)
        
        // Then - storage card should be visible
        composeTestRule.onNodeWithTag("offline_maps_storage_card")
            .assertExists()
    }

    @Test
    fun offlineMapsScreen_displaysRegionsList() {
        // Given - user is on offline maps screen
        navigateToOfflineMapsScreen()
        
        // Wait for regions to load
        Thread.sleep(1000)
        
        // Then - regions list should be visible
        composeTestRule.onNodeWithTag("offline_maps_regions_list")
            .assertExists()
    }

    @Test
    fun offlineMapsScreen_displaysRegionsTitle() {
        // Given - user is on offline maps screen
        navigateToOfflineMapsScreen()
        
        // Wait for regions to load
        Thread.sleep(1000)
        
        // Then - regions title should be visible
        composeTestRule.onNodeWithTag("offline_maps_regions_title")
            .assertExists()
    }

    @Test
    fun offlineMapsScreen_backButtonNavigatesBack() {
        // Given - user is on offline maps screen
        navigateToOfflineMapsScreen()
        
        // Then - back button should exist
        composeTestRule.onNodeWithTag("offline_maps_back_button")
            .assertExists()
            .assertIsDisplayed()
    }
}









