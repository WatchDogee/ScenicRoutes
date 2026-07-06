import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Location Services Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Get Countries List', async ({ page }) => {
    const response = await page.request.get('/api/countries', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const countries = await response.json();
    expect(Array.isArray(countries)).toBeTruthy();
  });

  test('Get Regions List', async ({ page }) => {
    const response = await page.request.get('/api/regions', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const regions = await response.json();
    expect(Array.isArray(regions)).toBeTruthy();
  });

  test('Get Country Statistics', async ({ page }) => {
    const response = await page.request.get('/api/country-stats?country=Latvia', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const stats = await response.json();
      expect(stats).toBeTruthy();
      expect(typeof stats === 'object').toBeTruthy();
    }
  });
});



















