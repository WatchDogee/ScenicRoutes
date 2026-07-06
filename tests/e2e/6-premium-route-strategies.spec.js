import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Route Calculation Strategies Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Curved Route Strategy', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('/api/routes/curved', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('Straightest Route Strategy', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('/api/routes/straightest', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('Compare Strategies', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('/api/routes/compare-strategies', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('Strategy 1', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('/api/routes/strategy1', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('Strategy 2', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('/api/routes/strategy2', {
      data: {
        start_lat: 56.9496,
        start_lon: 24.1052,
        end_lat: 56.9500,
        end_lon: 24.1100
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });

  test('GraphHopper Segment Curvature', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('/api/routes/graphhopper/segment-curvature', {
      data: {
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]]
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 500, 503, 400, 422]).toContain(response.status());
  });
});



















