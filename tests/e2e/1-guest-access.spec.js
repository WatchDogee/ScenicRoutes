import { test, expect } from '@playwright/test';

/**
 * SECTION 1: GUEST USER (UNAUTHENTICATED) TESTS
 */

test.describe('Guest Access Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1.1: Homepage & Navigation', async ({ page }) => {
    // Check logo is visible
    const logo = page.locator('text=ScenicRoutes').first();
    await expect(logo).toBeVisible();

    // Check navigation elements
    const premiumButton = page.locator('button:has-text("Premium"), a:has-text("Premium")').first();
    const premiumVisible = await premiumButton.isVisible().catch(() => false);
    expect(premiumVisible).toBeTruthy();
  });

  test('1.2: Map Access', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if map container exists
    const mapContainer = page.locator('.leaflet-container').first();
    const mapVisible = await mapContainer.isVisible().catch(() => false);
    expect(mapVisible).toBeTruthy();
  });

  test('1.3: Route Planning UI', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for route planning elements
    const planButton = page.locator('button:has-text("Plan"), button:has-text("Route")').first();
    const planVisible = await planButton.isVisible().catch(() => false);
    expect(planVisible).toBeTruthy();
  });

  test('1.4: Social Hub Access', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for social hub button
    const socialButton = page.locator('button:has-text("Social"), a:has-text("Social"), button:has-text("Community")').first();
    const socialVisible = await socialButton.isVisible().catch(() => false);
    expect(socialVisible).toBeTruthy();
  });
});



















