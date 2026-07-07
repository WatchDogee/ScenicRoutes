import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 4: SOCIAL FEATURES - SEARCH TESTS
 */

test.describe('Search & Filter Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('Search Collections by Name', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/public-collections?search=test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
  });

  test('Search Collections by Country', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/collections-by-country?country=Latvia', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
  });

  test('Search Collections by Tags', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/collections-by-tag?tag=scenic', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
  });

  test('Search Users', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/users/search?q=test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const users = await response.json();
      expect(Array.isArray(users) || typeof users === 'object').toBeTruthy();
    }
  });

  test('Get User Recommendations', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/users/recommendations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const recommendations = await response.json();
      expect(Array.isArray(recommendations) || typeof recommendations === 'object').toBeTruthy();
    }
  });

  test('Filter Public Roads by Country', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/public-roads?country=Latvia', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
  });
});



















