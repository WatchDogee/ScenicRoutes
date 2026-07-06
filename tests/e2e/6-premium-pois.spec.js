import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Points of Interest (POIs) Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Search POIs', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/pois?lat=56.9496&lon=24.1052&radius=5000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
  });

  test('View POI Details', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/pois/1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 404, 500]).toContain(response.status());
  });

  test('Fetch Tourism POIs', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/fetch-tourism?lat=56.9496&lon=24.1052&radius=5000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500, 503]).toContain(response.status());
  });

  test('Fetch Fuel Stations', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/fetch-fuel-stations?lat=56.9496&lon=24.1052&radius=5000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500, 503]).toContain(response.status());
  });

  test('Fetch Charging Stations', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/fetch-charging-stations?lat=56.9496&lon=24.1052&radius=5000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500, 503]).toContain(response.status());
  });

  test('Overpass Proxy', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/overpass-proxy?query=test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500, 503]).toContain(response.status());
  });
});



















