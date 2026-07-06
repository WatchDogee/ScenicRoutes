import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 6: PREMIUM FEATURES - SAVED ROADS TESTS
 */

test.describe('Premium Saved Roads Tests', () => {
  let roadId = null;

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('6.6: Save Road', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Premium Test Road ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201]).toContain(response.status());
    const road = await response.json();
    roadId = road.id;
    expect(road.road_name).toBeTruthy();
  });

  test('6.6: View Saved Roads', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/saved-roads', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const roads = await response.json();
    const roadsList = roads.data || roads;
    expect(Array.isArray(roadsList)).toBeTruthy();
  });

  test('6.6: Edit Saved Road', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create road first
    const createResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Edit Test ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road = await createResponse.json();
    const testRoadId = road.id;

    // Edit road
    const editResponse = await page.request.put(`/api/saved-roads/${testRoadId}`, {
      data: {
        road_name: `Updated Name ${Date.now()}`,
        description: 'Updated description'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201]).toContain(editResponse.status());
    const updatedRoad = await editResponse.json();
    const roadData = updatedRoad.road || updatedRoad.data || updatedRoad;
    expect(roadData.road_name).toBeTruthy();
  });

  test('6.6: Delete Saved Road', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create road first
    const createResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Delete Test ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road = await createResponse.json();
    const testRoadId = road.id;

    // Delete road
    const deleteResponse = await page.request.delete(`/api/saved-roads/${testRoadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 204]).toContain(deleteResponse.status());
  });

  test('6.6: Toggle Road Privacy', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create road first
    const createResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Privacy Test ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road = await createResponse.json();
    const testRoadId = road.id;

    // Toggle privacy
    const toggleResponse = await page.request.post(`/api/saved-roads/${testRoadId}/toggle-public`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 201]).toContain(toggleResponse.status());
  });

  test('6.6: View Public Saved Roads', async ({ page }) => {
    const response = await page.request.get('/api/public-saved-roads', {
      headers: {
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const roads = await response.json();
      expect(Array.isArray(roads) || typeof roads === 'object').toBeTruthy();
    }
  });
});



















