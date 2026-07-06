package com.scenicroutes.app.utils

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.ext.junit.rules.ActivityScenarioRule
import com.scenicroutes.app.MainActivity

/**
 * Test utility functions for authentication in UI tests.
 * 
 * Provides helper functions to:
 * - Log in test users (free, premium, pro)
 * - Check authentication state
 * - Log out users
 */
object TestAuthHelper {
    
    /**
     * Test user credentials
     * 
     * These match the test accounts created by TestSubscriptionUsersSeeder
     * See TEST_ACCOUNTS.md for details
     */
    object TestUsers {
        const val PREMIUM_EMAIL = "test_premium@example.com"
        const val PREMIUM_PASSWORD = "Password123!"
        
        const val FREE_EMAIL = "test_free@example.com"
        const val FREE_PASSWORD = "Password123!"
        
        const val PRO_EMAIL = "test_pro@example.com"
        const val PRO_PASSWORD = "Password123!"
    }
    
    /**
     * Log in a user via UI
     * 
     * @param composeTestRule The compose test rule (from createAndroidComposeRule<MainActivity>())
     * @param email Email address
     * @param password Password
     * @param waitForSuccess If true, waits for login to complete and verifies success
     * @return true if login appears successful, false otherwise
     */
    fun loginUser(
        composeTestRule: AndroidComposeTestRule<ActivityScenarioRule<MainActivity>, MainActivity>,
        email: String,
        password: String,
        waitForSuccess: Boolean = true
    ): Boolean {
        try {
            composeTestRule.waitForIdle()
            
            // Navigate to Profile screen
            try {
                composeTestRule.onNodeWithTag("bottom_nav_item_profile")
                    .assertExists()
                    .performClick()
            } catch (e: AssertionError) {
                // Try alternative way to navigate to profile
                try {
                    composeTestRule.onAllNodesWithText("Profile", useUnmergedTree = true)
                        .onFirst()
                        .performClick()
                } catch (e2: AssertionError) {
                    android.util.Log.e("TestAuthHelper", "Could not navigate to Profile screen: ${e.message}")
                    return false
                }
            }
            composeTestRule.waitForIdle()
            Thread.sleep(1500) // Wait for screen transition
            
            // Check if already logged in
            val alreadyLoggedIn = try {
                composeTestRule.onNodeWithTag("email_input")
                    .assertDoesNotExist()
                true
            } catch (e: AssertionError) {
                false
            }
            
            if (alreadyLoggedIn) {
                android.util.Log.d("TestAuthHelper", "User already logged in")
                // Navigate back to map to avoid leaving test in profile screen
                composeTestRule.onNodeWithTag("bottom_nav_item_map")
                    .performClick()
                composeTestRule.waitForIdle()
                return true
            }
            
            // Enter email
            composeTestRule.onNodeWithTag("email_input")
                .assertExists()
                .performTextInput(email)
            composeTestRule.waitForIdle()
            
            // Enter password
            composeTestRule.onNodeWithTag("password_input")
                .assertExists()
                .performTextInput(password)
            composeTestRule.waitForIdle()
            
            // Click login button
            composeTestRule.onNodeWithTag("login_button")
                .assertExists()
                .performClick()
            composeTestRule.waitForIdle()
            
            if (waitForSuccess) {
                // Wait for login to complete (check if login form disappears)
                Thread.sleep(4000) // Wait for API call (increased wait time)
                composeTestRule.waitForIdle()
                
                // Verify login succeeded by checking if login form is gone
                val loginSucceeded = try {
                    composeTestRule.onNodeWithTag("email_input")
                        .assertDoesNotExist()
                    true
                } catch (e: AssertionError) {
                    false
                }
                
                if (loginSucceeded) {
                    android.util.Log.d("TestAuthHelper", "Login successful for $email")
                    // Navigate back to map to avoid leaving test in profile screen
                    try {
                        composeTestRule.onNodeWithTag("bottom_nav_item_map")
                            .performClick()
                        composeTestRule.waitForIdle()
                        Thread.sleep(500)
                    } catch (e: AssertionError) {
                        android.util.Log.w("TestAuthHelper", "Could not navigate back to map: ${e.message}")
                    }
                } else {
                    android.util.Log.w("TestAuthHelper", "Login may have failed - login form still visible")
                }
                
                return loginSucceeded
            }
            
            return true
        } catch (e: Exception) {
            android.util.Log.e("TestAuthHelper", "Error during login: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Log in premium user
     */
    fun loginPremiumUser(
        composeTestRule: AndroidComposeTestRule<ActivityScenarioRule<MainActivity>, MainActivity>
    ): Boolean {
        return loginUser(composeTestRule, TestUsers.PREMIUM_EMAIL, TestUsers.PREMIUM_PASSWORD)
    }
    
    /**
     * Log in free user
     */
    fun loginFreeUser(
        composeTestRule: AndroidComposeTestRule<ActivityScenarioRule<MainActivity>, MainActivity>
    ): Boolean {
        return loginUser(composeTestRule, TestUsers.FREE_EMAIL, TestUsers.FREE_PASSWORD)
    }
    
    /**
     * Check if user is currently logged in
     */
    fun isLoggedIn(
        composeTestRule: AndroidComposeTestRule<ActivityScenarioRule<MainActivity>, MainActivity>
    ): Boolean {
        try {
            composeTestRule.waitForIdle()
            
            // Navigate to Profile screen
            composeTestRule.onNodeWithTag("bottom_nav_item_profile")
                .assertExists()
                .performClick()
            composeTestRule.waitForIdle()
            Thread.sleep(500)
            
            // Check if login form exists (if not, user is logged in)
            val hasLoginForm = try {
                composeTestRule.onNodeWithTag("email_input")
                    .assertExists()
                true
            } catch (e: AssertionError) {
                false
            }
            
            return !hasLoginForm
        } catch (e: Exception) {
            android.util.Log.e("TestAuthHelper", "Error checking login state: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Log out current user
     */
    fun logoutUser(
        composeTestRule: AndroidComposeTestRule<ActivityScenarioRule<MainActivity>, MainActivity>
    ): Boolean {
        try {
            composeTestRule.waitForIdle()
            
            // Navigate to Profile screen
            composeTestRule.onNodeWithTag("bottom_nav_item_profile")
                .assertExists()
                .performClick()
            composeTestRule.waitForIdle()
            Thread.sleep(500)
            
            // Look for logout button
            val logoutButtonExists = try {
                composeTestRule.onAllNodesWithText("Logout", substring = true, useUnmergedTree = true)
                    .fetchSemanticsNodes()
                    .isNotEmpty()
            } catch (e: AssertionError) {
                false
            }
            
            if (logoutButtonExists) {
                composeTestRule.onAllNodesWithText("Logout", substring = true, useUnmergedTree = true)
                    .onFirst()
                    .performClick()
                composeTestRule.waitForIdle()
                Thread.sleep(1000)
                android.util.Log.d("TestAuthHelper", "User logged out")
                return true
            } else {
                android.util.Log.d("TestAuthHelper", "No logout button found - user may not be logged in")
                return false
            }
        } catch (e: Exception) {
            android.util.Log.e("TestAuthHelper", "Error during logout: ${e.message}", e)
            return false
        }
    }
}







