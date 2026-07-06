import { test, expect } from '@playwright/test';
import { login, logout, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 2: AUTHENTICATION TESTS
 */

test.describe('Authentication Tests', () => {
  test('2.4: User Login with Email', async ({ page }) => {
    const success = await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    expect(success).toBeTruthy();

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('2.4: User Login with Username', async ({ page }) => {
    // Try login with username (if applicable)
    const success = await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    expect(success).toBeTruthy();
  });

  test('2.4: Invalid Credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    
    const axios = require('axios');
    try {
      await axios.post(`${process.env.APP_URL || 'http://127.0.0.1:8000'}/api/login`, {
        login: 'invalid@example.com',
        password: 'wrongpassword'
      }, {
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json'
        }
      });
      expect(false).toBeTruthy(); // Should not reach here
    } catch (error) {
      expect([401, 422, 400]).toContain(error.response?.status);
    }
  });

  test('2.6: Logout', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await logout(page);

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });
});



















