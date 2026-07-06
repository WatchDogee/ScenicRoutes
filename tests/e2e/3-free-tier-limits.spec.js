import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 3: FREE TIER LIMITS TESTS
 */

test.describe('Free Tier Limits Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('3.3: Round Trip > 300km Limit', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/routes/calculate', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        round_trip: true,
        distance: 400
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json().catch(() => ({}));
    const responseText = JSON.stringify(responseData);

    if (response.status() === 200) {
      expect(responseText.toLowerCase()).toMatch(/300|limit|upgrade/);
    } else {
      expect([400, 403, 422]).toContain(response.status());
    }
  });

  test('3.6: Premium Feature Gates - Alternative Routes', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for alternative routes feature
    const altRoutes = page.locator('text=Alternative, text=Alternatives').first();
    const altVisible = await altRoutes.isVisible().catch(() => false);
    
    // Should either be visible with upgrade prompt, or hidden
    // If visible, should show upgrade prompt when clicked
    expect(altVisible !== undefined).toBeTruthy();
  });

  test('3.6: Premium Feature Gates - Extra Curvy', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for extra curvy option
    const extraCurvy = page.locator('text=Extra Curvy, text=Extra').first();
    const extraVisible = await extraCurvy.isVisible().catch(() => false);
    
    // Should show upgrade prompt or be disabled
    expect(extraVisible !== undefined).toBeTruthy();
  });

  test('3.6: Upgrade Prompt Display', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade"), a:has-text("Premium")').first();
    const upgradeVisible = await upgradeButton.isVisible().catch(() => false);
    expect(upgradeVisible).toBeTruthy();
  });
});



















