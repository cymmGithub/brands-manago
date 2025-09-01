// @ts-check
import {test, expect} from '@playwright/test';

const BASE_URL = 'http://localhost';

test.describe("Forma'Sint Homepage", () => {
	test('should display hero section correctly', async({page}) => {
		await page.goto(BASE_URL);

		// Check hero section elements
		await expect(page.locator('.hero')).toBeVisible();
		await expect(page.locator('.hero__title-image')).toBeVisible();
		await expect(page.locator('.hero__image')).toBeVisible();

		// Check hero image alt text
		await expect(page.locator('.hero__image')).toHaveAttribute(
			'alt',
			/climber.*ice wall.*orange.*gear/i,
		);
	});
});

test.describe('Featured Products Section', () => {
	test('should display featured products section', async({page}) => {
		await page.goto(BASE_URL);

		// Check featured products section
		await expect(page.locator('#featured')).toBeVisible();
		await expect(page.locator('.featured__title')).toContainText(
			'Browse featured',
		);
		await expect(page.locator('.featured__subtitle')).toContainText(
			'FEATURED PRODUCTS',
		);

		// Check Swiper is present
		await expect(page.locator('.swiper')).toBeVisible();
		await expect(page.locator('.swiper-wrapper')).toBeVisible();
	});
});

test.describe('Products Section', () => {
	test('should display products section with controls', async({page}) => {
		await page.goto(BASE_URL);

		// Check products section
		await expect(page.locator('#products')).toBeVisible();
		await expect(page.locator('.products__controls')).toBeVisible();

		// Check pagination dropdown
		await expect(page.locator('.custom-dropdown')).toBeVisible();
		await expect(page.locator('.custom-dropdown__value')).toContainText('14');
		await expect(page.locator('.products__pagination-text')).toContainText(
			'NUMBER OF PRODUCTS PER PAGE:',
		);
	});
});

test.describe('Product Modal', () => {
	test('should have product modal present in DOM', async({page}) => {
		await page.goto(BASE_URL);

		// Check modal exists but is initially hidden
		await expect(page.locator('#product-modal')).toBeAttached();

		// Check modal elements
		await expect(page.locator('.product-modal__close')).toBeAttached();
		await expect(page.locator('#modal-id')).toBeAttached();
		await expect(page.locator('#modal-image')).toBeAttached();
	});
});

test.describe('Navigation Scroll Tests', () => {
	test.beforeEach(async({page}) => {
		await page.goto(BASE_URL);
		// Wait for page to fully load
		await page.waitForLoadState('networkidle');
	});

	test('should scroll to featured products section when clicking featured products nav link', async({
		page,
	}) => {
		// Initially, hero should be in viewport
		await expect(page.locator('.hero')).toBeInViewport();

		// Click on featured products navigation link using data-testid
		await page.getByTestId('nav-featured').click();

		// Wait for scroll animation to complete
		await page.waitForTimeout(1000);

		// Featured products section should now be in viewport
		await expect(page.locator('#featured')).toBeInViewport();

		// Verify the featured products content is visible
		await expect(page.locator('.featured__title')).toBeVisible();
		await expect(page.locator('.featured__subtitle')).toBeVisible();
	});

	test('should scroll to products section when clicking product listing nav link', async({
		page,
	}) => {
		// Initially, hero should be in viewport
		await expect(page.locator('.hero')).toBeInViewport();

		// Click on product listing navigation link using data-testid
		await page.getByTestId('nav-products').click();

		// Wait for scroll animation to complete
		await page.waitForTimeout(1000);

		// Products section should now be in viewport
		await expect(page.locator('#products')).toBeInViewport();

		// Verify the products section content is visible
		await expect(page.locator('.products__controls')).toBeVisible();
		await expect(page.locator('.custom-dropdown')).toBeVisible();
	});

	test('should scroll back to top when clicking home nav link', async({
		page,
	}) => {
		// First scroll to featured products
		await page.getByTestId('nav-featured').click();
		await page.waitForTimeout(1000);
		await expect(page.locator('#featured')).toBeInViewport();

		// Then click home link to scroll back to top using data-testid
		await page.getByTestId('nav-home').click();
		await page.waitForTimeout(1000);

		// Hero section should be back in viewport
		await expect(page.locator('.hero')).toBeInViewport();
		await expect(page.locator('.hero__title-image')).toBeVisible();
	});

	test('should navigate between all sections sequentially', async({
		page,
	}) => {
		// Start at hero (home)
		await expect(page.locator('.hero')).toBeInViewport();

		// Navigate to featured products using data-testid
		await page.getByTestId('nav-featured').click();
		await page.waitForTimeout(1000);
		await expect(page.locator('#featured')).toBeInViewport();

		// Navigate to products section using data-testid
		await page.getByTestId('nav-products').click();
		await page.waitForTimeout(1000);
		await expect(page.locator('#products')).toBeInViewport();

		// Navigate back to home using data-testid
		await page.getByTestId('nav-home').click();
		await page.waitForTimeout(1000);
		await expect(page.locator('.hero')).toBeInViewport();
	});

	test('should maintain navigation state during scroll', async({page}) => {
		// Navigate to featured products using data-testid
		await page.getByTestId('nav-featured').click();
		await page.waitForTimeout(1000);

		// Manually scroll within the page
		await page.evaluate(() => window.scrollBy(0, 100));
		await page.waitForTimeout(500);

		// Navigation should still work from current position using data-testid
		await page.getByTestId('nav-products').click();
		await page.waitForTimeout(1000);
		await expect(page.locator('#products')).toBeInViewport();
	});
});
