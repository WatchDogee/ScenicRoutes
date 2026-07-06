import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 3: FREE TIER TESTS
 */

test.describe('Free Tier Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('3.1: Free Tier Badge & Menu', async ({ page }) => {
    // Check for free tier indicator
    const freeBadge = page.locator('text=Free, text=Free Tier').first();
    const badgeVisible = await freeBadge.isVisible().catch(() => false);
    expect(badgeVisible).toBeTruthy();
  });

  test('3.2: Route Planning (Basic)', async ({ page }) => {
    // Look for route planning button
    const planButton = page.locator('button:has-text("Plan"), button:has-text("Route")').first();
    const planVisible = await planButton.isVisible().catch(() => false);
    expect(planVisible).toBeTruthy();
  });

  test('3.3: Round Trip 300km Limit', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try to calculate a round trip > 300km
    const response = await page.request.post('/api/routes/calculate', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        round_trip: true,
        distance: 400 // > 300km
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json().catch(() => ({}));
    const responseText = JSON.stringify(responseData);

    // Should return error or warning about 300km limit
    if (response.status() === 200) {
      // Check for warning message
      expect(responseText.toLowerCase()).toMatch(/300|limit|upgrade/);
    } else {
      expect([400, 403, 422]).toContain(response.status());
    }
  });

  test('3.4: Saved Roads - Unlimited Access', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create a saved road
    const response = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Test Road ${Date.now()}`,
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
  });
});



















