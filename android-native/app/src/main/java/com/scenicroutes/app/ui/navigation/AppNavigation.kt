package com.scenicroutes.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.scenicroutes.app.ui.screens.explore.ExploreScreen
import com.scenicroutes.app.ui.screens.map.MapScreen
import com.scenicroutes.app.ui.screens.profile.ProfileScreen
import com.scenicroutes.app.ui.screens.settings.SettingsScreen
import com.scenicroutes.app.ui.screens.trips.TripsScreen
import com.scenicroutes.app.ui.screens.recording.RideRecordingScreen
import com.scenicroutes.app.ui.screens.maps.OfflineMapsScreen
import com.scenicroutes.app.ui.screens.map.RouteHistoryScreen
import kotlinx.coroutines.launch

/**
 * Main navigation component for the app
 * Sets up navigation graph with all main screens
 */
@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = "map",
        modifier = modifier,
    ) {
        // Map screen - main screen
        composable("map?openCommunityRoads={openCommunityRoads}&roadId={roadId}&startNavigation={startNavigation}&enableRoadSearch={enableRoadSearch}") { backStackEntry ->
            val openCommunityRoads = backStackEntry.arguments?.getString("openCommunityRoads") == "true"
            val roadId = backStackEntry.arguments?.getString("roadId")?.toLongOrNull()
            val startNavigation = backStackEntry.arguments?.getString("startNavigation") == "true"
            val enableRoadSearch = backStackEntry.arguments?.getString("enableRoadSearch") == "true"
            MapScreen(
                navController = navController,
                initialShowCommunityRoads = openCommunityRoads,
                initialRoadId = roadId,
                startNavigation = startNavigation,
                enableRoadSearch = enableRoadSearch,
            )
        }
        composable("map?roadId={roadId}&startNavigation={startNavigation}&enableRoadSearch={enableRoadSearch}") { backStackEntry ->
            val roadId = backStackEntry.arguments?.getString("roadId")?.toLongOrNull()
            val startNavigation = backStackEntry.arguments?.getString("startNavigation") == "true"
            val enableRoadSearch = backStackEntry.arguments?.getString("enableRoadSearch") == "true"
            MapScreen(
                navController = navController,
                initialRoadId = roadId,
                startNavigation = startNavigation,
                enableRoadSearch = enableRoadSearch,
            )
        }
        composable("map?roadId={roadId}&enableRoadSearch={enableRoadSearch}") { backStackEntry ->
            val roadId = backStackEntry.arguments?.getString("roadId")?.toLongOrNull()
            val enableRoadSearch = backStackEntry.arguments?.getString("enableRoadSearch") == "true"
            MapScreen(
                navController = navController,
                initialRoadId = roadId,
                enableRoadSearch = enableRoadSearch,
            )
        }
        composable("map?enableRoadSearch={enableRoadSearch}") { backStackEntry ->
            val enableRoadSearch = backStackEntry.arguments?.getString("enableRoadSearch") == "true"
            MapScreen(
                navController = navController,
                enableRoadSearch = enableRoadSearch,
            )
        }
        composable("map?openCommunityRoads={openCommunityRoads}") { backStackEntry ->
            val openCommunityRoads = backStackEntry.arguments?.getString("openCommunityRoads") == "true"
            MapScreen(
                navController = navController,
                initialShowCommunityRoads = openCommunityRoads,
            )
        }
        composable("map") {
            MapScreen(navController = navController)
        }

        // Explore screen
        composable("explore?tab={tab}") { backStackEntry ->
            val tab = backStackEntry.arguments?.getString("tab")
            ExploreScreen(
                navController = navController,
                initialTab = when (tab) {
                    "social" -> 5
                    "feed" -> 4
                    "collections" -> 1
                    "roads" -> 2
                    "leaderboard" -> 3
                    else -> 0
                },
            )
        }
        composable("explore") {
            ExploreScreen(navController = navController)
        }

        // Trips/Saved Roads screen
        composable("trips") {
            TripsScreen(navController = navController)
        }

        // Profile screen
        composable("profile") {
            ProfileScreen(navController = navController)
        }

        // Settings screen
        composable("settings") {
            SettingsScreen(navController = navController)
        }

        // Subscription screen
        composable("subscription") {
            com.scenicroutes.app.ui.screens.subscription.SubscriptionScreen(navController = navController)
        }

        // Payment screen for purchasing subscriptions
        composable("payment?planId={planId}&billingCycle={billingCycle}") { backStackEntry ->
            val planId = backStackEntry.arguments?.getString("planId") ?: "premium"
            val billingCycle = backStackEntry.arguments?.getString("billingCycle") ?: "monthly"
            com.scenicroutes.app.ui.screens.payment.PaymentScreen(
                navController = navController,
                planId = planId,
                billingCycle = billingCycle,
            )
        }
        composable("payment") {
            com.scenicroutes.app.ui.screens.payment.PaymentScreen(navController = navController)
        }

        // Usage Statistics screen
        composable("usage_stats") {
            com.scenicroutes.app.ui.screens.stats.UsageStatsScreen(navController = navController)
        }

        // Ride Recording screen
        composable("recording?routeId={routeId}") { backStackEntry ->
            val routeId = backStackEntry.arguments?.getString("routeId")
            android.util.Log.d("AppNavigation", "Navigating to recording screen with routeId: $routeId")
            RideRecordingScreen(
                navController = navController,
                linkedRouteId = routeId,
            )
        }
        composable("recording") {
            android.util.Log.d("AppNavigation", "Navigating to recording screen (no routeId)")
            RideRecordingScreen(navController = navController)
        }

        // Offline Maps screen
        composable(
            "offline_maps?bounds={bounds}&lat={lat}&lon={lon}&radius={radius}&name={name}",
            arguments = listOf(
                androidx.navigation.navArgument("bounds") {
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                androidx.navigation.navArgument("lat") {
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                androidx.navigation.navArgument("lon") {
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                androidx.navigation.navArgument("radius") {
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                androidx.navigation.navArgument("name") {
                    type = androidx.navigation.NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val bounds = backStackEntry.arguments?.getString("bounds")
            val lat = backStackEntry.arguments?.getString("lat")?.toDoubleOrNull()
            val lon = backStackEntry.arguments?.getString("lon")?.toDoubleOrNull()
            val radius = backStackEntry.arguments?.getString("radius")?.toDoubleOrNull()
            val name = backStackEntry.arguments?.getString("name")
            
            // If lat/lon/radius are provided, navigate to offline maps with those parameters
            OfflineMapsScreen(
                navController = navController,
                mapBounds = bounds,
                downloadLat = lat,
                downloadLon = lon,
                downloadRadius = radius,
                downloadName = name,
            )
        }
        
        // Also support the route without bounds parameter for backward compatibility
        composable("offline_maps") {
            OfflineMapsScreen(navController = navController)
        }

        // Navigation screen (turn-by-turn)
        composable("navigation") {
            android.util.Log.d("AppNavigation", "Navigating to NavigationScreen composable")
            com.scenicroutes.app.ui.screens.navigation.NavigationScreen(
                navController = navController,
                onNavigateBack = {
                    android.util.Log.d("AppNavigation", "NavigationScreen onNavigateBack called")
                    navController.popBackStack()
                },
            )
        }

        // Route History screen
        composable("route_history") {
            val context = LocalContext.current
            val activity = context as? androidx.activity.ComponentActivity
            val viewModel: com.scenicroutes.app.ui.viewmodel.MapViewModel = if (activity != null) {
                androidx.lifecycle.viewmodel.compose.viewModel(viewModelStoreOwner = activity)
            } else {
                androidx.lifecycle.viewmodel.compose.viewModel()
            }
            val coroutineScope = rememberCoroutineScope()
            
            RouteHistoryScreen(
                navController = navController,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onSelectRoute = { route ->
                    // Validate route before setting (prevent ANR with huge routes)
                    if (route.geometry.size > 100000) {
                        android.util.Log.w("AppNavigation", "Route has too many geometry points (${route.geometry.size}), skipping to prevent ANR")
                        android.widget.Toast.makeText(
                            context,
                            "Route is too large to load. Please recalculate.",
                            android.widget.Toast.LENGTH_LONG,
                        ).show()
                    } else {
                        // Set route in ViewModel asynchronously to prevent blocking UI
                        coroutineScope.launch {
                            try {
                                android.util.Log.d("AppNavigation", "Setting route from history: geometry points=${route.geometry.size}, distance=${route.distance}m")
                                viewModel.setSelectedRoute(route)
                                android.util.Log.d("AppNavigation", "Route set successfully, navigating back")
                                // Small delay to ensure state propagates
                                kotlinx.coroutines.delay(100)
                                navController.popBackStack()
                            } catch (e: Exception) {
                                android.util.Log.e("AppNavigation", "Error setting route from history: ${e.message}", e)
                                android.widget.Toast.makeText(
                                    context,
                                    "Error loading route: ${e.message}",
                                    android.widget.Toast.LENGTH_SHORT,
                                ).show()
                            }
                        }
                    }
                },
            )
        }

        // User Profile screen (for viewing other users)
        composable("user_profile/{userId}") { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId")?.toLongOrNull() ?: 0L
            android.util.Log.d("AppNavigation", "Navigating to user profile: userId=$userId")
            com.scenicroutes.app.ui.screens.social.UserProfileScreen(
                userId = userId,
                navController = navController,
                onNavigateBack = {
                    android.util.Log.d("AppNavigation", "Navigating back from user profile")
                    // Try to navigate back to explore with leaderboard tab
                    // Check if previous destination was explore
                    val previousDestination = navController.previousBackStackEntry?.destination?.route
                    android.util.Log.d("AppNavigation", "Previous destination: $previousDestination")
                    
                    if (previousDestination?.startsWith("explore") == true) {
                        // Navigate to explore with leaderboard tab
                        navController.navigate("explore?tab=leaderboard") {
                            popUpTo("explore") { inclusive = false }
                            launchSingleTop = true
                        }
                    } else {
                        // Fall back to popBackStack
                        navController.popBackStack()
                    }
                },
            )
        }

        // Following screen
        composable("following") {
            com.scenicroutes.app.ui.screens.social.FollowingScreen(navController = navController)
        }

        // Followers screen
        composable("followers") {
            com.scenicroutes.app.ui.screens.social.FollowersScreen(navController = navController)
        }

        // User Search/Discovery screen
        composable("user_search") {
            com.scenicroutes.app.ui.screens.social.UserSearchScreen(navController = navController)
        }

        // Collection Details screen
        composable("collection/{collectionId}") { backStackEntry ->
            val collectionId = backStackEntry.arguments?.getString("collectionId")?.toLongOrNull() ?: 0L
            com.scenicroutes.app.ui.screens.collections.CollectionDetailsScreen(
                collectionId = collectionId,
                navController = navController,
                onNavigateBack = { navController.popBackStack() },
            )
        }

        // My Collections management screen
        composable("my_collections") {
            com.scenicroutes.app.ui.screens.collections.CollectionManagementScreen(navController = navController)
        }

        // Road Details screen
        composable("road_details/{roadId}") { backStackEntry ->
            val roadId = backStackEntry.arguments?.getString("roadId")?.toLongOrNull() ?: 0L
            com.scenicroutes.app.ui.screens.map.RoadDetailsScreen(
                roadId = roadId,
                navController = navController,
            )
        }

        // GPX Export (handled via dialog/sheet, not separate screen)
        // This route may not be needed if handled via dialog
    }
}
