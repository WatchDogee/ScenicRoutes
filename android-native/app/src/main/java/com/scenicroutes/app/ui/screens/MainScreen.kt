package com.scenicroutes.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.currentBackStackEntryAsState
import com.scenicroutes.app.ui.navigation.AppNavigation
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Main screen with bottom navigation bar
 * Provides tabs for Map, Discover, My Roads, and Profile
 */
@Composable
fun MainScreen() {
    val navController = androidx.navigation.compose.rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val coroutineScope = rememberCoroutineScope()
    // Extract base route without query parameters for proper matching
    val currentRoute = navBackStackEntry?.destination?.route?.substringBefore("?") ?: "map"
    
    // Track navigation state changes for debugging
    LaunchedEffect(navBackStackEntry?.destination?.route) {
        val route = navBackStackEntry?.destination?.route
        android.util.Log.d("MainScreen", "Navigation state changed. Current route: $route, Base route: $currentRoute")
    }

    // Define bottom navigation items
    val bottomNavItems = listOf(
        BottomNavItem(
            route = "map",
            label = "Map",
            icon = Icons.Default.Map,
        ),
        BottomNavItem(
            route = "explore",
            label = "Discover",
            icon = Icons.Default.Public,
        ),
        BottomNavItem(
            route = "trips",
            label = "My Roads",
            icon = Icons.Default.Bookmark,
        ),
        BottomNavItem(
            route = "profile",
            label = "Profile",
            icon = Icons.Default.Person,
        ),
    )

    Box(modifier = Modifier.fillMaxSize()) {
        // Check if we're on navigation screen (hide bottom nav during navigation)
        val isNavigating = currentRoute == "navigation"
        
        // Content area - accounts for bottom bar only if not navigating
        AppNavigation(
            navController = navController,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = if (isNavigating) 0.dp else 80.dp), // Space for bottom navigation bar only when not navigating
        )
        
        // Bottom navigation bar - hide during navigation
        if (!isNavigating) {
            NavigationBar(
                modifier = Modifier
                    .align(androidx.compose.ui.Alignment.BottomCenter)
                    .fillMaxWidth()
                    .testTag("bottom_navigation_bar"),
            ) {
                bottomNavItems.forEach { item ->
                NavigationBarItem(
                    modifier = Modifier.testTag("bottom_nav_item_${item.route}"),
                    icon = {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.label,
                        )
                    },
                    label = { Text(item.label) },
                    selected = currentRoute == item.route,
                    onClick = {
                        val baseCurrentRoute = navBackStackEntry?.destination?.route?.substringBefore("?") ?: "map"
                        if (baseCurrentRoute != item.route) {
                            android.util.Log.d("MainScreen", "=== Tab Navigation: $baseCurrentRoute -> ${item.route} ===")
                            val currentDestination = navBackStackEntry?.destination?.route
                            android.util.Log.d("MainScreen", "Current full route: $currentDestination")
                            
                            // Improved navigation logic for tab switching
                            // When switching tabs, we want to:
                            // 1. Clear any nested navigation (like road_details, navigation screen, etc.)
                            // 2. Navigate to the target tab
                            // 3. Ensure the target tab is properly displayed
                            
                            // Improved navigation strategy for tab switching:
                            // When navigating from a route with query parameters (e.g., "map?roadId=123")
                            // to another tab, we need to ensure clean navigation.
                            
                            // The issue: popUpTo(startDestinationId) might not work correctly when
                            // we're on "map?roadId=123" because it's technically a different route than "map"
                            
                            // Solution: Use a more explicit navigation approach
                            // 1. If we're navigating from a route with query params, navigate to base route first
                            // 2. Then navigate to target tab
                            
                            val startDestId = navController.graph.startDestinationId
                            
                            // Check if current route has query parameters
                            val hasQueryParams = currentDestination != null && 
                                currentDestination.contains("?") && 
                                !currentDestination.startsWith(item.route)
                            
                            if (hasQueryParams && baseCurrentRoute == "map") {
                                // We're on map with query params, navigating to another tab
                                // First navigate to clean "map" route, then to target tab
                                android.util.Log.d("MainScreen", 
                                    "Navigating from map with query params to ${item.route}, clearing query params first")
                                
                                // Navigate to clean map route first (this will replace current map route)
                                navController.navigate("map") {
                                    popUpTo(startDestId) {
                                        saveState = true
                                        inclusive = false
                                    }
                                    launchSingleTop = true
                                    restoreState = false
                                }
                                
                                // Then navigate to target tab
                                // Use a small delay to ensure first navigation completes
                                coroutineScope.launch {
                                    delay(50) // Small delay for navigation to process
                                    navController.navigate(item.route) {
                                        popUpTo(startDestId) {
                                            saveState = true
                                            inclusive = false
                                        }
                                        launchSingleTop = true
                                        restoreState = false
                                    }
                                }
                            } else if (item.route == "map" && baseCurrentRoute != "map") {
                                // Special case: Navigating back to map from another tab
                                // Always navigate to clean "map" route, clearing any nested screens
                                android.util.Log.d("MainScreen", 
                                    "Navigating back to map from $baseCurrentRoute")
                                
                                // Navigate to clean map route, clearing nested screens
                                navController.navigate("map") {
                                    // Pop up to start destination to clear nested screens
                                    // This will also clear any map routes with query params that are nested
                                    popUpTo(startDestId) {
                                        saveState = true
                                        inclusive = false
                                    }
                                    launchSingleTop = true
                                    restoreState = false
                                }
                            } else {
                                // Standard navigation - no query params or navigating from different tab
                                navController.navigate(item.route) {
                                    // Pop up to start destination to clear any nested screens
                                    popUpTo(startDestId) {
                                        saveState = true
                                        inclusive = false
                                    }
                                    // Prevent duplicate destinations
                                    launchSingleTop = true
                                    // Don't restore state - we want fresh navigation
                                    restoreState = false
                                }
                            }
                            
                            android.util.Log.d("MainScreen", "Navigation command issued to ${item.route}")
                        } else {
                            android.util.Log.d("MainScreen", "Already on ${item.route}, skipping navigation")
                        }
                    },
                )
            }  // Close forEach
            }  // Close NavigationBar
        }  // Close if (!isNavigating)
    }  // Close Box
}

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
)

