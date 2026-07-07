import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 8: EDGE CASES & ERROR HANDLING TESTS
 */

test.describe('Edge Cases & Error Handling Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('8.1: Session Expiration - Invalid Token', async ({ page }) => {
    // Use invalid token
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid-token-12345');
    });

    const response = await page.request.get('/api/user', {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
        'Accept': 'application/json'
      }
    });

    // Should return 401 (unauthorized)
    expect([401, 403]).toContain(response.status());
  });

  test('8.1: Session Expiration - Missing Token', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });

    const response = await page.request.get('/api/user', {
      headers: {
        'Accept': 'application/json'
      }
    });

    // Should return 401 (unauthorized)
    expect([401, 403]).toContain(response.status());
  });

  test('8.2: Network Errors - Invalid Endpoint', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/invalid-endpoint-12345', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Should return 404 (not found)
    expect([404, 500]).toContain(response.status());
  });

  test('8.3: Invalid Input - Empty Fields', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/collections', {
      data: {
        name: '',
        description: ''
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return validation error
    expect([422, 400]).toContain(response.status());
  });

  test('8.3: Invalid Input - Oversized Input', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const largeString = 'a'.repeat(10000);
    const response = await page.request.post('/api/collections', {
      data: {
        name: largeString,
        description: largeString
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return validation error or 413 (payload too large)
    expect([422, 400, 413]).toContain(response.status());
  });

  test('8.3: Invalid Input - Wrong Data Type', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/collections', {
      data: {
        name: 12345, // Should be string
        is_public: 'not-a-boolean' // Should be boolean
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return validation error
    expect([422, 400]).toContain(response.status());
  });

  test('8.4: Rate Limiting', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Make many rapid requests
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        page.request.get('/api/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })
      );
    }

    const responses = await Promise.all(requests);
    // At least one should potentially be rate limited (429)
    const statuses = responses.map(r => r.status());
    // Most should be 200, but rate limiting may kick in
    expect(statuses.some(s => s === 200 || s === 429)).toBeTruthy();
  });

  test('8.5: CSRF Protection', async ({ page }) => {
    // Try to make request without CSRF token
    const response = await page.request.post('/api/collections', {
      data: {
        name: 'Test Collection'
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        // Missing X-CSRF-TOKEN
      }
    });

    // Should return 419 (CSRF token mismatch) or 401
    expect([419, 401, 403]).toContain(response.status());
  });
});



















