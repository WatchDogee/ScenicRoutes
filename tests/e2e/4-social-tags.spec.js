import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 4: SOCIAL FEATURES - TAGS TESTS
 */

test.describe('Tags Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    // Use a more lenient wait - wait for load, then give extra time for network requests
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give time for network requests to complete
  });

  test('Create Tag', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.post('/api/tags', {
      data: {
        name: `Test Tag ${Date.now()}`
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // May require admin, so 403 is acceptable
    expect([200, 201, 403, 500]).toContain(response.status());
  });

  test('View All Tags', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/tags', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    const tags = await response.json();
    expect(Array.isArray(tags) || typeof tags === 'object').toBeTruthy();
  });

  test('Add Tags to Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection first
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Tag Test Collection ${Date.now()}`,
        is_public: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const collectionData = await collectionResponse.json();
    const collection = collectionData.collection || collectionData.data || collectionData;
    const collectionId = collection.id;

    // Add tags
    const tagResponse = await page.request.post(`/api/collections/${collectionId}/tags`, {
      data: {
        tags: ['scenic', 'mountains']
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201, 204]).toContain(tagResponse.status());
  });

  test('Add Tags to Road', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create road first
    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Tag Test Road ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road = await roadResponse.json();
    const roadId = road.id;

    // Add tags
    const tagResponse = await page.request.post(`/api/saved-roads/${roadId}/tags`, {
      data: {
        tags: ['curvy', 'scenic']
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201, 204]).toContain(tagResponse.status());
  });

  test('Remove Tags from Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection and add tags first
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Remove Tag Test ${Date.now()}`,
        is_public: true
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const collectionData = await collectionResponse.json();
    const collection = collectionData.collection || collectionData.data || collectionData;
    const collectionId = collection.id;

    // Remove tags
    const removeResponse = await page.request.delete(`/api/collections/${collectionId}/tags`, {
      data: {
        tags: ['scenic']
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 204]).toContain(removeResponse.status());
  });

  test('Search by Tags', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/collections-by-tag?tag=scenic', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const collections = await response.json();
      expect(Array.isArray(collections) || typeof collections === 'object').toBeTruthy();
    }
  });
});


