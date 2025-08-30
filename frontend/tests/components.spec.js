// @ts-check
import {test, expect} from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('UI Components Tests', () => {
	test.beforeEach(async({page}) => {
		await page.goto(BASE_URL);
	});

	test.describe('Custom Dropdown Component', () => {
		test('should select dropdown options correctly', async({page}) => {
			const trigger = page.locator('.custom-dropdown__trigger');
			const valueDisplay = page.locator('.custom-dropdown__value');

			// Initial value should be 14
			await expect(valueDisplay).toContainText('14');

			// Open dropdown and select 18
			await trigger.click();
			await page.locator('[data-value="18"]').click();

			// Verify selection
			await expect(valueDisplay).toContainText('18');
			await expect(page.locator('.custom-dropdown__list')).not.toBeVisible();
		});

		test('should handle keyboard navigation in dropdown', async({page}) => {
			const trigger = page.locator('.custom-dropdown__trigger');

			// Focus and open dropdown with keyboard
			await trigger.focus();
			await page.keyboard.press('Enter');
			await expect(page.locator('.custom-dropdown__list')).toBeVisible();

			// Navigate with arrow keys (if implemented)
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('Enter');

			// Dropdown should close after selection
			await expect(page.locator('.custom-dropdown__list')).not.toBeVisible();
		});

		test('should close dropdown when clicking outside', async({page}) => {
			const trigger = page.locator('.custom-dropdown__trigger');
			const list = page.locator('.custom-dropdown__list');

			// Open dropdown
			await trigger.click();
			await expect(list).toBeVisible();

			// Click outside
			await page.locator('body').click();
			await expect(list).not.toBeVisible();
		});
	});

	test.describe('Product Modal Component', () => {
		test('should have modal in correct initial state', async({page}) => {
			const modal = page.locator('#product-modal');

			// Modal should exist but not be visible initially
			await expect(modal).toBeAttached();
			await expect(modal).not.toHaveAttribute('open');
		});

		test('should have proper modal structure', async({page}) => {
			// Check all modal elements exist
			await expect(page.locator('#modal-id')).toBeAttached();
			await expect(page.locator('#modal-image')).toBeAttached();
			await expect(page.locator('.product-modal__close')).toBeAttached();

			// Check modal image has proper attributes
			const modalImage = page.locator('#modal-image');
			await expect(modalImage).toHaveAttribute('src');
			await expect(modalImage).toHaveAttribute('alt');
		});
	});

	test.describe('Developer Credits Section', () => {
		test('should display developer information', async({page}) => {
			// Check developer link is visible
			await expect(page.locator('.nav__developer-link')).toBeVisible();
			await expect(page.locator('.nav__developer-link')).toContainText('FRONTEND DEVELOPER');

			// Check developer icon
			await expect(page.locator('.nav__developer-icon')).toBeVisible();
			await expect(page.locator('.nav__developer-icon')).toHaveAttribute('alt', 'User profile icon');
		});

		test('should display IDOMODS credit', async({page}) => {
			const idomodsLink = page.locator('.nav__idomods a');

			await expect(idomodsLink).toBeVisible();
			await expect(idomodsLink).toContainText('IDOMODS');
			await expect(idomodsLink).toHaveAttribute('href', 'https://idomods.pl/');
			await expect(idomodsLink).toHaveAttribute('target', '_blank');
			await expect(idomodsLink).toHaveAttribute('rel', 'noopener noreferrer');
		});
	});
});
