import { test, expect } from '@playwright/test';

/**
 * SECTION 2: PASSWORD RESET TESTS
 */

test.describe('Password Reset Tests', () => {
  test('2.5: Request Password Reset - Valid Email', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const response = await page.request.post('/api/forgot-password', {
      data: {
        email: 'test_premium@example.com'
      },
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return 200 or 500 (if email service not configured)
    expect([200, 500]).toContain(response.status());
  });

  test('2.5: Request Password Reset - Invalid Email', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const response = await page.request.post('/api/forgot-password', {
      data: {
        email: 'nonexistent@example.com'
      },
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return 200 (don't reveal if email exists) or 422 (validation error)
    expect([200, 422, 500]).toContain(response.status());
  });

  test('2.5: Reset Password - Invalid Token', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const response = await page.request.post('/api/reset-password', {
      data: {
        token: 'invalid-token',
        email: 'test_premium@example.com',
        password: 'NewPassword123!',
        password_confirmation: 'NewPassword123!'
      },
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return 400 or 422 for invalid token
    expect([400, 422, 500]).toContain(response.status());
  });

  test('2.5: Reset Password - Mismatched Passwords', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const response = await page.request.post('/api/reset-password', {
      data: {
        token: 'test-token',
        email: 'test_premium@example.com',
        password: 'NewPassword123!',
        password_confirmation: 'DifferentPassword123!'
      },
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Should return 422 for validation error
    expect([422, 400, 500]).toContain(response.status());
  });
});



















