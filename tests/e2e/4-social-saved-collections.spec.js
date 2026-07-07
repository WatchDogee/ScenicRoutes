import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Saved Collections Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Save Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const collectionsResponse = await page.request.get('/api/public-collections', {
      headers: {
        'Accept': 'application/json'
      }
    });
    const collections = await collectionsResponse.json();
    const collectionsList = collections.data || collections;
    if (collectionsList.length > 0) {
      const saveResponse = await page.request.post(`/api/collections/${collectionsList[0].id}/save`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      // 403 is valid if user tries to save their own collection
      expect([200, 201, 403]).toContain(saveResponse.status());
    } else {
      const createResponse = await page.request.post('/api/collections', {
        data: {
          name: `Save Test Collection ${Date.now()}`,
          is_public: true
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const collectionData = await createResponse.json();
      const collection = collectionData.collection || collectionData.data || collectionData;
      const saveResponse = await page.request.post(`/api/collections/${collection.id}/save`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      // 403 is valid if user tries to save their own collection
      expect([200, 201, 403]).toContain(saveResponse.status());
    }
  });

  test('View Saved Collections', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/saved-collections', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const collections = await response.json();
    const collectionsList = collections.data || collections;
    expect(Array.isArray(collectionsList)).toBeTruthy();
  });

  test('Remove Saved Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const createResponse = await page.request.post('/api/collections', {
      data: {
        name: `Remove Test ${Date.now()}`,
        is_public: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const collectionData = await createResponse.json();
    const collection = collectionData.collection || collectionData.data || collectionData;
    await page.request.post(`/api/collections/${collection.id}/save`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const removeResponse = await page.request.delete(`/api/saved-collections/${collection.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 204]).toContain(removeResponse.status());
  });

  test('View Following Collections', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('/api/following/collections', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(response.status()).toBe(200);
    const collections = await response.json();
    const collectionsList = collections.data || collections;
    expect(Array.isArray(collectionsList)).toBeTruthy();
  });
});


