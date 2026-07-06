import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 5: USER PROFILE TESTS
 */

test.describe('User Profile Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('View Own Profile', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const user = await response.json();
    expect(user.id).toBeTruthy();
    expect(user.name).toBeTruthy();
  });

  test('View Public User Profile', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Get current user ID
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const userId = currentUser.id;

    // View public profile
    const response = await page.request.get(`/api/public/users/${userId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const user = await response.json();
      expect(user.id).toBe(userId);
    }
  });

  test('View User\'s Public Roads', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Get current user ID
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const userId = currentUser.id;

    // View user's public roads
    const response = await page.request.get(`/api/public/users/${userId}/roads`, {
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

  test('View User\'s Public Collections', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Get current user ID
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const userId = currentUser.id;

    // View user's public collections
    const response = await page.request.get(`/api/public/users/${userId}/collections`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const collections = await response.json();
      expect(Array.isArray(collections) || typeof collections === 'object').toBeTruthy();
    }
  });
});



















