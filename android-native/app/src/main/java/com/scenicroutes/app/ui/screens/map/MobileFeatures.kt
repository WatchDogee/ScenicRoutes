package com.scenicroutes.app.ui.screens.map

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable

/**
 * Mobile-specific features placeholders
 * These features require additional implementation:
 * - GPX Import/Export: File system access, parsing GPX XML
 * - Turn-by-turn Navigation: Voice guidance, route following
 * - Ride Recording: GPS tracking, statistics
 */

@Composable
fun GPXImportPlaceholder(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("GPX Import") },
        text = { Text("GPX import feature coming soon. This will allow you to import routes from GPX files.") },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        },
    )
}

@Composable
fun GPXExportPlaceholder(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("GPX Export") },
        text = { Text("GPX export feature coming soon. This will allow you to export your routes to GPX files.") },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        },
    )
}

@Composable
fun TurnByTurnNavigationPlaceholder(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Turn-by-Turn Navigation") },
        text = { Text("Turn-by-turn navigation feature coming soon. This will provide voice-guided navigation along your route.") },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        },
    )
}

@Composable
fun RideRecordingPlaceholder(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Ride Recording") },
        text = { Text("Ride recording feature coming soon. This will track your journey and save statistics.") },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        },
    )
}

// TODO: Implement GPX import
// - Use Android FileProvider for file access
// - Parse GPX XML using XML parser
// - Extract waypoints and route geometry
// - Display route on map

// TODO: Implement GPX export
// - Generate GPX XML from route data
// - Use Android FileProvider to save file
// - Share via Android ShareSheet

// TODO: Implement turn-by-turn navigation
// - Track current position along route
// - Calculate distance to next turn
// - Use Text-to-Speech for voice guidance
// - Show navigation UI overlay

// TODO: Implement ride recording
// - Track GPS location continuously
// - Record route geometry
// - Calculate statistics (distance, time, speed)
// - Save to database
















