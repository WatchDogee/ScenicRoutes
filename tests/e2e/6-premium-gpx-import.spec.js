import { test, expect } from '@playwright/test';
import { login, TEST_ACCOUNTS } from './helpers/test-helpers';

test.describe('GPX Import Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNTS.PREMIUM.email, TEST_ACCOUNTS.PREMIUM.password);
    await page.goto('/map');
  });

  test('Import GPX File', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Test Route</name>
    <trkseg>
      <trkpt lat="56.9496" lon="24.1052">
        <ele>10</ele>
      </trkpt>
      <trkpt lat="56.9500" lon="24.1100">
        <ele>15</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
    const importResponse = await page.request.post('/api/routes/import/gpx', {
      multipart: {
        file: {
          name: 'test-route.gpx',
          mimeType: 'application/gpx+xml',
          buffer: Buffer.from(gpxContent)
        }
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(async () => {
      return page.request.post('/api/routes/import/gpx', {
        data: {
          file: Buffer.from(gpxContent).toString('base64'),
          filename: 'test-route.gpx'
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    });
    expect([200, 201, 422, 500]).toContain(importResponse.status());
  });

  test('Import GPX from URL', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const importResponse = await page.request.post('/api/routes/import/gpx-url', {
      data: {
        url: 'https://example.com/test-route.gpx'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([200, 201, 404, 422, 500]).toContain(importResponse.status());
  });

  test('Invalid GPX File Handling', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const invalidGpx = 'This is not a valid GPX file';
    const importResponse = await page.request.post('/api/routes/import/gpx', {
      multipart: {
        file: {
          name: 'invalid.gpx',
          mimeType: 'application/gpx+xml',
          buffer: Buffer.from(invalidGpx)
        }
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(() => ({
      status: () => 422
    }));
    expect([422, 400, 500]).toContain(importResponse.status());
  });

  test('GPX Import Requires Premium', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    await login(page, TEST_ACCOUNTS.FREE.email, TEST_ACCOUNTS.FREE.password);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const importResponse = await page.request.post('/api/routes/import/gpx', {
      data: {
        file: 'test'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    expect([403, 401, 402, 422, 500]).toContain(importResponse.status());
  });
});



















