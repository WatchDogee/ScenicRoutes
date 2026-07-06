package com.scenicroutes.app.data.exception

class VerificationRequiredException(
    message: String,
    val email: String,
) : Exception(message)
