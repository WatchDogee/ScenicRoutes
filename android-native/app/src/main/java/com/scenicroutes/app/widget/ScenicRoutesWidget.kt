package com.scenicroutes.app.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.scenicroutes.app.MainActivity
import com.scenicroutes.app.R

/**
 * App Widget for Scenic Routes
 * Displays quick access to saved roads and recent routes
 *
 * Note: This is a foundation. Full implementation requires:
 * - Widget layout XML files
 * - Widget configuration activity
 * - RemoteViewsService for list widgets
 */
class ScenicRoutesWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        // Update all widgets
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Enter relevant functionality for when the first widget is created
    }

    override fun onDisabled(context: Context) {
        // Enter relevant functionality for when the last widget is disabled
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            // Create RemoteViews
            // Note: Lint warning about RemoteViewLayout is expected - widget layouts have limitations
            @Suppress("RemoteViewLayout")
            val views = RemoteViews(context.packageName, R.layout.widget_scenic_routes)

            // Set click intent to open app (main container)
            val mainIntent = Intent(context, MainActivity::class.java)
            val mainPendingIntent = android.app.PendingIntent.getActivity(
                context,
                0,
                mainIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_container, mainPendingIntent)

            // Set click intents for quick action buttons
            val mapIntent = Intent(context, MainActivity::class.java).apply {
                putExtra("destination", "map")
            }
            val mapPendingIntent = android.app.PendingIntent.getActivity(
                context,
                1,
                mapIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_btn_map, mapPendingIntent)

            val routesIntent = Intent(context, MainActivity::class.java).apply {
                putExtra("destination", "trips")
            }
            val routesPendingIntent = android.app.PendingIntent.getActivity(
                context,
                2,
                routesIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_btn_routes, routesPendingIntent)

            val exploreIntent = Intent(context, MainActivity::class.java).apply {
                putExtra("destination", "explore")
            }
            val explorePendingIntent = android.app.PendingIntent.getActivity(
                context,
                3,
                exploreIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_btn_explore, explorePendingIntent)

            // Update widget text (placeholder - would load actual data from DataStore/API)
            views.setTextViewText(R.id.widget_title, "Scenic Routes")
            views.setTextViewText(R.id.widget_subtitle, "Tap to open")

            // Instruct the widget manager to update the widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
