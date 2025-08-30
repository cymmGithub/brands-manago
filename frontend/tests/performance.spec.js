// @ts-check
import {test, expect} from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Performance Tests', () => {
	test('should load page within reasonable time', async({page}) => {
		const startTime = Date.now();

		await page.goto(BASE_URL);

		// Wait for critical elements to load
		await page.waitForSelector('.hero');
		await page.waitForSelector('.nav__logo');

		const loadTime = Date.now() - startTime;

		// Page should load within 3 seconds (adjust as needed)
		expect(loadTime).toBeLessThan(3000);
	});

	test('should load all critical images', async({page}) => {
		await page.goto(BASE_URL);

		// Wait for images to load
		await page.waitForLoadState('networkidle');

		// Check hero images are loaded
		const heroTitleImage = page.locator('.hero__title-image');
		const heroMainImage = page.locator('.hero__image');

		await expect(heroTitleImage).toBeVisible();
		await expect(heroMainImage).toBeVisible();

		// Verify images have loaded successfully (not broken)
		const heroTitleNaturalWidth = await heroTitleImage.evaluate((img) => {
			return img.tagName === 'IMG' ? img['naturalWidth'] : 1;
		});
		const heroMainNaturalWidth = await heroMainImage.evaluate((img) => {
			return img.tagName === 'IMG' ? img['naturalWidth'] : 1;
		});

		expect(heroTitleNaturalWidth).toBeGreaterThan(0);
		expect(heroMainNaturalWidth).toBeGreaterThan(0);
	});

	test('should load external resources successfully', async({page}) => {
		// Track failed requests
		const failedRequests = [];

		page.on('requestfailed', (request) => {
			failedRequests.push(request.url());
		});

		await page.goto(BASE_URL);

		// Wait for all network activity to settle
		await page.waitForLoadState('networkidle');

		// Check that critical external resources loaded successfully
		// (Swiper JS, Google Fonts, etc.)
		const hasSwiper = await page.evaluate(() => typeof window['Swiper'] !== 'undefined');
		expect(hasSwiper).toBe(true);

		// Should have minimal failed requests
		expect(failedRequests.length).toBeLessThan(3);
	});

	test('should handle network delays gracefully', async({page}) => {
		// Simulate slow network
		await page.route('**/*', async(route) => {
			await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
			await route.continue();
		});

		await page.goto(BASE_URL);

		// Page should still be functional despite delays
		await expect(page.locator('.nav__logo')).toBeVisible();
		await expect(page.locator('.hero')).toBeVisible();
	});
});

test.describe('Cross-browser Compatibility', () => {
	test('should work consistently across viewports', async({page}) => {
		const viewports = [
			{width: 1920, height: 1080}, // Desktop Large
			{width: 1366, height: 768}, // Desktop Medium
			{width: 1024, height: 768}, // Tablet Landscape
			{width: 768, height: 1024}, // Tablet Portrait
			{width: 375, height: 667}, // Mobile
		];

		for (const viewport of viewports) {
			await page.setViewportSize(viewport);
			await page.goto(BASE_URL);

			// Core elements should be visible at all viewport sizes
			await expect(page.locator('.nav__logo')).toBeVisible();
			await expect(page.locator('.hero')).toBeVisible();

			// Check appropriate navigation for viewport
			if (viewport.width >= 1024) {
				await expect(page.locator('.nav__menu')).toBeVisible();
			} else {
				await expect(page.locator('.nav__toggle')).toBeVisible();
			}
		}
	});
});
