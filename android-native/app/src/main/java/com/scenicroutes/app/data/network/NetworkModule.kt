package com.scenicroutes.app.data.network

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.scenicroutes.app.BuildConfig
import com.scenicroutes.app.data.api.ApiService
import com.scenicroutes.app.data.model.SavedRoad
import okhttp3.OkHttpClient
import okhttp3.Interceptor
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
    // Base URL is provided via BuildConfig for flexibility
    // Override with Gradle property API_BASE_URL or env var API_BASE_URL
    private val baseUrl: String = BuildConfig.API_BASE_URL

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val defaultHeadersInterceptor = Interceptor { chain ->
        val original = chain.request()
        val request = original.newBuilder()
            .header("Accept", "application/json")
            .header("X-Requested-With", "XMLHttpRequest")
            .build()
        chain.proceed(request)
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(defaultHeadersInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    // Create Gson with lenient mode to handle malformed JSON from API
    private val gson: Gson = GsonBuilder()
        .setLenient()
        .registerTypeAdapter(SavedRoad::class.java, com.scenicroutes.app.data.model.SavedRoadTypeAdapter())
        .registerTypeAdapter(com.scenicroutes.app.data.model.RouteApiResponse::class.java, com.scenicroutes.app.data.model.RouteApiResponseTypeAdapter())
        .create()

    private val retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
