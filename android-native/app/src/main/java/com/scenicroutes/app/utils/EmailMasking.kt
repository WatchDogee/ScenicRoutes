package com.scenicroutes.app.utils

fun maskEmail(email: String): String {
    val trimmed = email.trim()
    val atIndex = trimmed.indexOf('@')
    if (atIndex <= 0 || atIndex == trimmed.length - 1) {
        return "Hidden"
    }

    val local = trimmed.substring(0, atIndex)
    val domain = trimmed.substring(atIndex + 1)
    val maskedLocal = buildString {
        append(local.first())
        val maskLength = (local.length - 1).coerceAtLeast(1)
        repeat(maskLength) { append('*') }
    }

    return "$maskedLocal@$domain"
}
