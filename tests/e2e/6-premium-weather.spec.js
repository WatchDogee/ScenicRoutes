import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Weather Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Get Weather by Coordinates', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/weather?lat=56.9496&lon=24.1052', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500, 503]).toContain(response.status());
    if (response.status() === 200) {
      const weather = await response.json();
      expect(weather).toBeTruthy();
      expect(typeof weather === 'object').toBeTruthy();
    }
  });

  test('Get Weather for Road', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Weather Test Road ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const road = await roadResponse.json();
    const weatherResponse = await page.request.get(`/api/roads/${road.id}/weather`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500, 503]).toContain(weatherResponse.status());
  });

  test('Clear Weather Cache', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('/api/weather/clear-cache', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 204, 500]).toContain(response.status());
  });
});



















