import { test, expect } from '@playwright/test';

/**
 * SECTION 2: USER REGISTRATION TESTS
 */

test.describe('User Registration Tests', () => {
  test('2.1: Valid Registration', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const timestamp = Date.now();
    const email = `test_${timestamp}@example.com`;
    const username = `testuser_${timestamp}`;

    const axios = require('axios');
    const response = await axios.post(`${process.env.APP_URL || 'http://127.0.0.1:8000'}/api/register`, {
      name: 'Test User',
      email: email,
      username: username,
      password: 'Password123!',
      password_confirmation: 'Password123!'
    }, {
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(() => null);

    expect([200, 201]).toContain(response?.status);
  });

  test('2.1: Duplicate Email', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const axios = require('axios');
    
    try {
      await axios.post(`${process.env.APP_URL || 'http://127.0.0.1:8000'}/api/register`, {
        name: 'Test User',
        email: 'test_premium@example.com', // Existing email
        username: `testuser_${Date.now()}`,
        password: 'Password123!',
        password_confirmation: 'Password123!'
      }, {
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json'
        }
      });
      expect(false).toBeTruthy();
    } catch (error) {
      expect([422, 400]).toContain(error.response?.status);
    }
  });

  test('2.1: Duplicate Username', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const axios = require('axios');
    
    try {
      await axios.post(`${process.env.APP_URL || 'http://127.0.0.1:8000'}/api/register`, {
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
        username: 'test_premium', // Existing username
        password: 'Password123!',
        password_confirmation: 'Password123!'
      }, {
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json'
        }
      });
      expect(false).toBeTruthy();
    } catch (error) {
      expect([422, 400]).toContain(error.response?.status);
    }
  });

  test('2.1: Password Validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const axios = require('axios');
    
    try {
      await axios.post(`${process.env.APP_URL || 'http://127.0.0.1:8000'}/api/register`, {
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
        username: `testuser_${Date.now()}`,
        password: 'short', // Too short
        password_confirmation: 'short'
      }, {
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json'
        }
      });
      expect(false).toBeTruthy();
    } catch (error) {
      expect([422, 400]).toContain(error.response?.status);
    }
  });

  test('2.1: Email Format Validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const axios = require('axios');
    
    try {
      await axios.post(`${process.env.APP_URL || 'http://127.0.0.1:8000'}/api/register`, {
        name: 'Test User',
        email: 'invalid-email', // Invalid format
        username: `testuser_${Date.now()}`,
        password: 'Password123!',
        password_confirmation: 'Password123!'
      }, {
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json'
        }
      });
      expect(false).toBeTruthy();
    } catch (error) {
      expect([422, 400]).toContain(error.response?.status);
    }
  });
});



















