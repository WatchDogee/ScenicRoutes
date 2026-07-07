import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 4: SOCIAL FEATURES - FOLLOWING TESTS
 */

test.describe('Following System Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('4.3: Follow User', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Get current user ID
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const currentUserId = currentUser.id;

    // Try to follow user ID 1 (if different from current user)
    const userId = 1;
    if (userId !== currentUserId) {
      const followResponse = await page.request.post(`/api/users/${userId}/follow`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      // Should return 200, 201, or 422 (already following)
      expect([200, 201, 422]).toContain(followResponse.status());
    }
  });

  test('4.3: Unfollow User', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const userId = 1;
    const unfollowResponse = await page.request.delete(`/api/users/${userId}/follow`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Should return 200, 201, or 422 (not following)
    expect([200, 201, 422]).toContain(unfollowResponse.status());
  });

  test('4.3: View Following List', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/following', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    const following = data.data || data;
    expect(Array.isArray(following) || typeof following === 'object').toBeTruthy();
  });

  test('4.3: View Followers List', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/followers', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    const followers = data.data || data;
    expect(Array.isArray(followers) || typeof followers === 'object').toBeTruthy();
  });

  test('4.3: Cannot Follow Self', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Get current user ID
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const currentUserId = currentUser.id;

    // Try to follow self
    const followResponse = await page.request.post(`/api/users/${currentUserId}/follow`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Should return 400 or 422
    expect([400, 422]).toContain(followResponse.status());
  });
});



















