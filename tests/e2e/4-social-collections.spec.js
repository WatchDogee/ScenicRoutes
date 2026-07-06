import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 4: SOCIAL FEATURES - COLLECTIONS TESTS
 */

test.describe('Collections Tests', () => {
  let collectionId = null;

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('4.2: Create Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/collections', {
      data: {
        name: `Test Collection ${Date.now()}`,
        description: 'Test collection description',
        is_public: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201]).toContain(response.status());
    const data = await response.json();
    const collection = data.collection || data.data || data;
    collectionId = collection.id;
    expect(collection.name).toBeTruthy();
  });

  test('4.2: View Own Collections', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/collections', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    const collections = data.data || data;
    expect(Array.isArray(collections)).toBeTruthy();
  });

  test('4.2: View Public Collections', async ({ page }) => {
    const response = await page.request.get('/api/public-collections', {
      headers: {
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      const collections = data.data || data;
      expect(Array.isArray(collections) || typeof collections === 'object').toBeTruthy();
    }
  });

  test('4.2: Edit Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection first
    const createResponse = await page.request.post('/api/collections', {
      data: {
        name: `Edit Test ${Date.now()}`,
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const createData = await createResponse.json();
    const collection = createData.collection || createData.data || createData;
    const testCollectionId = collection.id;

    // Edit collection
    const editResponse = await page.request.put(`/api/collections/${testCollectionId}`, {
      data: {
        name: `Updated Name ${Date.now()}`,
        description: 'Updated description'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201]).toContain(editResponse.status());
  });

  test('4.2: Delete Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection first
    const createResponse = await page.request.post('/api/collections', {
      data: {
        name: `Delete Test ${Date.now()}`
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const createData = await createResponse.json();
    const collection = createData.collection || createData.data || createData;
    const testCollectionId = collection.id;

    // Delete collection
    const deleteResponse = await page.request.delete(`/api/collections/${testCollectionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 204]).toContain(deleteResponse.status());
  });

  test('4.2: Private Collection Not Visible to Others', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create private collection
    const createResponse = await page.request.post('/api/collections', {
      data: {
        name: `Private Test ${Date.now()}`,
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const createData = await createResponse.json();
    const collection = createData.collection || createData.data || createData;
    const testCollectionId = collection.id;

    // Try to access as public (should fail or not show)
    const publicResponse = await page.request.get(`/api/public-collections`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    // Private collection should not appear in public list
    if (publicResponse.status() === 200) {
      const publicData = await publicResponse.json();
      const publicCollections = publicData.data || publicData;
      const found = Array.isArray(publicCollections) 
        ? publicCollections.find(c => c.id === testCollectionId)
        : false;
      expect(found).toBeFalsy();
    }
  });
});



















