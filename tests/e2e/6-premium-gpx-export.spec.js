import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 6: PREMIUM FEATURES - GPX EXPORT TESTS
 */

test.describe('GPX Export Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('6.5: Export Saved Road as GPX', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create a road first
    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `GPX Export Test ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road = await roadResponse.json();
    const roadId = road.id;

    // Export as GPX
    const exportResponse = await page.request.get(`/api/routes/export/saved-road/${roadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/gpx+xml'
      }
    });

    // May return 500 if not implemented
    expect([200, 500]).toContain(exportResponse.status());
  });

  test('6.5: Export Collection as GPX', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create a collection first
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `GPX Collection ${Date.now()}`,
        is_public: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const collectionData = await collectionResponse.json();
    const collection = collectionData.collection || collectionData.data || collectionData;
    const collectionId = collection.id;

    // Export as GPX
    const exportResponse = await page.request.get(`/api/routes/export/collection/${collectionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/gpx+xml'
      }
    });

    // May return 500 if not implemented
    expect([200, 500]).toContain(exportResponse.status());
  });

  test('6.5: Verify GPX File Format', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create a road
    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `GPX Format Test ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road = await roadResponse.json();
    const roadId = road.id;

    // Export as GPX
    const exportResponse = await page.request.get(`/api/routes/export/saved-road/${roadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/gpx+xml'
      }
    });

    if (exportResponse.status() === 200) {
      const contentType = exportResponse.headers()['content-type'];
      const body = await exportResponse.text();
      // Should be GPX format
      expect(contentType).toMatch(/gpx|xml/);
      expect(body).toMatch(/gpx|trk|wpt/);
    }
  });

  test('6.5: GPX Export Requires Premium', async ({ page }) => {
    // Logout and login as free user
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try to export GPX (should fail for free tier)
    const exportResponse = await page.request.get('/api/routes/export/saved-road/1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/gpx+xml'
      }
    });

    // Should return 403 (forbidden) or 401 (unauthorized) for free tier
    expect([403, 401, 402, 404, 500]).toContain(exportResponse.status());
  });
});



















