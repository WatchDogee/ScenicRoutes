package com.scenicroutes.app.data.api

import com.google.gson.Gson
import com.scenicroutes.app.utils.TestDataFactory
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Integration tests for Route Sharing API endpoints
 * Uses MockWebServer to simulate API responses
 */
class RouteSharingApiTest {
    
    private lateinit var mockWebServer: MockWebServer
    private lateinit var apiService: ApiService
    private val gson = Gson()
    
    @Before
    fun setup() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
        
        val retrofit = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/"))
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
        
        apiService = retrofit.create(ApiService::class.java)
    }
    
    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }
    
    @Test
    fun `shareRoute returns share token and URL`() = runTest {
        // Given
        val route = TestDataFactory.createRoute()
        val request = RouteShareRequest(
            route = mapOf(
                "geometry" to (route.geometry ?: emptyList()),
                "distance" to route.distance,
                "time" to route.time,
            ),
            route_name = "Test Route",
            route_description = "Test description",
        )
        
        val responseBody = """
            {
                "success": true,
                "share_token": "test_token_123",
                "share_url": "https://example.com/routes/shared/test_token_123"
            }
        """.trimIndent()
        
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(responseBody)
        )
        
        // When
        val response = apiService.shareRoute("Bearer test_token", request)
        
        // Then
        assertTrue(response.isSuccessful)
        assertNotNull(response.body())
        val body = response.body()!!
        assertTrue(body.containsKey("share_token") || body.containsKey("token"))
        assertTrue(body.containsKey("share_url") || body.containsKey("url"))
    }
    
    @Test
    fun `getShareStats returns view and share counts`() = runTest {
        // Given
        val shareToken = "test_token_123"
        val responseBody = """
            {
                "view_count": 5,
                "share_count": 2,
                "created_at": "2025-01-01T00:00:00Z",
                "expires_at": null
            }
        """.trimIndent()
        
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(responseBody)
        )
        
        // When
        val response = apiService.getShareStats("Bearer test_token", shareToken)
        
        // Then
        assertTrue(response.isSuccessful)
        assertNotNull(response.body())
        val body = response.body()!!
        assertTrue(body.containsKey("view_count"))
        assertTrue(body.containsKey("share_count"))
    }
    
    @Test
    fun `getShareStats handles unauthorized access`() = runTest {
        // Given
        val shareToken = "test_token_123"
        
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(403)
                .setBody("""{"error": "Unauthorized"}""")
        )
        
        // When
        val response = apiService.getShareStats("Bearer invalid_token", shareToken)
        
        // Then
        assertFalse(response.isSuccessful)
        assertEquals(403, response.code())
    }
    
    @Test
    fun `getShareStats handles not found`() = runTest {
        // Given
        val shareToken = "invalid_token"
        
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(404)
                .setBody("""{"error": "Share not found"}""")
        )
        
        // When
        val response = apiService.getShareStats("Bearer test_token", shareToken)
        
        // Then
        assertFalse(response.isSuccessful)
        assertEquals(404, response.code())
    }
}









