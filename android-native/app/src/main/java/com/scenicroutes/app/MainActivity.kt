package com.scenicroutes.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.scenicroutes.app.data.billing.BillingManager
import com.scenicroutes.app.data.local.TokenManager
import com.scenicroutes.app.ui.screens.MainScreen
import com.scenicroutes.app.ui.theme.ScenicRoutesTheme
import com.scenicroutes.app.ui.viewmodel.SettingsViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration

class MainActivity : ComponentActivity() {
    companion object {
        private var billingManager: BillingManager? = null
        
        fun getBillingManager(activity: MainActivity): BillingManager {
            if (billingManager == null) {
                billingManager = BillingManager(activity, activity.lifecycleScope)
                billingManager?.initialize()
            }
            return billingManager!!
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize OSMDroid
        Configuration.getInstance().load(this, getSharedPreferences("osmdroid", MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = "ScenicRoutes/1.0"

        // Initialize Google Play Billing
        // This will query products and check for existing purchases
        val billingManager = getBillingManager(this)

        // Preload token in background on a separate thread
        // This ensures token is available when ProfileViewModel tries to check auth
        Thread {
            try {
                val tokenManager = TokenManager(this@MainActivity)
                // Access the token flow to trigger initial read from DataStore
                // This primes the DataStore cache so subsequent reads are instant
                tokenManager.token
            } catch (e: Exception) {
                android.util.Log.e("MainActivity", "Error preloading token: ${e.message}")
            }
        }.start()

        setContent {
            // Load theme setting - observe changes reactively
            // Use Activity-scoped ViewModel (this activity) to ensure all screens share the same instance
            val viewModel: SettingsViewModel = viewModel(viewModelStoreOwner = this@MainActivity)
            val settings by viewModel.settings.collectAsState()
            
            // Load settings on first launch only if empty
            LaunchedEffect(Unit) {
                if (settings.isEmpty()) {
                    viewModel.loadSettings()
                }
            }
            
            // Determine dark theme from settings - observe changes reactively
            val themeSetting = settings["theme"] as? String ?: "light"
            val systemDarkTheme = isSystemInDarkTheme()
            val darkTheme = when (themeSetting) {
                "dark" -> true
                "light" -> false
                "system" -> systemDarkTheme
                else -> systemDarkTheme
            }
            
            // Log theme changes for debugging
            LaunchedEffect(themeSetting, darkTheme) {
                android.util.Log.d("MainActivity", "Theme setting changed to: $themeSetting, darkTheme: $darkTheme")
            }
            
            // Theme will update automatically when darkTheme changes - no need for key()
            ScenicRoutesTheme(darkTheme = darkTheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    MainScreen()
                }
            }
        }
    }
}
