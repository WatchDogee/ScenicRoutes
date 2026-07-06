# Android Subscription Implementation Guide

**Last Updated:** 2025-01-XX  
**Status:** Implementation Guide

---

## 📋 OVERVIEW

This guide provides step-by-step instructions for implementing subscription management in the Android app, including UI components, API integration, and payment flow.

---

## 🎯 IMPLEMENTATION STEPS

### **Step 1: Create Subscription Screen**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/subscription/SubscriptionScreen.kt`

```kotlin
package com.scenicroutes.app.ui.screens.subscription

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.scenicroutes.app.data.model.SubscriptionPlan
import com.scenicroutes.app.ui.viewmodel.SubscriptionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(navController: NavController) {
    val viewModel: SubscriptionViewModel = viewModel()
    val plans by viewModel.plans.collectAsState()
    val currentSubscription by viewModel.currentSubscription.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Subscription") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Current Subscription Card
                currentSubscription?.let { subscription ->
                    item {
                        CurrentSubscriptionCard(
                            subscription = subscription,
                            onCancel = { viewModel.cancelSubscription() },
                            onResume = { viewModel.resumeSubscription() }
                        )
                    }
                }
                
                // Plans List
                items(plans) { plan ->
                    PlanCard(
                        plan = plan,
                        isCurrentPlan = currentSubscription?.plan == plan.id,
                        onSubscribe = { billingCycle ->
                            viewModel.createCheckout(plan.id, billingCycle)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun CurrentSubscriptionCard(
    subscription: com.scenicroutes.app.data.model.Subscription,
    onCancel: () -> Unit,
    onResume: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Current Subscription",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text("Plan: ${subscription.plan?.uppercase() ?: "Free"}")
            Text("Status: ${subscription.status?.uppercase() ?: "Active"}")
            subscription.current_period_end?.let {
                Text("Renews: $it")
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (subscription.cancel_at_period_end) {
                Button(onClick = onResume) {
                    Text("Resume Subscription")
                }
            } else {
                OutlinedButton(onClick = onCancel) {
                    Text("Cancel Subscription")
                }
            }
        }
    }
}

@Composable
fun PlanCard(
    plan: SubscriptionPlan,
    isCurrentPlan: Boolean,
    onSubscribe: (String) -> Unit
) {
    var showBillingCycleDialog by remember { mutableStateOf(false) }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isCurrentPlan) 8.dp else 4.dp
        ),
        colors = CardDefaults.cardColors(
            containerColor = if (isCurrentPlan) 
                MaterialTheme.colorScheme.primaryContainer 
            else 
                MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = plan.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = plan.description,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                if (isCurrentPlan) {
                    Badge {
                        Text("Current")
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Pricing
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                plan.price_monthly?.let {
                    Column {
                        Text(
                            text = "$${String.format("%.2f", it)}/mo",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text("Monthly")
                    }
                }
                plan.price_yearly?.let {
                    Column {
                        Text(
                            text = "$${String.format("%.2f", it)}/yr",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text("Yearly (Save ${String.format("%.0f", (1 - it / (plan.price_monthly ?: 0.0) / 12) * 100)}%)")
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Features
            plan.features.forEach { feature ->
                Row(
                    modifier = Modifier.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(feature)
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Subscribe Button
            if (!isCurrentPlan) {
                Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { showBillingCycleDialog = true }
                ) {
                    Text("Subscribe")
                }
            }
        }
    }
    
    // Billing Cycle Selection Dialog
    if (showBillingCycleDialog) {
        AlertDialog(
            onDismissRequest = { showBillingCycleDialog = false },
            title = { Text("Select Billing Cycle") },
            text = {
                Column {
                    plan.price_monthly?.let {
                        TextButton(
                            onClick = {
                                onSubscribe("monthly")
                                showBillingCycleDialog = false
                            }
                        ) {
                            Text("Monthly - $${String.format("%.2f", it)}/month")
                        }
                    }
                    plan.price_yearly?.let {
                        TextButton(
                            onClick = {
                                onSubscribe("yearly")
                                showBillingCycleDialog = false
                            }
                        ) {
                            Text("Yearly - $${String.format("%.2f", it)}/year")
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showBillingCycleDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
```

---

### **Step 2: Create Subscription ViewModel**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/ui/viewmodel/SubscriptionViewModel.kt`

```kotlin
package com.scenicroutes.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.scenicroutes.app.data.model.Subscription
import com.scenicroutes.app.data.model.SubscriptionPlan
import com.scenicroutes.app.data.repository.SubscriptionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SubscriptionViewModel(
    private val repository: SubscriptionRepository
) : ViewModel() {
    
    private val _plans = MutableStateFlow<List<SubscriptionPlan>>(emptyList())
    val plans: StateFlow<List<SubscriptionPlan>> = _plans.asStateFlow()
    
    private val _currentSubscription = MutableStateFlow<Subscription?>(null)
    val currentSubscription: StateFlow<Subscription?> = _currentSubscription.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    init {
        loadPlans()
        loadCurrentSubscription()
    }
    
    fun loadPlans() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val plansResponse = repository.getPlans()
                _plans.value = plansResponse.plans.values.toList()
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun loadCurrentSubscription() {
        viewModelScope.launch {
            try {
                val subscription = repository.getCurrentSubscription()
                _currentSubscription.value = subscription.subscription
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
    
    fun createCheckout(planId: String, billingCycle: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val checkout = repository.createCheckout(planId, billingCycle)
                // Open checkout URL in browser
                // You'll need to implement browser intent here
                // For now, just log the URL
                android.util.Log.d("Subscription", "Checkout URL: ${checkout.checkout_url}")
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun cancelSubscription() {
        viewModelScope.launch {
            try {
                repository.cancelSubscription()
                loadCurrentSubscription()
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
    
    fun resumeSubscription() {
        viewModelScope.launch {
            try {
                repository.resumeSubscription()
                loadCurrentSubscription()
            } catch (e: Exception) {
                _error.value = e.message
            }
        }
    }
}
```

---

### **Step 3: Add Subscription Repository Methods**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/data/repository/SubscriptionRepository.kt`

Add these methods to your existing repository:

```kotlin
suspend fun getPlans(): PlansResponse {
    return apiService.getSubscriptionPlans()
}

suspend fun getCurrentSubscription(): CurrentSubscriptionResponse {
    return apiService.getCurrentSubscription()
}

suspend fun createCheckout(plan: String, billingCycle: String): CheckoutResponse {
    return apiService.createCheckout(CheckoutRequest(plan, billingCycle))
}

suspend fun cancelSubscription(): CancelResponse {
    return apiService.cancelSubscription()
}

suspend fun resumeSubscription(): ResumeResponse {
    return apiService.resumeSubscription()
}
```

---

### **Step 4: Add API Service Methods**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/data/api/ApiService.kt`

Add these endpoints:

```kotlin
@GET("subscriptions/plans")
suspend fun getSubscriptionPlans(): PlansResponse

@GET("subscriptions/current")
suspend fun getCurrentSubscription(): CurrentSubscriptionResponse

@POST("subscriptions/checkout")
suspend fun createCheckout(@Body request: CheckoutRequest): CheckoutResponse

@POST("subscriptions/cancel")
suspend fun cancelSubscription(): CancelResponse

@POST("subscriptions/resume")
suspend fun resumeSubscription(): ResumeResponse
```

---

### **Step 5: Add Response Models**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/data/model/Subscription.kt`

Add these response models:

```kotlin
data class PlansResponse(
    val plans: Map<String, SubscriptionPlan>
)

data class CurrentSubscriptionResponse(
    val subscription: Subscription?,
    val tier: String,
    val limits: SubscriptionLimits,
    val has_active_subscription: Boolean
)

data class CheckoutResponse(
    val checkout_url: String,
    val session_id: String
)

data class CancelResponse(
    val message: String,
    val subscription: Subscription
)

data class ResumeResponse(
    val message: String,
    val subscription: Subscription
)
```

---

### **Step 6: Handle Checkout Flow**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/subscription/SubscriptionScreen.kt`

Update the `createCheckout` function to open browser:

```kotlin
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext

// In SubscriptionViewModel
fun createCheckout(planId: String, billingCycle: String, context: Context) {
    viewModelScope.launch {
        _isLoading.value = true
        try {
            val checkout = repository.createCheckout(planId, billingCycle)
            
            // Open checkout URL in browser
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkout.checkout_url))
            context.startActivity(intent)
            
            // Note: After payment, user will be redirected back to app
            // You should handle the deep link or check subscription status
        } catch (e: Exception) {
            _error.value = e.message
        } finally {
            _isLoading.value = false
        }
    }
}
```

---

### **Step 7: Add Navigation Route**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/ui/navigation/NavGraph.kt`

Add subscription route:

```kotlin
composable("subscription") {
    SubscriptionScreen(navController = navController)
}
```

---

### **Step 8: Add Subscription Menu Item**

#### **File:** `android-native/app/src/main/java/com/scenicroutes/app/ui/screens/profile/ProfileScreen.kt`

Add subscription menu item:

```kotlin
MenuItem(
    icon = Icons.Default.CreditCard,
    title = "Subscription",
    onClick = {
        navController.navigate("subscription")
    }
)
```

---

## 🔄 HANDLING PAYMENT CALLBACKS

### **Option 1: Deep Links**

1. **Add deep link to AndroidManifest.xml:**
```xml
<activity
    android:name=".MainActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="scenicroutes" android:host="subscription" />
    </intent-filter>
</activity>
```

2. **Handle deep link in MainActivity:**
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    handleDeepLink(intent)
}

private fun handleDeepLink(intent: Intent?) {
    val data = intent?.data
    if (data?.scheme == "scenicroutes" && data.host == "subscription") {
        // Check subscription status
        // Navigate to subscription screen
    }
}
```

### **Option 2: Check Subscription on App Resume**

```kotlin
override fun onResume() {
    super.onResume()
    // Check if user just completed payment
    viewModel.loadCurrentSubscription()
}
```

---

## ✅ TESTING CHECKLIST

- [ ] Subscription screen displays plans
- [ ] Current subscription shown correctly
- [ ] Checkout opens in browser
- [ ] Payment completes successfully
- [ ] Subscription status updates after payment
- [ ] Cancel subscription works
- [ ] Resume subscription works
- [ ] Error handling works
- [ ] Loading states shown

---

## 🎯 NEXT STEPS

1. Implement subscription screen UI
2. Add ViewModel and Repository methods
3. Test checkout flow
4. Handle payment callbacks
5. Test subscription management
6. Add error handling
7. Polish UI/UX

---

**Last Updated:** 2025-01-XX  
**Status:** Ready for Implementation


