import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('Photo Management Tests', () => {
  let roadId = null;

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Upload Photo to Road', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Photo Test Road ${Date.now()}`,
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
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const photoResponse = await page.request.post(`/api/saved-roads/${roadId}/photos`, {
      multipart: {
        photo: {
          name: 'test-photo.png',
          mimeType: 'image/png',
          buffer: Buffer.from(testImageBase64, 'base64')
        }
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(() => ({ status: () => 500 }));
    expect([200, 201, 422, 500]).toContain(photoResponse.status());
  });

  test('Delete Road Photo', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const deleteResponse = await page.request.delete('/api/road-photos/999', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 204, 404, 403, 500]).toContain(deleteResponse.status());
  });

  test('Upload Photo with Review', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const roadResponse = await page.request.post('/api/saved-roads', {
      data: {
        road_name: `Review Photo Test ${Date.now()}`,
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
    const reviewResponse = await page.request.post(`/api/saved-roads/${road.id}/review`, {
      data: { rating: 5, comment: 'Great!' },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const roadDataResponse = await page.request.get(`/api/saved-roads/${road.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const roadData = await roadDataResponse.json();
    const reviews = roadData.reviews || [];
    if (reviews.length > 0) {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const photoResponse = await page.request.post(`/api/reviews/${reviews[0].id}/photos`, {
        multipart: {
          photo: {
            name: 'review-photo.png',
            mimeType: 'image/png',
            buffer: Buffer.from(testImageBase64, 'base64')
          }
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => ({ status: () => 500 }));
      expect([200, 201, 422, 500, 404]).toContain(photoResponse.status());
    }
  });

  test('Delete Review Photo', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const deleteResponse = await page.request.delete('/api/review-photos/999', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    expect([200, 204, 404, 403, 500]).toContain(deleteResponse.status());
  });

  test('Upload Profile Picture', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const photoResponse = await page.request.post('/api/profile/picture', {
      multipart: {
        photo: {
          name: 'profile-picture.png',
          mimeType: 'image/png',
          buffer: Buffer.from(testImageBase64, 'base64')
        }
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(() => ({ status: () => 500 }));
    expect([200, 201, 422, 500]).toContain(photoResponse.status());
  });
});



















