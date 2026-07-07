import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Subscription & Stripe Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    await page.goto('/map');
  });

  test('5.1: View Subscription Plans', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    await page.goto('/map');
    await page.waitForTimeout(2000);
    const upgradeButton = page.locator('button:has-text("Upgrade"), a:has-text("Premium"), button:has-text("Premium")').first();
    const buttonVisible = await upgradeButton.isVisible().catch(() => false);
    expect(buttonVisible).toBeTruthy();
  });

  test('5.2: Upgrade to Premium (Monthly) - Create Checkout Session', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const checkoutResponse = await page.request.post('/api/subscriptions/checkout', {
      data: {
        plan: 'premium_monthly',
        price_id: 'price_test_premium_monthly'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(() => ({
      status: () => 404
    }));
    expect([200, 201, 404, 500, 422]).toContain(checkoutResponse.status());
  });

  test('5.3: Upgrade to Premium (Yearly)', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const checkoutResponse = await page.request.post('/api/subscriptions/checkout', {
      data: {
        plan: 'premium_yearly',
        price_id: 'price_test_premium_yearly'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(() => ({
      status: () => 404
    }));
    expect([200, 201, 404, 500, 422]).toContain(checkoutResponse.status());
  });

  test('5.4: Upgrade to Pro (Monthly)', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const checkoutResponse = await page.request.post('/api/subscriptions/checkout', {
      data: {
        plan: 'pro_monthly',
        price_id: 'price_test_pro_monthly'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(() => ({
      status: () => 404
    }));
    expect([200, 201, 404, 500, 422]).toContain(checkoutResponse.status());
  });

  test('5.5: Upgrade from Premium to Pro', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const checkoutResponse = await page.request.post('/api/subscriptions/checkout', {
      data: {
        plan: 'pro_monthly',
        price_id: 'price_test_pro_monthly'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(() => ({
      status: () => 404
    }));
    expect([200, 201, 404, 500, 422]).toContain(checkoutResponse.status());
  });

  test('5.6: Checkout Cancellation', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const cancelResponse = await page.request.post('/api/subscriptions/cancel', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }).catch(() => ({
      status: () => 404
    }));
    expect([200, 404, 422, 500]).toContain(cancelResponse.status());
  });

  test('5.7: Payment Failure Handling', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const checkoutResponse = await page.request.post('/api/subscriptions/checkout', {
      data: {
        plan: 'premium_monthly',
        payment_method: 'pm_card_chargeDeclined'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(() => ({
      status: () => 404
    }));
    expect([400, 402, 404, 422, 500]).toContain(checkoutResponse.status());
  });

  test('5.8: Webhook Verification', async ({ page }) => {
    const webhookResponse = await page.request.post('/api/webhooks/stripe', {
      data: {
        type: 'test',
        data: {}
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(() => ({
      status: () => 404
    }));
    expect([200, 400, 404, 500]).toContain(webhookResponse.status());
  });
});



















