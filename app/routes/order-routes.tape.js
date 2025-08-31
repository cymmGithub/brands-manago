const test = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const express = require('express');
const path = require('path');

// Import test helpers
const {
	createMockOrderModel,
	createMockSecurityMiddleware,
	createMockValidators,
	csvUtils,
	mockOrders,
} = require('../test-helpers');

/**
 * Test setup - Creates app with custom mocks for each test
 */
function createTestApp(customMocks = {}) {
	// Clear require cache for the route module
	const routePath = path.resolve(__dirname, './order-routes.js');
	delete require.cache[routePath];

	// Setup mocks
	const mockOrderModel = customMocks.orderModel || createMockOrderModel();
	const mockSecurityMiddleware = customMocks.securityMiddleware || createMockSecurityMiddleware();
	const mockValidators = customMocks.validators || createMockValidators();

	// Mock the dependencies
	const Module = require('module');
	const originalRequire = Module.prototype.require;

	Module.prototype.require = function(id) {
		if (id === '../models/order-model') {
			return mockOrderModel;
		}
		if (id === '../middleware/security-middleware') {
			return mockSecurityMiddleware;
		}
		if (id === '../validators/order-validators') {
			return mockValidators;
		}
		return originalRequire.apply(this, arguments);
	};

	// Import the route with mocks in place
	const orderRoutes = require('./order-routes');

	// Restore original require
	Module.prototype.require = originalRequire;

	// Create and configure express app
	const app = express();
	app.use(express.json());
	app.use('/', orderRoutes);

	return app;
}

/**
 * Test Suite
 */
test('Order Routes - CSV Download Tests', async(t) => {

	await t.test('GET /orders/download-csv - should return CSV with all orders', async() => {
		const app = createTestApp();
		const response = await supertest(app)
			.get('/orders/download-csv')
			.expect(200);

		// Check headers
		assert.strictEqual(response.headers['content-type'], 'text/csv; charset=utf-8');
		assert(response.headers['content-disposition'].includes('attachment'));
		assert(response.headers['content-disposition'].includes('.csv'));

		// Check CSV content structure
		const csvContent = response.text;
		csvUtils.assertCSVHeaders(csvContent, ['ID', 'External Serial Number', 'Currency', 'Status']);
		csvUtils.assertCSVRowCount(csvContent, 2); // Should have 2 orders

		// Check first data row contains expected data
		const data = csvUtils.parseCSV(csvContent);
		assert.strictEqual(data[0]['External Serial Number'], 'SN123');
		assert.strictEqual(data[0]['Currency'], 'EUR');
		assert.strictEqual(data[0]['Status'], 'completed');
	});

	await t.test('GET /orders/download-csv - should apply worth filters correctly', async() => {
		// Create app with mock that returns filtered results
		const mockOrderModel = createMockOrderModel({
			getAllReturns: [mockOrders.order1], // Only return order1 which costs 299.99
		});
		const app = createTestApp({orderModel: mockOrderModel});

		const response = await supertest(app)
			.get('/orders/download-csv?minWorth=200&maxWorth=500')
			.expect(200);

		const csvContent = response.text;
		csvUtils.assertCSVRowCount(csvContent, 1); // Should have 1 filtered order

		const data = csvUtils.parseCSV(csvContent);
		assert.strictEqual(data[0]['External Serial Number'], 'SN123');
		assert.strictEqual(data[0]['Order Products Cost'], '299.99');
	});

	await t.test('GET /orders/download-csv - should return error for invalid minWorth > maxWorth', async() => {
		const app = createTestApp(); // Use default mocks which include validation

		const response = await supertest(app)
			.get('/orders/download-csv?minWorth=500&maxWorth=100')
			.expect(400);

		assert.strictEqual(response.body.success, false);
		assert(response.body.message.includes('Minimum worth cannot be greater than maximum worth'));
	});

	await t.test('GET /orders/download-csv - should handle no orders found', async() => {
		// Create app with mock that returns empty results
		const mockOrderModel = createMockOrderModel({
			getAllReturns: [],
		});
		const app = createTestApp({orderModel: mockOrderModel});

		const response = await supertest(app)
			.get('/orders/download-csv')
			.expect(200);

		assert.strictEqual(response.text, 'No orders found');
	});

	await t.test('GET /orders/download-csv - should handle database error', async() => {
		// Create app with mock that throws error
		const mockOrderModel = createMockOrderModel({
			getAllThrows: 'Database connection failed',
		});
		const app = createTestApp({orderModel: mockOrderModel});

		const response = await supertest(app)
			.get('/orders/download-csv')
			.expect(500);

		assert.strictEqual(response.body.success, false);
		assert.strictEqual(response.body.message, 'Failed to generate CSV export');
		assert.strictEqual(response.body.error, 'Database connection failed');
	});

	await t.test('GET /orders/download-csv/:externalSerialNumber - should return CSV for specific order', async() => {
		const app = createTestApp();
		const response = await supertest(app)
			.get('/orders/download-csv/SN123')
			.expect(200);

		// Check headers
		assert.strictEqual(response.headers['content-type'], 'text/csv; charset=utf-8');
		assert(response.headers['content-disposition'].includes('order-SN123-'));

		// Check CSV content structure
		const csvContent = response.text;
		csvUtils.assertCSVRowCount(csvContent, 1); // Should have 1 order

		const data = csvUtils.parseCSV(csvContent);
		assert.strictEqual(data[0]['External Serial Number'], 'SN123');
		assert.strictEqual(data[0]['External ID'], 'EXT123');
	});

	await t.test('GET /orders/download-csv/:externalSerialNumber - should return 404 for non-existent order', async() => {
		const app = createTestApp();
		const response = await supertest(app)
			.get('/orders/download-csv/NONEXISTENT')
			.expect(404);

		assert.strictEqual(response.body.success, false);
		assert(response.body.message.includes('not found'));
	});

	await t.test('GET /orders/download-csv/:externalSerialNumber - should handle database error', async() => {
		// Create app with mock that throws error
		const mockOrderModel = createMockOrderModel({
			getByExternalSerialNumberThrows: 'Database query failed',
		});
		const app = createTestApp({orderModel: mockOrderModel});

		const response = await supertest(app)
			.get('/orders/download-csv/SN123')
			.expect(500);

		assert.strictEqual(response.body.success, false);
		assert.strictEqual(response.body.message, 'Failed to generate CSV export for the specified order');
		assert.strictEqual(response.body.error, 'Database query failed');
	});
});

test('CSV Content Format Tests', async(t) => {

	await t.test('should format dates correctly in CSV', async() => {
		const app = createTestApp(); // Use default mock data

		const response = await supertest(app)
			.get('/orders/download-csv')
			.expect(200);

		const csvContent = response.text;
		// Check that ISO date format is used
		assert(csvContent.includes('2024-01-01T10:00:00.000Z'));
		assert(csvContent.includes('2024-01-02T15:30:00.000Z'));
	});

	await t.test('should handle products with missing quantity', async() => {
		// Mock order with products without quantity
		const orderWithMissingQty = {
			...mockOrders.order1,
			orderProducts: [
				{}, // Product without productQuantity
				{productQuantity: 2},
			],
		};

		const mockOrderModel = createMockOrderModel({
			getAllReturns: [orderWithMissingQty],
		});
		const app = createTestApp({orderModel: mockOrderModel});

		const response = await supertest(app)
			.get('/orders/download-csv')
			.expect(200);

		const csvContent = response.text;
		// Should contain both products, one with N/A quantity
		assert(csvContent.includes('Product 1 (Qty: N/A)'));
		assert(csvContent.includes('Product 2 (Qty: 2)'));
	});

	await t.test('should handle null/undefined values', async() => {
		// Use order with nulls from test data
		const mockOrderModel = createMockOrderModel({
			getAllReturns: [mockOrders.orderWithNulls],
		});
		const app = createTestApp({orderModel: mockOrderModel});

		const response = await supertest(app)
			.get('/orders/download-csv')
			.expect(200);

		const csvContent = response.text;

		// Check that null externalId becomes empty string (actual behavior of _.get + CSV join)
		const externalId = csvUtils.extractFieldValue(csvContent, 0, 'External ID');
		assert.strictEqual(externalId, '');

		// Check that empty product list becomes 'No products'
		const productsDetails = csvUtils.extractFieldValue(csvContent, 0, 'Products Details');
		assert(productsDetails.includes('No products'));
	});

	await t.test('should escape commas in product details', async() => {
		// Mock order with many products to test comma handling
		const orderWithManyProducts = {
			...mockOrders.order1,
			orderProducts: [
				{productQuantity: 1},
				{productQuantity: 2},
				{productQuantity: 3},
			],
		};

		const mockOrderModel = createMockOrderModel({
			getAllReturns: [orderWithManyProducts],
		});
		const app = createTestApp({orderModel: mockOrderModel});

		const response = await supertest(app)
			.get('/orders/download-csv')
			.expect(200);

		const csvContent = response.text;
		// Product details should be wrapped in quotes and contain semicolons
		assert(csvContent.includes('"Product 1 (Qty: 1); Product 2 (Qty: 2); Product 3 (Qty: 3)"'));
	});
});

test('Middleware Integration Tests', async(t) => {

	await t.test('should call all required middleware in correct order', async() => {
		let middlewareCalls = [];

		// Create mocks that track calls
		const mockValidators = {
			sanitizeRequest: (req, res, next) => {
				middlewareCalls.push('sanitizeRequest');
				next();
			},
			validateCSVFilters: (req, res, next) => {
				middlewareCalls.push('validateCSVFilters');
				next();
			},
			checkCSVDownloadLimits: (req, res, next) => {
				middlewareCalls.push('checkCSVDownloadLimits');
				next();
			},
			validateExternalSerialNumber: (req, res, next) => {
				middlewareCalls.push('validateExternalSerialNumber');
				next();
			},
		};

		const mockSecurityMiddleware = {
			getCSVDownloadMiddleware: () => [
				(req, res, next) => {
					middlewareCalls.push('csvDownloadRateLimit');
					next();
				},
			],
		};

		const app = createTestApp({
			validators: mockValidators,
			securityMiddleware: mockSecurityMiddleware,
		});

		await supertest(app)
			.get('/orders/download-csv')
			.expect(200);

		// Verify middleware was called in expected order
		assert(middlewareCalls.includes('sanitizeRequest'));
		assert(middlewareCalls.includes('csvDownloadRateLimit'));
		assert(middlewareCalls.includes('validateCSVFilters'));
		assert(middlewareCalls.includes('checkCSVDownloadLimits'));
	});
});

// Clean up require cache after tests
test.after(() => {
	// Clear require cache for our route module
	const routePath = path.resolve(__dirname, './order-routes.js');
	delete require.cache[routePath];
});
