package com.scenicroutes.app.ui.screens.payment

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
import com.scenicroutes.app.data.local.TokenManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * Payment Screen using Google Play Billing (REQUIRED for Google Play Store compliance)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentScreen(
    navController: NavController,
    planId: String = "premium",
    billingCycle: String = "monthly",
) {
    val context = LocalContext.current
    val activity = context as? androidx.activity.ComponentActivity
    val scope = rememberCoroutineScope()
    
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var productPrice by remember { mutableStateOf<String?>(null) }
    
    // Get pricing info
    LaunchedEffect(planId, billingCycle) {
        android.util.Log.d("PaymentScreen", "Loading pricing for planId=$planId, billingCycle=$billingCycle")
        
        val prices = mapOf(
            "premium_monthly" to "$3.99",
            "premium_yearly" to "$29.99",
            "pro_monthly" to "$5.99",
            "pro_yearly" to "$49.99",
        )
        
        val key = "${planId}_$billingCycle"
        productPrice = prices[key] ?: "0.00"
        android.util.Log.d("PaymentScreen", "Price for $key: ${productPrice ?: "unknown"}")
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Purchase ${planId.replaceFirstChar { it.uppercaseChar() }}") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            item {
                Icon(
                    Icons.Default.ShoppingCart,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(64.dp)
                )
            }
            
            item {
                Text(
                    text = "${planId.replaceFirstChar { it.uppercaseChar() }} ${billingCycle.replaceFirstChar { it.uppercaseChar() }}",
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold,
                )
            }
            
            // Price display
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            text = productPrice ?: "Loading...",
                            style = MaterialTheme.typography.displayMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            text = "per ${billingCycle.replaceFirstChar { it.uppercaseChar() }}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                }
            }
            
            // Features
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = "Includes:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    
                    val features = when (planId) {
                        "premium" -> listOf(
                            "Extra curvy routes",
                            "Unlimited round trips",
                            "Section-specific curvature",
                            "GPX/KML export",
                            "Turn-by-turn navigation",
                            "Offline maps (500 MB storage, coming soon)",
                            "Ride recording",
                            "Private roads",
                        )
                        "pro" -> listOf(
                            "Everything in Premium",
                            "Unlimited offline maps storage (coming soon)",
                        )
                        else -> emptyList()
                    }
                    
                    features.forEach { feature ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
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
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }
            
            // Error message
            errorMessage?.let { error ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = error,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.weight(1f),
                                style = MaterialTheme.typography.bodySmall,
                            )
                            IconButton(onClick = { errorMessage = null }) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Dismiss",
                                    tint = MaterialTheme.colorScheme.onErrorContainer,
                                )
                            }
                        }
                    }
                }
            }
            
            // Purchase button
            item {
                Button(
                    onClick = {
                        if (activity == null) {
                            errorMessage = "Activity not available"
                            return@Button
                        }
                        
                        isLoading = true
                        scope.launch {
                            try {
                                android.util.Log.d("PaymentScreen", "Starting purchase flow for $planId/$billingCycle")
                                
                                val tokenManager = TokenManager(context)
                                val token = try {
                                    tokenManager.token.first()
                                } catch (e: Exception) {
                                    null
                                }
                                
                                if (token == null) {
                                    errorMessage = "Please log in to make a purchase"
                                    isLoading = false
                                    return@launch
                                }
                                
                                // Map planId and billingCycle to product ID and base plan
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
                                
                                android.util.Log.d("PaymentScreen", "Launching billing: productId=$productId, basePlanId=$basePlanId")
                                
                                // Get billing manager instance from MainActivity
                                val mainActivity = activity as? MainActivity
                                if (mainActivity == null) {
                                    errorMessage = "MainActivity not available"
                                    isLoading = false
                                    return@launch
                                }
                                
                                val billingManager = MainActivity.getBillingManager(mainActivity)
                                
                                // Wait for billing to be ready
                                var attempts = 0
                                while (!billingManager.isReady.value && attempts < 20) {
                                    kotlinx.coroutines.delay(50)
                                    attempts++
                                }
                                
                                android.util.Log.d("PaymentScreen", "Waited $attempts attempts, isReady=${billingManager.isReady.value}")
                                
                                if (!billingManager.isReady.value) {
                                    errorMessage = "Billing service not ready"
                                    isLoading = false
                                    return@launch
                                }
                                
                                // Get the product details
                                val products = billingManager.subscriptionProducts.value
                                val productDetails = products.find { it.productId == productId }
                                
                                if (productDetails == null) {
                                    android.util.Log.e("PaymentScreen", "Product not found: $productId")
                                    errorMessage = "Product not available"
                                    isLoading = false
                                    return@launch
                                }
                                
                                // Get the offer token for this base plan
                                val offerToken = billingManager.getOfferToken(productDetails, basePlanId)
                                
                                if (offerToken == null) {
                                    android.util.Log.e("PaymentScreen", "Offer token not found for $basePlanId")
                                    errorMessage = "Offer not available for this plan"
                                    isLoading = false
                                    return@launch
                                }
                                
                                // Launch the billing flow
                                billingManager.launchPurchaseFlow(activity, productDetails, offerToken, basePlanId)
                                
                                android.util.Log.d("PaymentScreen", "Billing flow launched successfully")
                                
                            } catch (e: Exception) {
                                android.util.Log.e("PaymentScreen", "Error launching billing: ${e.message}", e)
                                errorMessage = "Error: ${e.message}"
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                    ),
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    } else {
                        Text(
                            "Complete Purchase",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
            
            item {
                Text(
                    text = "Payment secured by Google Play Billing",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            
            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
