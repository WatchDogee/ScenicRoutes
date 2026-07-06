package com.scenicroutes.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.ExperimentalUnitApi
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.scenicroutes.app.data.service.FeatureAccessService
import kotlinx.coroutines.launch

/**
 * Composable that gates content based on subscription tier
 * Shows upgrade prompt if user doesn't have access
 */
@OptIn(ExperimentalUnitApi::class)
@Composable
fun FeatureGate(
    feature: String,
    content: @Composable () -> Unit,
    fallback: @Composable (String) -> Unit = { requiredTier ->
        UpgradePrompt(
            requiredTier = requiredTier,
            feature = feature,
        )
    },
) {
    val context = LocalContext.current
    val featureAccessService = remember { FeatureAccessService(context) }
    var hasAccess by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(feature) {
        coroutineScope.launch {
            try {
                hasAccess = featureAccessService.hasFeatureAccess(feature)
                // Cache the access result for offline use
                val prefs = context.getSharedPreferences("feature_access_cache", android.content.Context.MODE_PRIVATE)
                prefs.edit().putBoolean("has_${feature}", hasAccess).apply()
            } catch (e: Exception) {
                // If offline or error, use cached value
                val prefs = context.getSharedPreferences("feature_access_cache", android.content.Context.MODE_PRIVATE)
                hasAccess = prefs.getBoolean("has_${feature}", false)
                android.util.Log.d("FeatureGate", "Using cached access for $feature: $hasAccess")
            }
            isLoading = false
        }
    }

    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(modifier = Modifier.size(24.dp))
        }
    } else if (hasAccess) {
        content()
    } else {
        val requiredTier = featureAccessService.getRequiredTier(feature)
        fallback(requiredTier)
    }
}

/**
 * Upgrade prompt shown when user tries to access premium feature
 */
@Composable
fun UpgradePrompt(
    requiredTier: String,
    feature: String,
    onUpgrade: (() -> Unit)? = null,
    navController: NavController? = null,
) {
    val onUpgradeClick: () -> Unit = onUpgrade ?: {
        navController?.navigate("subscription") {
            launchSingleTop = true
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(
                Icons.Default.Lock,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "Premium Feature",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "This feature requires a $requiredTier subscription.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            Text(
                text = getFeatureDescription(feature),
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
            )
            Button(
                onClick = onUpgradeClick,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Upgrade to $requiredTier")
            }
        }
    }
}

/**
 * Get user-friendly description for a feature
 */
private fun getFeatureDescription(feature: String): String {
    return when (feature) {
        "extra_curvy" -> "Find the most winding and scenic routes"
        "round_trip_unlimited" -> "Create round trips of any distance"
        "route_alternatives" -> "See multiple route options to choose from"
        "offline_maps" -> "Download maps for offline use"
        "gpx_export" -> "Export routes as GPX files"
        "turn_by_turn" -> "Get voice-guided turn-by-turn navigation"
        "ride_recording" -> "Record your rides with GPS tracking"
        "private_roads" -> "Save roads as private (only you can see them)"
        "segment_curvature" -> "Control curvature for specific route segments"
        "api_access" -> "Access our API for integrations"
        "unlimited_offline_maps" -> "Download unlimited offline map regions"
        else -> "Unlock this premium feature"
    }
}

/**
 * Inline feature gate that shows upgrade prompt inline
 */
@Composable
fun InlineFeatureGate(
    feature: String,
    content: @Composable () -> Unit,
) {
    FeatureGate(
        feature = feature,
        content = content,
    )
}
