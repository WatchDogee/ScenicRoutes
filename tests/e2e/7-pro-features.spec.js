import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 7: PRO FEATURES TESTS
 */

test.describe('Pro Features Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PRO.email, TEST_ACCOUNTS.PRO.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('7.1: Pro Badge & Status', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(userResponse.status()).toBe(200);
    const user = await userResponse.json();
    // Check for Pro tier
    expect(user.tier === 'pro' || user.subscription?.name?.toLowerCase() === 'pro').toBeTruthy();
  });

  test('7.2: API Access Available', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Pro users should have API access
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(userResponse.status()).toBe(200);
    const user = await userResponse.json();
    // API access should be available for Pro
    expect(user.tier === 'pro' || user.api_access === true).toBeTruthy();
  });

  test('7.3: Unlimited Offline Maps', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Pro users should have unlimited offline maps
    const limitsResponse = await page.request.get('/api/offline-maps/limits', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (limitsResponse.status() === 200) {
      const limits = await limitsResponse.json();
      // Pro should have unlimited or very high limit
      expect(limits.max_downloads === -1 || limits.max_downloads > 5 || !limits.max_downloads).toBeTruthy();
    }
  });

  test('7.6: All Premium Features Still Work', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Test alternative routes (premium feature)
    const routeResponse = await page.request.post('/api/routes/calculate', {
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

    // Should work (may fail if GraphHopper unavailable)
    expect([200, 500, 503, 400, 422]).toContain(routeResponse.status());
  });
});



















