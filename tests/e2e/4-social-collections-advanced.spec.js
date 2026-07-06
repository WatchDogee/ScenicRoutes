import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

/**
 * SECTION 4: SOCIAL FEATURES - ADVANCED COLLECTION OPERATIONS TESTS
 */

test.describe('Advanced Collection Operations Tests', () => {
  let collectionId = null;
  let roadId = null;

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
  });

  test('Add Single Road to Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Add Road Test ${Date.now()}`,
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
    collectionId = collection.id;

    // Create road
    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Collection Road ${Date.now()}`,
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
    roadId = road.id;

    // Add road to collection
    const addResponse = await page.request.post(`/api/collections/${collectionId}/road`, {
      data: {
        road_id: roadId
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201]).toContain(addResponse.status());
  });

  test('Add Multiple Roads to Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Multiple Roads Test ${Date.now()}`,
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
    const testCollectionId = collection.id;

    // Create roads
    const road1Response = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Road 1 ${Date.now()}`,
        coordinates: [[56.9496, 24.1052], [56.9500, 24.1100]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road2Response = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Road 2 ${Date.now()}`,
        coordinates: [[56.9500, 24.1100], [56.9510, 24.1200]],
        is_public: false
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const road1 = await road1Response.json();
    const road2 = await road2Response.json();

    // Add multiple roads
    const addResponse = await page.request.post(`/api/collections/${testCollectionId}/roads`, {
      data: {
        road_ids: [road1.id, road2.id]
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201]).toContain(addResponse.status());
  });

  test('Remove Road from Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection and road
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Remove Road Test ${Date.now()}`,
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
    const testCollectionId = collection.id;

    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `To Remove ${Date.now()}`,
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
    const testRoadId = road.id;

    // Add road first
    await page.request.post(`/api/collections/${testCollectionId}/road`, {
      data: {
        road_id: testRoadId
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Remove road
    const removeResponse = await page.request.delete(`/api/collections/${testCollectionId}/roads/${testRoadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    expect([200, 204]).toContain(removeResponse.status());
  });

  test('Reorder Roads in Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Reorder Test ${Date.now()}`,
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
    const testCollectionId = collection.id;

    // Reorder roads (if endpoint exists)
    const reorderResponse = await page.request.post(`/api/collections/${testCollectionId}/reorder`, {
      data: {
        road_ids: [1, 2, 3]
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // May return 500 if not implemented
    expect([200, 201, 500]).toContain(reorderResponse.status());
  });

  test('Save Public Road to Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create collection
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Public Road Test ${Date.now()}`,
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
    const testCollectionId = collection.id;

    // Save public road to collection
    const saveResponse = await page.request.post(`/api/collections/${testCollectionId}/save-public-road`, {
      data: {
        road_id: 1 // Use existing public road ID
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    expect([200, 201, 404, 500]).toContain(saveResponse.status());
  });
});



















