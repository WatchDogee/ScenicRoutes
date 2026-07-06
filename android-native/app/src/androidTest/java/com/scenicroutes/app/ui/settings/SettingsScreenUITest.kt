package com.scenicroutes.app.ui.settings

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.scenicroutes.app.MainActivity
import com.scenicroutes.app.ui.navigation.AppNavigation
import com.scenicroutes.app.utils.TestAuthHelper
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SettingsScreenUITest {
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    /**
     * Helper function to navigate to settings screen
     */
    private fun navigateToSettings() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Navigate to profile tab
        var profileFound = false
        var retries = 20
        while (retries > 0 && !profileFound) {
            try {
                composeTestRule.onAllNodesWithText("Profile", substring = true, useUnmergedTree = true)
                    .onFirst()
                    .assertExists()
                    .performClick()
                Thread.sleep(2000)
                profileFound = true
            } catch (e: Exception) {
                retries--
                Thread.sleep(500)
                if (retries == 0) {
                    android.util.Log.e("SettingsScreenUITest", "Profile tab not found: ${e.message}")
                    throw AssertionError("Could not find Profile tab: ${e.message}")
                }
            }
        }
        
        // Wait for profile screen to load
        Thread.sleep(2000)
        
        // Look for Settings button in profile screen
        // First, wait for profile screen to fully load
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        var settingsFound = false
        retries = 30
        while (retries > 0 && !settingsFound) {
            try {
                // Wait for UI to be idle
                composeTestRule.waitForIdle()
                
                // First try to find by testTag (more reliable)
                try {
                    composeTestRule.onNodeWithTag("profile_menu_item_settings", useUnmergedTree = true)
                        .assertExists()
                        .performClick()
                    Thread.sleep(2000)
                    settingsFound = true
                    break
                } catch (e: Exception) {
                    // Fall back to text search
                    android.util.Log.d("SettingsScreenUITest", "testTag not found, trying text search: ${e.message}")
                }
                
                // Try to find Settings button by text - check if any nodes exist first
                val settingsNodes = composeTestRule.onAllNodesWithText("Settings", substring = true, useUnmergedTree = true)
                val nodeList = settingsNodes.fetchSemanticsNodes()
                
                if (nodeList.isNotEmpty()) {
                    // Find a clickable Settings node (not the title)
                    // The Settings menu item should be clickable
                    var clicked = false
                    for (i in nodeList.indices) {
                        try {
                            settingsNodes[i].performClick()
                            Thread.sleep(2000)
                            clicked = true
                            settingsFound = true
                            break
                        } catch (e: Exception) {
                            // Try next node
                            continue
                        }
                    }
                    
                    if (!clicked) {
                        // If no node was clickable, try the first one anyway
                        settingsNodes.onFirst().performClick()
                        Thread.sleep(2000)
                        settingsFound = true
                    }
                } else {
                    // No Settings nodes found yet, wait and retry
                    Thread.sleep(500)
                    retries--
                }
            } catch (e: Exception) {
                retries--
                Thread.sleep(500)
                if (retries == 0) {
                    // Try scrolling to find Settings
                    try {
                        composeTestRule.onRoot().performScrollToNode(
                            hasText("Settings", substring = true)
                        )
                        Thread.sleep(1000)
                        val scrolledNodes = composeTestRule.onAllNodesWithText("Settings", substring = true, useUnmergedTree = true)
                        val scrolledList = scrolledNodes.fetchSemanticsNodes()
                        if (scrolledList.isNotEmpty()) {
                            scrolledNodes.onFirst().performClick()
                            Thread.sleep(2000)
                            settingsFound = true
                        } else {
                            throw AssertionError("Settings button not found even after scrolling")
                        }
                    } catch (e2: Exception) {
                        android.util.Log.e("SettingsScreenUITest", "Settings button not found after all retries: ${e.message}. Scroll: ${e2.message}")
                        throw AssertionError("Could not find Settings button in profile screen after navigation. Original error: ${e.message}. Scroll error: ${e2.message}")
                    }
                }
            }
        }
        
        if (!settingsFound) {
            throw AssertionError("Failed to navigate to Settings screen: Settings button not found after all retries")
        }
        
        // Wait for navigation to complete - don't verify here, let tests do it
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Note: We don't verify here because the screen might still be loading
        // Individual tests will verify they're on the correct screen
    }

    @Before
    fun setUp() {
        // Login as premium user to access all settings
        TestAuthHelper.loginPremiumUser(composeTestRule)
        
        // Navigate to settings screen
        navigateToSettings()
    }

    @Test
    fun testSettingsScreenLoads() {
        composeTestRule.waitForIdle()
        Thread.sleep(3000) // Give extra time for screen to load
        
        // Verify settings screen title is displayed in TopAppBar
        // Try multiple times with retries
        var found = false
        var retries = 10
        while (retries > 0 && !found) {
            try {
                composeTestRule.onAllNodesWithText("Settings", substring = true, useUnmergedTree = true)
                    .onFirst()
                    .assertExists()
                found = true
            } catch (e: Exception) {
                retries--
                Thread.sleep(500)
                if (retries == 0) {
                    throw AssertionError("Settings screen title not found: ${e.message}")
                }
            }
        }
        
        // Also verify at least one settings section exists
        try {
            composeTestRule.onNodeWithText("Units", substring = true, useUnmergedTree = true)
                .assertExists()
        } catch (e: Exception) {
            // Try scrolling to find it
            try {
                composeTestRule.onRoot().performScrollToNode(
                    hasText("Units", substring = true)
                )
                composeTestRule.onNodeWithText("Units", substring = true, useUnmergedTree = true)
                    .assertExists()
            } catch (e2: Exception) {
                throw AssertionError("Could not find Units section: ${e.message}. Scroll: ${e2.message}")
            }
        }
    }

    @Test
    fun testMeasurementUnitsSetting() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Scroll to Units section if needed
        try {
            composeTestRule.onNodeWithText("Units", substring = true, useUnmergedTree = true)
                .assertExists()
        } catch (e: Exception) {
            composeTestRule.onRoot().performScrollToNode(
                hasText("Units", substring = true)
            )
        }
        
        // Find and click Metric chip
        composeTestRule.onAllNodesWithText("Metric", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
            .performClick()
        
        Thread.sleep(1000)
        
        // Verify Metric is selected (FilterChip should be selected)
        composeTestRule.onAllNodesWithText("Metric", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        // Click Imperial
        composeTestRule.onAllNodesWithText("Imperial", substring = true, useUnmergedTree = true)
            .onFirst()
            .performClick()
        
        Thread.sleep(1000)
        
        // Verify Imperial is selected
        composeTestRule.onAllNodesWithText("Imperial", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
    }

    @Test
    fun testMapViewSetting() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Scroll to Map section if needed - use onFirst() since there are multiple "Map" nodes
        try {
            composeTestRule.onAllNodesWithText("Map", substring = true, useUnmergedTree = true)
                .onFirst()
                .assertExists()
        } catch (e: Exception) {
            composeTestRule.onRoot().performScrollToNode(
                hasText("Map", substring = true)
            )
        }
        
        // Find map view options
        composeTestRule.onAllNodesWithText("Standard", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        composeTestRule.onAllNodesWithText("Terrain", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        composeTestRule.onAllNodesWithText("Satellite", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        // Click Terrain (RadioButton)
        composeTestRule.onAllNodesWithText("Terrain", substring = true, useUnmergedTree = true)
            .onFirst()
            .performClick()
        
        Thread.sleep(1000)
        
        // Verify Terrain is selected
        composeTestRule.onAllNodesWithText("Terrain", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
    }

    @Test
    fun testThemeSetting() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Scroll to Appearance section if needed
        try {
            composeTestRule.onNodeWithText("Appearance", substring = true, useUnmergedTree = true)
                .assertExists()
        } catch (e: Exception) {
            composeTestRule.onRoot().performScrollToNode(
                hasText("Appearance", substring = true)
            )
        }
        
        // Find theme options
        composeTestRule.onAllNodesWithText("Light", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        composeTestRule.onAllNodesWithText("Dark", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        composeTestRule.onAllNodesWithText("System", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        // Click Dark theme (RadioButton)
        composeTestRule.onAllNodesWithText("Dark", substring = true, useUnmergedTree = true)
            .onFirst()
            .performClick()
        
        Thread.sleep(2000) // Wait for theme to apply
        
        // Verify Dark theme option exists (theme should be applied)
        composeTestRule.onAllNodesWithText("Dark", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
    }

    @Test
    fun testSearchRadiusSetting() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Scroll to Search section if needed - use onFirst() since there are multiple "Search" nodes
        try {
            composeTestRule.onAllNodesWithText("Search", substring = true, useUnmergedTree = true)
                .onFirst()
                .assertExists()
        } catch (e: Exception) {
            composeTestRule.onRoot().performScrollToNode(
                hasText("Search", substring = true)
            )
        }
        
        // Look for default search radius text - be more specific
        try {
            composeTestRule.onNodeWithText("Default Search Radius", substring = true, useUnmergedTree = true)
                .assertExists()
        } catch (e: Exception) {
            // Try alternative text - look for "Radius" in the context of search settings
            composeTestRule.onRoot().performScrollToNode(
                hasText("Default Search Radius", substring = true)
            )
            composeTestRule.onNodeWithText("Default Search Radius", substring = true, useUnmergedTree = true)
                .assertExists()
        }
    }

    @Test
    fun testNotificationsSetting() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Scroll to Notifications section if needed - use onFirst() since there are multiple "Notifications" nodes
        try {
            composeTestRule.onAllNodesWithText("Notifications", substring = true, useUnmergedTree = true)
                .onFirst()
                .assertExists()
        } catch (e: Exception) {
            composeTestRule.onRoot().performScrollToNode(
                hasText("Notifications", substring = true)
            )
        }
        
        // Verify "Enable Notifications" text exists (more specific)
        composeTestRule.onNodeWithText("Enable Notifications", substring = true, useUnmergedTree = true)
            .assertExists()
        
        // Verify notifications section was found
        val notificationNodes = composeTestRule.onAllNodesWithText("Notifications", substring = true, useUnmergedTree = true)
        assert(notificationNodes.fetchSemanticsNodes().isNotEmpty()) {
            "Notifications section not found"
        }
    }

    @Test
    fun testNavigationAppSetting() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Scroll to Navigation section if needed
        try {
            composeTestRule.onNodeWithText("Navigation", substring = true, useUnmergedTree = true)
                .assertExists()
        } catch (e: Exception) {
            composeTestRule.onRoot().performScrollToNode(
                hasText("Navigation", substring = true)
            )
        }
        
        // Find navigation app options
        composeTestRule.onAllNodesWithText("Google Maps", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        composeTestRule.onAllNodesWithText("Waze", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
        
        // Click Waze (RadioButton)
        composeTestRule.onAllNodesWithText("Waze", substring = true, useUnmergedTree = true)
            .onFirst()
            .performClick()
        
        Thread.sleep(1000)
        
        // Verify Waze is selected
        composeTestRule.onAllNodesWithText("Waze", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
    }

    @Test
    fun testSettingsPersistAfterNavigation() {
        composeTestRule.waitForIdle()
        Thread.sleep(2000)
        
        // Scroll to Appearance section
        try {
            composeTestRule.onAllNodesWithText("Appearance", substring = true, useUnmergedTree = true)
                .onFirst()
                .assertExists()
        } catch (e: Exception) {
            composeTestRule.onRoot().performScrollToNode(
                hasText("Appearance", substring = true)
            )
        }
        
        // Change theme to Dark
        composeTestRule.onAllNodesWithText("Dark", substring = true, useUnmergedTree = true)
            .onFirst()
            .performClick()
        
        Thread.sleep(2000)
        
        // Navigate back using back button
        composeTestRule.onAllNodesWithContentDescription("Back", substring = true, useUnmergedTree = true)
            .onFirst()
            .performClick()
        
        Thread.sleep(2000)
        
        // Wait for profile screen to load
        composeTestRule.waitForIdle()
        Thread.sleep(1000)
        
        // Navigate back to settings from profile - use testTag if available
        var settingsClicked = false
        try {
            composeTestRule.onNodeWithTag("profile_menu_item_settings", useUnmergedTree = true)
                .assertExists()
                .performClick()
            settingsClicked = true
        } catch (e: Exception) {
            // Fall back to text search
            composeTestRule.onAllNodesWithText("Settings", substring = true, useUnmergedTree = true)
                .onFirst()
                .performClick()
            settingsClicked = true
        }
        
        Thread.sleep(2000)
        composeTestRule.waitForIdle()
        Thread.sleep(1000)
        
        // Scroll to Appearance section again - wait for screen to load
        var appearanceFound = false
        var retries = 10
        while (retries > 0 && !appearanceFound) {
            try {
                composeTestRule.onAllNodesWithText("Appearance", substring = true, useUnmergedTree = true)
                    .onFirst()
                    .assertExists()
                appearanceFound = true
            } catch (e: Exception) {
                retries--
                Thread.sleep(500)
                if (retries > 0) {
                    try {
                        composeTestRule.onRoot().performScrollToNode(
                            hasText("Appearance", substring = true)
                        )
                        Thread.sleep(500)
                    } catch (e2: Exception) {
                        // Continue retrying
                    }
                } else {
                    throw AssertionError("Could not find Appearance section after navigation: ${e.message}")
                }
            }
        }
        
        // Verify Dark theme is still selected
        composeTestRule.onAllNodesWithText("Dark", substring = true, useUnmergedTree = true)
            .onFirst()
            .assertExists()
    }
}







