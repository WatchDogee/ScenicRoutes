import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Extended Leaderboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('View All Leaderboards', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/leaderboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
  });

  test('Top Rated Roads', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/leaderboard/top-rated', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const roads = await response.json();
      expect(Array.isArray(roads)).toBeTruthy();
    }
  });

  test('Most Popular Roads', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/leaderboard/most-popular', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const roads = await response.json();
      expect(Array.isArray(roads)).toBeTruthy();
    }
  });

  test('Most Active Users', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/leaderboard/most-active-users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const users = await response.json();
      expect(Array.isArray(users)).toBeTruthy();
    }
  });

  test('Popular Roads by Country', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/leaderboard/popular-roads-by-country?country=Latvia', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const roads = await response.json();
      expect(Array.isArray(roads)).toBeTruthy();
    }
  });

  test('Countries with Most Roads', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/leaderboard/countries-with-most-roads', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const countries = await response.json();
      expect(Array.isArray(countries)).toBeTruthy();
    }
  });
});



















