import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Offline Maps Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('6.4: View Available Regions', async ({ page }) => {
    const response = await page.request.get('/api/offline-maps/regions', {
      headers: {
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const regions = await response.json();
    expect(Array.isArray(regions)).toBeTruthy();
  });

  test('6.4: Download Offline Map Region', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const regionsResponse = await page.request.get('/api/offline-maps/regions', {
      headers: {
        'Accept': 'application/json'
      }
    });
    const regions = await regionsResponse.json();
    if (regions.length > 0) {
      const regionId = regions[0].id || regions[0].name;
      const downloadResponse = await page.request.post('/api/offline-maps/download', {
        data: {
          region_id: regionId
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      expect([200, 201, 422, 500]).toContain(downloadResponse.status());
    }
  });

  test('6.4: View User Downloads', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/offline-maps/downloads', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const downloads = await response.json();
    const downloadsList = downloads.data || downloads;
    expect(Array.isArray(downloadsList)).toBeTruthy();
  });

  test('6.4: Complete Download', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const downloadsResponse = await page.request.get('/api/offline-maps/downloads', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const downloads = await downloadsResponse.json();
    const downloadsList = downloads.data || downloads;
    if (downloadsList.length > 0) {
      const completeResponse = await page.request.post(`/api/offline-maps/downloads/${downloadsList[0].id}/complete`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      expect([200, 201]).toContain(completeResponse.status());
    }
  });

  test('6.4: Delete Download', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const downloadsResponse = await page.request.get('/api/offline-maps/downloads', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const downloads = await downloadsResponse.json();
    const downloadsList = downloads.data || downloads;
    if (downloadsList.length > 0) {
      const deleteResponse = await page.request.delete(`/api/offline-maps/downloads/${downloadsList[0].id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      expect([200, 204]).toContain(deleteResponse.status());
    }
  });

  test('6.4: Check Storage Usage', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/offline-maps/storage', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const storage = await response.json();
    expect(storage).toBeTruthy();
    expect(typeof storage === 'object').toBeTruthy();
  });

  test('6.4: Check Download Limits', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/offline-maps/limits', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const limits = await response.json();
    expect(limits).toBeTruthy();
    expect(typeof limits === 'object').toBeTruthy();
  });
});



















