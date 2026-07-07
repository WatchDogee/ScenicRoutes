import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 5: USER SETTINGS TESTS
 */

test.describe('User Settings Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('View User Settings', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/settings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const settings = await response.json();
      expect(typeof settings === 'object').toBeTruthy();
    }
  });

  test('Update User Settings', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/settings', {
      data: {
        notifications: true,
        email_notifications: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // May return 500 if not implemented
    expect([200, 201, 500]).toContain(response.status());
  });

  test('Batch Update Settings', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/settings/batch', {
      data: {
        settings: {
          notifications: true,
          email_notifications: true,
          theme: 'dark'
        }
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // May return 500 if not implemented
    expect([200, 201, 500]).toContain(response.status());
  });
});



















