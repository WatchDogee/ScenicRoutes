
package com.scenicroutes.app.ui.screens.subscription

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.scenicroutes.app.MainActivity
import com.scenicroutes.app.data.billing.BillingManager
import com.scenicroutes.app.ui.viewmodel.SubscriptionViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(navController: NavController) {
    val subscriptionViewModel: SubscriptionViewModel = viewModel()
    val context = LocalContext.current
    val activity = context as? androidx.activity.ComponentActivity
    val scope = rememberCoroutineScope()
    var isPurchasing by remember { mutableStateOf(false) }
    
    val plans by subscriptionViewModel.plans.collectAsState()
    val currentSubscription by subscriptionViewModel.currentSubscription.collectAsState()
    val isLoading by subscriptionViewModel.isLoading.collectAsState()
    val errorMessage by subscriptionViewModel.errorMessage.collectAsState()
    val canStartPremiumTrial by subscriptionViewModel.canStartPremiumTrial.collectAsState()
    val premiumTrialDays by subscriptionViewModel.premiumTrialDays.collectAsState()
    
    val mainActivity = activity as? MainActivity
    val billingManager = remember(mainActivity) { mainActivity?.let { MainActivity.getBillingManager(it) } }
    val billingReady = billingManager?.isReady?.collectAsState()?.value ?: false
    val billingProducts = billingManager?.subscriptionProducts?.collectAsState()?.value ?: emptyList()

    // Purchase helper - Launch billing directly
    fun launchPurchase(planId: String, billingCycle: String) {
        android.util.Log.d("SubscriptionScreen", "launchPurchase called with planId=$planId, billingCycle=$billingCycle")

        if (mainActivity == null || billingManager == null) {
            subscriptionViewModel.setErrorMessage("Billing unavailable. Please restart the app.")
            return
        }

        if (isPurchasing) return
        isPurchasing = true

        scope.launch {
            try {
                if (!billingReady) {
                    subscriptionViewModel.setErrorMessage("Billing not ready yet. Please try again in a moment.")
                    return@launch
                }

                if (billingProducts.isEmpty()) {
                    billingManager.refreshSubscriptionProducts()
                }

                val productId = if (planId == "premium") {
                    BillingManager.PRODUCT_PREMIUM
                } else {
                    BillingManager.PRODUCT_PRO
                }

                val basePlanId = when {
                    planId == "premium" && billingCycle == "monthly" -> BillingManager.PREMIUM_BASE_PLAN_MONTHLY
                    planId == "premium" && billingCycle == "yearly" -> BillingManager.PREMIUM_BASE_PLAN_YEARLY
                    planId == "pro" && billingCycle == "monthly" -> BillingManager.PRO_BASE_PLAN_MONTHLY
                    planId == "pro" && billingCycle == "yearly" -> BillingManager.PRO_BASE_PLAN_YEARLY
                    else -> BillingManager.PREMIUM_BASE_PLAN_MONTHLY
                }

                val productDetails = billingManager.subscriptionProducts.value
                    .firstOrNull { it.productId == productId }

                if (productDetails == null) {
                    subscriptionViewModel.setErrorMessage(
                        "Subscription products not found. Install the app from Google Play (internal testing) " +
                            "and ensure products are published in Play Console."
                    )
                    return@launch
                }

                val offerToken = billingManager.getOfferToken(productDetails, basePlanId)
                if (offerToken == null) {
                    subscriptionViewModel.setErrorMessage("Offer not available for this plan.")
                    return@launch
                }

                billingManager.launchPurchaseFlow(mainActivity, productDetails, offerToken, basePlanId)
            } finally {
                isPurchasing = false
            }
        }
    }

    fun launchPremiumTrial() {
        android.util.Log.d("SubscriptionScreen", "launchPremiumTrial called")

        if (mainActivity == null || billingManager == null) {
            subscriptionViewModel.setErrorMessage("Billing unavailable. Please restart the app.")
            return
        }

        if (isPurchasing) return
        isPurchasing = true

        scope.launch {
            try {
                if (!billingReady) {
                    subscriptionViewModel.setErrorMessage("Billing not ready yet. Please try again in a moment.")
                    return@launch
                }

                if (billingProducts.isEmpty()) {
                    billingManager.refreshSubscriptionProducts()
                }

                val productDetails = billingManager.subscriptionProducts.value
                    .firstOrNull { it.productId == BillingManager.PRODUCT_PREMIUM }

                if (productDetails == null) {
                    subscriptionViewModel.setErrorMessage(
                        "Subscription products not found. Install the app from Google Play (internal testing) " +
                            "and ensure products are published in Play Console."
                    )
                    return@launch
                }

                val offerToken = billingManager.getOfferToken(
                    productDetails,
                    BillingManager.PREMIUM_BASE_PLAN_MONTHLY,
                    requireTrial = true,
                )
                if (offerToken == null) {
                    subscriptionViewModel.setErrorMessage("Trial offer not available for this plan.")
                    return@launch
                }

                billingManager.launchPurchaseFlow(
                    mainActivity,
                    productDetails,
                    offerToken,
                    BillingManager.PREMIUM_BASE_PLAN_MONTHLY,
                )
            } finally {
                isPurchasing = false
            }
        }
    }
    
    // Load data on first composition
    LaunchedEffect(Unit) {
        subscriptionViewModel.loadData()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Subscription Plans") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (isLoading && plans.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Error/Success message
                errorMessage?.let { message ->
                    item {
                        val isError = message.contains("error", ignoreCase = true) || 
                                     message.contains("failed", ignoreCase = true) ||
                                     message.contains("cancel", ignoreCase = true)
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isError) 
                                    MaterialTheme.colorScheme.errorContainer 
                                else 
                                    MaterialTheme.colorScheme.primaryContainer
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = message,
                                    color = if (isError) 
                                        MaterialTheme.colorScheme.onErrorContainer 
                                    else 
                                        MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.weight(1f),
                                )
                                IconButton(onClick = { subscriptionViewModel.clearError() }) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Dismiss",
                                        tint = if (isError) 
                                            MaterialTheme.colorScheme.onErrorContainer 
                                        else 
                                            MaterialTheme.colorScheme.onPrimaryContainer,
                                    )
                                }
                            }
                        }
                    }
                }
                
                // Plans grid
                if (plans.isNotEmpty()) {
                    // Current plan status
                    currentSubscription?.let { subscription ->
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                                ),
                                border = androidx.compose.foundation.BorderStroke(
                                    2.dp,
                                    MaterialTheme.colorScheme.primary,
                                ),
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            text = "Current Plan: ${subscription.plan?.replaceFirstChar { it.uppercaseChar() } ?: "Free"}",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        val isFreePlan = subscription.plan == null || subscription.plan == "free"
                                        val isTrialing = subscription.status == "trialing" || subscription.trial_ends_at != null
                                        val isCancelled = !isFreePlan && !isTrialing && subscription.status != "active"
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = when {
                                                isTrialing -> MaterialTheme.colorScheme.tertiary
                                                isCancelled -> MaterialTheme.colorScheme.errorContainer
                                                else -> MaterialTheme.colorScheme.primary
                                            },
                                        ) {
                                            Text(
                                                text = when {
                                                    isFreePlan -> "Free"
                                                    isTrialing -> "Trial"
                                                    subscription.status == "active" -> "Active"
                                                    else -> "Cancelled"
                                                },
                                                style = MaterialTheme.typography.labelSmall,
                                                fontWeight = FontWeight.SemiBold,
                                                color = when {
                                                    isTrialing -> MaterialTheme.colorScheme.onTertiary
                                                    isCancelled -> MaterialTheme.colorScheme.onErrorContainer
                                                    else -> MaterialTheme.colorScheme.onPrimary
                                                },
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Free tier features summary
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            ),
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Text(
                                    text = "Free Tier Includes",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                )
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf(
                                        "Route planning (straightest, balanced, curvy)",
                                        "Round trips up to 300km",
                                        "Save roads and routes",
                                        "View public roads",
                                        "Basic road search"
                                    ).forEach { feature ->
                                        Row(
                                            verticalAlignment = Alignment.Top,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Icon(
                                                Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(18.dp),
                                            )
                                            Text(
                                                text = feature,
                                                style = MaterialTheme.typography.bodySmall,
                                                modifier = Modifier.weight(1f),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    item {
                        Text(
                            text = "Upgrade Plans",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 8.dp, bottom = 8.dp),
                        )
                    }
                    
                    items(plans.filter { it.id != "free" }) { plan ->
                        PlanCard(
                            plan = plan,
                            currentSubscription = currentSubscription,
                            isLoading = isLoading,
                            isPurchasing = isPurchasing,
                            launchPurchase = ::launchPurchase,
                            canStartPremiumTrial = canStartPremiumTrial,
                            premiumTrialDays = premiumTrialDays,
                            onStartPremiumTrial = ::launchPremiumTrial,
                            onCancel = {
                                subscriptionViewModel.cancelSubscription()
                            },
                            onResume = {
                                subscriptionViewModel.resumeSubscription()
                            },
                        )
                    }
                } else if (!isLoading) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            ),
                        ) {
                            Text(
                                text = "No subscription plans available",
                                modifier = Modifier.padding(16.dp),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PlanCard(
    plan: com.scenicroutes.app.data.model.SubscriptionPlan,
    currentSubscription: com.scenicroutes.app.data.model.Subscription?,
    isLoading: Boolean,
    isPurchasing: Boolean,
    launchPurchase: (String, String) -> Unit,
    canStartPremiumTrial: Boolean,
    premiumTrialDays: Int,
    onStartPremiumTrial: () -> Unit,
    onCancel: () -> Unit,
    onResume: () -> Unit,
) {
    val currentTier = currentSubscription?.plan ?: "free"
    val isCurrentPlan = currentTier == plan.id
    val isTrialing = currentSubscription?.status == "trialing" || currentSubscription?.trial_ends_at != null
    val isCancelled = !isTrialing && currentSubscription?.plan != "free" && (
        currentSubscription?.status == "cancelled" ||
        currentSubscription?.cancel_at_period_end == true
    )
    val currentBillingCycle = currentSubscription?.billing_cycle ?: "monthly"
    
    val isUpgrade = when {
        plan.id == "premium" && currentTier == "free" -> true
        plan.id == "pro" && (currentTier == "free" || currentTier == "premium") -> true
        else -> false
    }
    
    val canShowUpgradeButtons = !isCurrentPlan && 
                                (isUpgrade || (currentTier == "free" && plan.id != "free")) && 
                                plan.id != "free"
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isCurrentPlan) 
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else 
                MaterialTheme.colorScheme.surface,
        ),
        border = if (isCurrentPlan) {
            androidx.compose.foundation.BorderStroke(
                2.dp,
                MaterialTheme.colorScheme.primary,
            )
        } else null,
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isCurrentPlan) 4.dp else 2.dp,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Plan header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = plan.name,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                if (isCurrentPlan) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primary,
                    ) {
                        Text(
                            text = "Current Plan",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
            }
            
            // Pricing - Make prices prominent and easy to see
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = "$${String.format("%.2f", plan.price_monthly)}",
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            text = "/month",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 4.dp),
                        )
                    }
                    if (plan.price_yearly > 0) {
                        val monthlySavings = (plan.price_monthly * 12 - plan.price_yearly)
                        val savingsPercent = ((monthlySavings / (plan.price_monthly * 12)) * 100).toInt()
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = "or $${String.format("%.2f", plan.price_yearly)}/year",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = MaterialTheme.colorScheme.tertiary,
                            ) {
                                Text(
                                    text = "Save $savingsPercent%",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onTertiary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                )
                            }
                        }
                    }
                }
            }
            
            // Features list - all features are premium (no color differentiation needed)
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                plan.features.forEach { feature ->
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp),
                        )
                        Text(
                            text = feature,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
            
            // Action buttons
            if (isCurrentPlan) {
                // Current plan actions
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = "Status",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = when {
                                        isTrialing -> MaterialTheme.colorScheme.tertiary
                                        isCancelled -> MaterialTheme.colorScheme.errorContainer
                                        else -> MaterialTheme.colorScheme.primary
                                    },
                                ) {
                                    Text(
                                        text = when {
                                            isTrialing -> "Trial"
                                            isCancelled -> "Cancelled"
                                            else -> "Active"
                                        },
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = when {
                                            isTrialing -> MaterialTheme.colorScheme.onTertiary
                                            isCancelled -> MaterialTheme.colorScheme.onErrorContainer
                                            else -> MaterialTheme.colorScheme.onPrimary
                                        },
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    )
                                }
                            }
                            
                            if (currentSubscription?.billing_cycle != null) {
                                Text(
                                    text = "Billing: ${currentSubscription.billing_cycle.replaceFirstChar { it.uppercaseChar() }}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                            }
                            
                            val dateLabel = if (isTrialing) "Trial ends" else "Renews"
                            val dateValue = currentSubscription?.trial_ends_at ?: currentSubscription?.ends_at
                            dateValue?.let { endDate ->
                                val formattedDate = remember(endDate) {
                                    try {
                                        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                                        val date = dateFormat.parse(endDate)
                                        if (date != null) {
                                            val displayFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                                            displayFormat.format(date)
                                        } else {
                                            endDate
                                        }
                                    } catch (e: Exception) {
                                        endDate
                                    }
                                }
                                Text(
                                    text = "$dateLabel: $formattedDate",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                            }
                            
                            if (plan.id != "free") {
                                if (isCancelled) {
                                    Text(
                                        text = "Subscription will end at period end",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(top = 8.dp),
                                    )
                                    Button(
                                        onClick = onResume,
                                        enabled = !isLoading,
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = MaterialTheme.colorScheme.primary,
                                        ),
                                    ) {
                                        Text("Resume Subscription")
                                    }
                                } else if (isTrialing) {
                                    Text(
                                        text = "You are on a free trial",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.padding(top = 8.dp),
                                    )
                                    Button(
                                        onClick = onCancel,
                                        enabled = !isLoading,
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = MaterialTheme.colorScheme.error,
                                        ),
                                    ) {
                                        Text("Cancel Trial")
                                    }
                                } else {
                                    Button(
                                        onClick = onCancel,
                                        enabled = !isLoading,
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = MaterialTheme.colorScheme.error,
                                        ),
                                    ) {
                                        Text("Cancel Subscription")
                                    }
                                }
                            }
                        }
                    }
                    
                    // Change billing cycle buttons
                    if (currentBillingCycle == "monthly" && plan.price_yearly > 0) {
                        Button(
                            onClick = {
                                launchPurchase(plan.id, "yearly")
                            },
                            enabled = !isLoading && !isPurchasing,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.tertiary,
                            ),
                        ) {
                            Text("Change to Yearly (Save 31-38%)")
                        }
                    }
                    if (currentBillingCycle == "yearly") {
                        Button(
                            onClick = {
                                launchPurchase(plan.id, "monthly")
                            },
                            enabled = !isLoading && !isPurchasing,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                            ),
                        ) {
                            Text("Change to Monthly")
                        }
                    }
                }
            } else if (canShowUpgradeButtons) {
                // Upgrade buttons
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (plan.id == "premium" && canStartPremiumTrial && currentTier == "free") {
                        Button(
                            onClick = onStartPremiumTrial,
                            enabled = !isLoading && !isPurchasing,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.tertiary,
                            ),
                        ) {
                            Text("Start $premiumTrialDays-day trial")
                        }
                    }
                    Button(
                        onClick = {
                            launchPurchase(plan.id, "monthly")
                        },
                        enabled = !isLoading && !isPurchasing,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                        ),
                    ) {
                        Text(if (isUpgrade) "Upgrade Monthly" else "Subscribe Monthly")
                    }
                    if (plan.price_yearly > 0) {
                        Button(
                            onClick = {
                                launchPurchase(plan.id, "yearly")
                            },
                            enabled = !isLoading && !isPurchasing,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.tertiary,
                            ),
                        ) {
                            Text(if (isUpgrade) "Upgrade Yearly (Save 31-38%)" else "Subscribe Yearly (Save 31-38%)")
                        }
                    }
                }
            }
        }
    }
}
