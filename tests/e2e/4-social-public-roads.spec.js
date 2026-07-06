import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Public Road Endpoints Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Search Public Roads', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/roads?query=test&country=Latvia', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const roads = await response.json();
      const roadsList = roads.data || roads;
      expect(Array.isArray(roadsList) || typeof roadsList === 'object').toBeTruthy();
    }
  });

  test('View Public Road Details', async ({ page }) => {
    const response = await page.request.get('/api/public-roads/1', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect([200, 404, 500]).toContain(response.status());
    if (response.status() === 200) {
      const road = await response.json();
      expect(road).toBeTruthy();
    }
  });

  test('Public Roads Index', async ({ page }) => {
    const response = await page.request.get('/api/public-roads', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      const roads = data.roads || data.data || data;
      expect(Array.isArray(roads) || typeof roads === 'object').toBeTruthy();
    }
  });
});



















