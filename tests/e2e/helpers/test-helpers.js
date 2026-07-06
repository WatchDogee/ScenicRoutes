/**
 * Test Helper Functions
 */

export const TEST_ACCOUNTS = {
  FREE: {
    email: 'test_free@example.com',
    password: 'Password123!'
  },
  PREMIUM: {
    email: 'test_premium@example.com',
    password: 'Password123!'
  },
  PRO: {
    email: 'test_pro@example.com',
    password: 'Password123!'
  }
};

/**
 * Login helper function
 */
export async function login(page, email, password) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Get CSRF token from meta tag
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  const baseURL = process.env.APP_URL || 'http://127.0.0.1:8000';

  // Login via API using page.request
  const response = await page.request.post(`${baseURL}/api/login`, {
    data: {
      login: email,
      password: password
    },
    headers: {
      'X-CSRF-TOKEN': csrfToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }).catch(() => null);

  if (response && response.ok()) {
    const data = await response.json().catch(() => ({}));
    const token = data.token || data.data?.token;
    if (token) {
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, token);
      await page.waitForTimeout(1000);
      return true;
    }
  }

  return false;
}

/**
 * Logout helper function
 */
export async function logout(page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for map to load
 */
export async function waitForMapLoad(page) {
  await page.waitForSelector('.leaflet-container', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

/**
 * Check if element is visible
 */
export async function isVisible(page, selector) {
  try {
    const element = page.locator(selector).first();
    return await element.isVisible({ timeout: 5000 });
  } catch {
    return false;
  }
}

