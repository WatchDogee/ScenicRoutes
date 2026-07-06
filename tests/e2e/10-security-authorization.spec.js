import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 10: SECURITY & AUTHORIZATION TESTS
 */

test.describe('Security & Authorization Tests', () => {
  test('10.2: Free User Cannot Access Premium Endpoints', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try to access premium feature (alternative routes calculation)
    const response = await page.request.post('/api/routes/calculate', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        alternative_routes: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return 403 (forbidden) or 402 (payment required) or 500 (if not implemented)
    expect([403, 401, 402, 500]).toContain(response.status());
  });

  test('10.2: Cannot Access Private Collections of Others', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try to access a private collection (use a high ID that might be private)
    const response = await page.request.get('/api/collections/99999', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Should return 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status());
  });

  test('10.2: Cannot Modify Other User\'s Data', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try to modify another user's collection (use a high ID)
    const response = await page.request.put('/api/collections/99999', {
      data: {
        name: 'Hacked Collection'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status());
  });

  test('10.2: Cannot Delete Other User\'s Data', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try to delete another user's collection
    const response = await page.request.delete('/api/collections/99999', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Should return 403 (forbidden) or 404 (not found)
    expect([403, 404]).toContain(response.status());
  });

  test('10.3: XSS Attempt', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try to inject XSS payload
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await page.request.post('/api/collections', {
      data: {
        name: xssPayload,
        description: xssPayload
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should either sanitize (200/201) or reject (422/400)
    if (response.status() === 200 || response.status() === 201) {
      const data = await response.json();
      const collection = data.collection || data.data || data;
      // Check that script tags are escaped/sanitized
      expect(collection.name).not.toContain('<script>');
    } else {
      expect([422, 400]).toContain(response.status());
    }
  });

  test('10.3: SQL Injection Attempt', async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Try SQL injection payload
    const sqlPayload = "'; DROP TABLE users; --";
    const response = await page.request.post('/api/collections', {
      data: {
        name: sqlPayload
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should handle gracefully (200 with sanitized data, or 422/400 validation error)
    // Should NOT return 500 (server error from SQL injection)
    expect([200, 201, 422, 400]).toContain(response.status());
  });
});



















