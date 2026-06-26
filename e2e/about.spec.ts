import { test, expect } from '@playwright/test';

test('about page has correct title', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toContainText('About Us');
});