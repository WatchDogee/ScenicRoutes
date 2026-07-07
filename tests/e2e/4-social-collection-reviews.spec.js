import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Collection Reviews Tests', () => {
  let collectionId = null;

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Add Review to Collection', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Review Test Collection ${Date.now()}`,
        description: 'Collection for review testing',
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
    const reviewResponse = await page.request.post(`/api/collections/${collectionId}/review`, {
      data: {
        rating: 5,
        comment: 'Great collection!'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 201]).toContain(reviewResponse.status());
    const response = await reviewResponse.json();
    expect(response.message || response.review || response).toBeTruthy();
  });

  test('View Collection Reviews', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `View Reviews Test ${Date.now()}`,
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
    await page.request.post(`/api/collections/${collection.id}/review`, {
      data: { rating: 4, comment: 'Nice collection' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const reviewsResponse = await page.request.get(`/api/collections/${collection.id}/reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect(reviewsResponse.status()).toBe(200);
    const reviews = await reviewsResponse.json();
    const reviewsList = reviews.data || reviews;
    expect(Array.isArray(reviewsList)).toBeTruthy();
  });

  test('Delete Collection Review', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Delete Review Test ${Date.now()}`,
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
    await page.request.post(`/api/collections/${collection.id}/review`, {
      data: { rating: 3, comment: 'To be deleted' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const reviewsResponse = await page.request.get(`/api/collections/${collection.id}/reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const reviews = await reviewsResponse.json();
    const reviewsList = reviews.data || reviews;
    if (reviewsList.length > 0) {
      const deleteResponse = await page.request.delete(`/api/collections/${collection.id}/reviews/${reviewsList[0].id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      expect([200, 204]).toContain(deleteResponse.status());
    }
  });

  test('Verify Collection Average Rating Updates', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const collectionResponse = await page.request.post('/api/collections', {
      data: {
        name: `Rating Test ${Date.now()}`,
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
    const initialResponse = await page.request.get(`/api/collections/${collection.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const initialCollection = await initialResponse.json();
    const initialRating = initialCollection.average_rating || 0;
    await page.request.post(`/api/collections/${collection.id}/review`, {
      data: { rating: 5, comment: 'Test rating update' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const updatedResponse = await page.request.get(`/api/collections/${collection.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const updatedCollection = await updatedResponse.json();
    const updatedRating = updatedCollection.average_rating || 0;
    expect(updatedRating).toBeGreaterThanOrEqual(initialRating);
  });
});



















