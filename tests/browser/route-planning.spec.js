const { test, expect } = require('@playwright/test');

test.describe('Route Planning with Saved Roads', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to map page
        await page.goto('http://localhost:5173/map');
        
        // Wait for page to load
        await page.waitForSelector('[data-testid="route-planner"]', { timeout: 10000 });
    });

    test('should route through saved roads', async ({ page }) => {
        // Login if needed
        const loginButton = page.locator('text=Login').first();
        if (await loginButton.isVisible()) {
            await loginButton.click();
            // Add login steps here
        }

        // Open route planner
        const routePlannerButton = page.locator('button:has-text("Plan Route")').first();
        await routePlannerButton.click();

        // Set start point
        await page.fill('input[placeholder*="Start"]', 'Riga, Latvia');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Set end point
        await page.fill('input[placeholder*="End"]', 'Jelgava, Latvia');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Select a saved road
        const savedRoadsSection = page.locator('text=Saved Roads').first();
        if (await savedRoadsSection.isVisible()) {
            const firstSavedRoad = page.locator('[data-testid="saved-road"]').first();
            await firstSavedRoad.click();
        }

        // Calculate route
        const searchButton = page.locator('button:has-text("Search Routes")').first();
        await searchButton.click();

        // Wait for route calculation
        await page.waitForTimeout(5000);

        // Check console for errors
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Verify route is displayed
        const routeLine = page.locator('path.leaflet-interactive').first();
        await expect(routeLine).toBeVisible({ timeout: 10000 });

        // Check logs
        console.log('Console errors:', errors);
        expect(errors.length).toBe(0);
    });

    test('should calculate round trip', async ({ page }) => {
        // Open route planner
        const routePlannerButton = page.locator('button:has-text("Plan Route")').first();
        await routePlannerButton.click();

        // Enable round trip
        const roundTripToggle = page.locator('input[type="checkbox"]').first();
        await roundTripToggle.check();

        // Set start point
        await page.fill('input[placeholder*="Start"]', 'Riga, Latvia');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Calculate round trip
        const calculateButton = page.locator('button:has-text("Calculate Round Trip")').first();
        await calculateButton.click();

        // Wait for calculation
        await page.waitForTimeout(10000);

        // Check for errors
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Verify round trip route
        const routeLine = page.locator('path.leaflet-interactive').first();
        await expect(routeLine).toBeVisible({ timeout: 15000 });

        console.log('Round trip errors:', errors);
        expect(errors.filter(e => e.includes('404')).length).toBe(0);
    });
});
