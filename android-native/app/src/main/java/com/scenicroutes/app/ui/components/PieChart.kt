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
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun PieChart(
    data: Map<String, Int>,
    modifier: Modifier = Modifier,
    colors: List<Color> = listOf(
        Color(0xFF10B981), // Green
        Color(0xFF3B82F6), // Blue
        Color(0xFFF59E0B), // Orange
        Color(0xFFEF4444), // Red
    ),
) {
    if (data.isEmpty()) {
        return
    }

    val total = data.values.sum()
    if (total == 0) {
        return
    }

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
                text = "Routes by Curvature",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Pie chart visualization
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .weight(1f),
                    contentAlignment = Alignment.Center,
                ) {
                    Canvas(
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        val size = this.size.minDimension
                        val center = Offset(size / 2, size / 2)
                        val radius = size / 2 - 8.dp.toPx()

                        var startAngle = -90f // Start from top

                        entries.forEachIndexed { index, entry ->
                            val value = entry.value
                            val percentage = (value.toFloat() / total) * 100f
                            val sweepAngle = (value.toFloat() / total) * 360f
                            val color = colors[index % colors.size]

                            // Draw arc
                            drawArc(
                                color = color,
                                startAngle = startAngle,
                                sweepAngle = sweepAngle,
                                useCenter = true,
                                topLeft = Offset(
                                    center.x - radius,
                                    center.y - radius,
                                ),
                                size = Size(radius * 2, radius * 2),
                            )

                            startAngle += sweepAngle
                        }
                    }
                }

                // Legend
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    entries.forEachIndexed { index, entry ->
                        val value = entry.value
                        val percentage = (value.toFloat() / total) * 100f
                        val color = colors[index % colors.size]

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(16.dp),
                            ) {
                                Canvas(
                                    modifier = Modifier.fillMaxSize(),
                                ) {
                                    drawRect(color = color)
                                }
                            }
                            Column(
                                modifier = Modifier.weight(1f),
                            ) {
                                Text(
                                    text = entry.key.replace("_", " ").split(" ").joinToString(" ") { 
                                        it.replaceFirstChar { char -> char.uppercaseChar() }
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(
                                        text = "$value",
                                        style = MaterialTheme.typography.bodySmall,
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
                        }
                    }
                }
            }
        }
    }
}









