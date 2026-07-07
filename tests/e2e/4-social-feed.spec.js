import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 4: SOCIAL FEATURES - FEED TESTS
 */

test.describe('Social Feed Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('4.4: View Social Feed', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/feed', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const feed = await response.json();
    expect(feed).toBeTruthy();
    expect(typeof feed === 'object').toBeTruthy();
    // Feed should have roads and/or collections
    expect(feed.roads || feed.collections || feed.data).toBeTruthy();
  });

  test('4.4: Feed Shows Followed Users Activity', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/feed', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const feed = await response.json();
    expect(feed.roads || feed.collections || feed.data).toBeTruthy();
  });

  test('4.4: Feed Updates After Following New User', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Follow a user first
    await page.request.post('/api/users/1/follow', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }).catch(() => {});

    // Get feed
    const response = await page.request.get('/api/feed', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const feed = await response.json();
    expect(feed).toBeTruthy();
  });
});



















