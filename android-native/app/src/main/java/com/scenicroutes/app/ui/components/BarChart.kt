package com.scenicroutes.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlin.math.max

@Composable
fun BarChart(
    data: Map<String, Int>,
    modifier: Modifier = Modifier,
    colors: List<Color> = listOf(
        Color(0xFF3B82F6), // Blue
        Color(0xFF10B981), // Green
        Color(0xFFF59E0B), // Orange
        Color(0xFFEF4444), // Red
        Color(0xFF8B5CF6), // Purple
    ),
) {
    if (data.isEmpty()) {
        return
    }

    val maxValue = data.values.maxOrNull() ?: 1
    val entries = data.entries.toList()

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(
                text = "Routes by Type",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )

            entries.forEachIndexed { index, entry ->
                val percentage = if (maxValue > 0) (entry.value.toFloat() / maxValue) * 100f else 0f
                val color = colors[index % colors.size]

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = entry.key.replace("_", " ").split(" ").joinToString(" ") { 
                                it.replaceFirstChar { char -> char.uppercaseChar() }
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = "${entry.value}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                text = "(${percentage.toInt()}%)",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }

                    // Progress bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp),
                    ) {
                        val surfaceVariantColor = MaterialTheme.colorScheme.surfaceVariant
                        Canvas(
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            val barWidth = size.width
                            val barHeight = size.height
                            
                            // Background
                            drawRoundRect(
                                color = surfaceVariantColor,
                                topLeft = Offset(0f, 0f),
                                size = Size(barWidth, barHeight),
                                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f),
                            )
                            
                            // Progress
                            val progressWidth = barWidth * (entry.value.toFloat() / maxValue)
                            drawRoundRect(
                                color = color,
                                topLeft = Offset(0f, 0f),
                                size = Size(progressWidth, barHeight),
                                cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f),
                            )
                        }
                    }
                }
            }
        }
    }
}









