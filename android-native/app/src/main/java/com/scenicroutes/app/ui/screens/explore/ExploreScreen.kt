package com.scenicroutes.app.ui.screens.explore

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.ui.screens.social.SocialFeedScreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    navController: NavController,
    initialTab: Int = 0,
) {
    var selectedTab by rememberSaveable(key = "explore_selected_tab") { mutableStateOf(initialTab) }
    var showCurvedRoadsDialog by remember { mutableStateOf(false) }
    
    // Reset dialog state when screen is first composed (prevents dialog from blocking navigation)
    LaunchedEffect(Unit) {
        showCurvedRoadsDialog = false
    }
    
    // Update selected tab when initialTab changes (e.g., when navigating back)
    LaunchedEffect(initialTab) {
        selectedTab = initialTab
    }
    
    val tabs = listOf("Discover", "Collections", "Roads", "Leaderboard", "Feed", "Social")
    
    Scaffold(
        topBar = {
            Column(
                modifier = Modifier.padding(top = 8.dp), // Add top padding to prevent cut-off
            ) {
                // Title
                TopAppBar(
                    title = {
                        Text(
                            text = "Discover",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                    },
                )
                
                // Subtitle with proper spacing
                Text(
                    text = "Explore community roads, collections, and more",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .padding(top = 8.dp)
                        .padding(bottom = 16.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                
                // Tabs with proper spacing
                Column {
                    ScrollableTabRow(
                        selectedTabIndex = selectedTab,
                        edgePadding = 8.dp,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        tabs.forEachIndexed { index, title ->
                            Tab(
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                                modifier = Modifier.padding(horizontal = 8.dp),
                            ) {
                                Text(
                                    text = title,
                                    style = MaterialTheme.typography.bodySmall,
                                    maxLines = 1,
                                    modifier = Modifier.padding(vertical = 12.dp),
                                )
                            }
                        }
                    }
                    // Add spacing below tabs to make indicator more visible
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        },
    ) { padding ->
        when (selectedTab) {
            0 -> DiscoverTabContent(
                navController = navController,
                onShowCurvedRoadsDialog = { showCurvedRoadsDialog = true },
                modifier = Modifier.padding(padding),
            )
            1 -> CollectionsTabContent(navController, modifier = Modifier.padding(padding))
            2 -> RoadsTabContent(navController, modifier = Modifier.padding(padding))
            3 -> LeaderboardTabContent(navController, modifier = Modifier.padding(padding))
            4 -> SocialFeedScreen(
                navController = navController,
                showTopBar = false,
                modifier = Modifier.padding(padding),
            ) // Feed tab
            5 -> SocialFeedScreen(
                navController = navController,
                showTopBar = false,
                modifier = Modifier.padding(padding),
            ) // Social tab (same content for now)
            else -> DiscoverTabContent(
                navController = navController,
                onShowCurvedRoadsDialog = { showCurvedRoadsDialog = true },
                modifier = Modifier.padding(padding),
            )
        }
        
        // Curved Roads Search Dialog
        if (showCurvedRoadsDialog) {
            AlertDialog(
                onDismissRequest = { showCurvedRoadsDialog = false },
                title = { Text("Find Curved Roads") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Drop a marker on the map to search for curved roads.")
                        Text(
                            "Adjust filters to find roads with specific curvature levels.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                confirmButton = {
                    Button(onClick = {
                        showCurvedRoadsDialog = false
                        navController.navigate("map") {
                            // Pop back to map if already there, avoid building up stack
                            popUpTo("map") { inclusive = false }
                            launchSingleTop = true
                        }
                    }) {
                        Text("Open Map")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showCurvedRoadsDialog = false }) {
                        Text("Cancel")
                    }
                },
            )
        }
    }
}

@Composable
fun DiscoverTabContent(
    navController: NavController,
    onShowCurvedRoadsDialog: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Find Curved Roads Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            onClick = {
                onShowCurvedRoadsDialog()
            },
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.Route,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Find Curved Roads",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Discover the most scenic and winding routes",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        
        // Search Community Roads Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            onClick = {
                navController.navigate("map?openCommunityRoads=true")
            },
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.People,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Search Community Roads",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Explore roads shared by other riders",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        // Find Users Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            onClick = {
                navController.navigate("user_search")
            },
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Find Users",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Search riders by name or username",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

// CollectionsTabContent is now in a separate file: CollectionsTabContent.kt

// LeaderboardTabContent is now in a separate file: LeaderboardTabContent.kt
