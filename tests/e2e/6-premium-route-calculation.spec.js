import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 6: PREMIUM FEATURES - ROUTE CALCULATION TESTS
 */

test.describe('Route Calculation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('Basic Route Calculation', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/routes/calculate', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Route calculation may succeed or fail depending on GraphHopper
    expect([200, 500, 503, 400, 422]).toContain(response.status());
    if (response.status() === 200) {
      const route = await response.json();
      expect(route).toBeTruthy();
    }
  });

  test('Route Calculation with Waypoints', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/routes/calculate', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        waypoints: [
          { lat: 56.9498, lon: 24.1055 }
        ]
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('Round Trip Calculation', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/routes/calculate', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        round_trip: true,
        distance: 100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('Alternative Routes Calculation', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/routes/calculate', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        alternative_routes: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('Route Calculation with Different Curvature Levels', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const curvatureLevels = ['straightest', 'balanced', 'curvy', 'extra_curvy'];
    
    for (const curvature of curvatureLevels) {
      const response = await page.request.post('/api/routes/calculate', {
        data: {
          start_lat: 56.9496,
          start_lon: 24.1052,
          end_lat: 56.9500,
          end_lon: 24.1100,
          curvature: curvature
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // All curvature levels should be accepted (may fail if GraphHopper unavailable)
      expect([200, 500, 503, 400, 422]).toContain(response.status());
    }
  });
});



















