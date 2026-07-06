import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Follow Status & User Details Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Check Follow Status Between Users', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const currentUserId = currentUser.id;
    const userId = 1;
    if (userId !== currentUserId) {
      const statusResponse = await page.request.get(`/api/users/${userId}/follow-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      expect(statusResponse.status()).toBe(200);
      const status = await statusResponse.json();
      expect(status).toHaveProperty('following');
      expect(status).toHaveProperty('followed_by');
    }
  });

  test('View User\'s Followers', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const userId = currentUser.id;
    const followersResponse = await page.request.get(`/api/users/${userId}/followers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(followersResponse.status()).toBe(200);
    const followers = await followersResponse.json();
    expect(Array.isArray(followers)).toBeTruthy();
  });

  test('View User\'s Following', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const userId = currentUser.id;
    const followingResponse = await page.request.get(`/api/users/${userId}/following`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(followingResponse.status()).toBe(200);
    const following = await followingResponse.json();
    expect(Array.isArray(following)).toBeTruthy();
  });

  test('View User Details', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const userResponse = await page.request.get('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const currentUser = await userResponse.json();
    const userId = currentUser.id;
    const detailsResponse = await page.request.get(`/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(detailsResponse.status()).toBe(200);
    const user = await detailsResponse.json();
    expect(user.id).toBe(userId);
    expect(user.name).toBeTruthy();
  });
});



















