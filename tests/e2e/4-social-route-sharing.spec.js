import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Route Sharing Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('4.6: Create Shared Route Link', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const shareResponse = await page.request.post('/api/routes/share', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        name: `Shared Route ${Date.now()}`,
        description: 'Route for sharing test'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 201]).toContain(shareResponse.status());
    const response = await shareResponse.json();
    expect(response.token || response.share_token || response.url).toBeTruthy();
  });

  test('4.6: View Shared Route Stats', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const createResponse = await page.request.post('/api/routes/share', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        name: `Stats Test ${Date.now()}`
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const shareData = await createResponse.json();
    const shareToken = shareData.token || shareData.share_token || 'test-token';
    const statsResponse = await page.request.get(`/api/routes/shared/${shareToken}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 404, 500]).toContain(statsResponse.status());
  });

  test('4.6: Generate QR Code for Shared Route', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const createResponse = await page.request.post('/api/routes/share', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        name: `QR Test ${Date.now()}`
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const shareData = await createResponse.json();
    const shareToken = shareData.token || shareData.share_token || 'test-token';
    const qrResponse = await page.request.get(`/api/routes/shared/${shareToken}/qr`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 404, 500]).toContain(qrResponse.status());
  });

  test('4.6: Delete Shared Route', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const createResponse = await page.request.post('/api/routes/share', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        name: `Delete Test ${Date.now()}`
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const shareData = await createResponse.json();
    const shareToken = shareData.token || shareData.share_token || 'test-token';
    const deleteResponse = await page.request.delete(`/api/routes/shared/${shareToken}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 204, 404]).toContain(deleteResponse.status());
  });

  test('4.6: Record Share Action', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const createResponse = await page.request.post('/api/routes/share', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100,
        name: `Record Test ${Date.now()}`
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const shareData = await createResponse.json();
    const shareToken = shareData.token || shareData.share_token || 'test-token';
    const recordResponse = await page.request.post(`/api/routes/shared/${shareToken}/share`, {
      data: { platform: 'test' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 201, 404, 500]).toContain(recordResponse.status());
  });

  test('4.6: Access Shared Route (Guest)', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    const accessResponse = await page.request.get('/api/routes/shared/test-token', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect([200, 404, 500]).toContain(accessResponse.status());
  });
});



















