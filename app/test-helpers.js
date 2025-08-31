/**
 * Test Helpers and Utilities
 * Reusable mocks and utilities for testing the application
 */

/**
 * Mock Order Data
 */
const mockOrders = {
	order1: {
		_id: '507f1f77bcf86cd799439011',
		id: '507f1f77bcf86cd799439011',
		externalId: 'EXT123',
		externalSerialNumber: 'SN123',
		currency: 'EUR',
		status: 'completed',
		orderProductsCost: 299.99,
		orderProducts: [
			{productQuantity: 2},
			{productQuantity: 1},
		],
		externalCreatedAt: new Date('2024-01-01T10:00:00Z'),
		externalUpdatedAt: new Date('2024-01-02T15:30:00Z'),
		createdAt: new Date('2024-01-01T10:00:00Z'),
		updatedAt: new Date('2024-01-02T15:30:00Z'),
	},

	order2: {
		_id: '507f1f77bcf86cd799439012',
		id: '507f1f77bcf86cd799439012',
		externalId: 'EXT456',
		externalSerialNumber: 'SN456',
		currency: 'USD',
		status: 'pending',
		orderProductsCost: 150.00,
		orderProducts: [],
		externalCreatedAt: new Date('2024-01-03T08:00:00Z'),
		externalUpdatedAt: new Date('2024-01-04T16:45:00Z'),
		createdAt: new Date('2024-01-03T08:00:00Z'),
		updatedAt: new Date('2024-01-04T16:45:00Z'),
	},

	orderWithNulls: {
		_id: '507f1f77bcf86cd799439013',
		id: '507f1f77bcf86cd799439013',
		externalId: null,
		externalSerialNumber: 'SN789',
		currency: 'EUR',
		status: 'cancelled',
		orderProductsCost: 0,
		orderProducts: [],
		externalCreatedAt: null,
		externalUpdatedAt: undefined,
		createdAt: new Date('2024-01-05T12:00:00Z'),
		updatedAt: new Date('2024-01-05T12:00:00Z'),
	},
};

/**
 * Create Mock Order Model
 */
function createMockOrderModel(customBehavior = {}) {
	return {
		getAll: async(filters = {}) => {
			if (customBehavior.getAllThrows) {
				throw new Error(customBehavior.getAllThrows);
			}

			if (customBehavior.getAllReturns) {
				return customBehavior.getAllReturns;
			}

			// Default behavior based on filters
			let orders = [mockOrders.order1, mockOrders.order2];

			if (filters.minWorth !== undefined || filters.maxWorth !== undefined) {
				orders = orders.filter(order => {
					const cost = order.orderProductsCost;
					if (filters.minWorth !== undefined && cost < filters.minWorth) return false;
					if (filters.maxWorth !== undefined && cost > filters.maxWorth) return false;
					return true;
				});
			}

			return orders;
		},

		getByExternalSerialNumber: async(serialNumber) => {
			if (customBehavior.getByExternalSerialNumberThrows) {
				throw new Error(customBehavior.getByExternalSerialNumberThrows);
			}

			if (customBehavior.getByExternalSerialNumberReturns !== undefined) {
				return customBehavior.getByExternalSerialNumberReturns;
			}

			// Default behavior
			if (serialNumber === 'SN123') return mockOrders.order1;
			if (serialNumber === 'SN456') return mockOrders.order2;
			if (serialNumber === 'SN789') return mockOrders.orderWithNulls;
			return null;
		},

		getById: async(id) => {
			if (id === '507f1f77bcf86cd799439011') return mockOrders.order1;
			if (id === '507f1f77bcf86cd799439012') return mockOrders.order2;
			return null;
		},

		create: async(orderData) => {
			return {
				...orderData,
				_id: '507f1f77bcf86cd799439999',
				id: '507f1f77bcf86cd799439999',
				createdAt: new Date(),
				updatedAt: new Date(),
			};
		},
	};
}

/**
 * Create Mock Security Middleware
 */
function createMockSecurityMiddleware() {
	return {
		getCSVDownloadMiddleware: () => [
			(req, res, next) => next(), // Mock rate limiter
		],
		getAPISecurityMiddleware: () => [
			(req, res, next) => next(), // Mock API rate limiter
		],
	};
}

/**
 * Create Mock Validators
 */
function createMockValidators(customBehavior = {}) {
	return {
		validateCSVFilters: (req, res, next) => {
			if (customBehavior.validateCSVFiltersFails) {
				return res.status(400).json({
					success: false,
					message: 'Invalid filter parameters',
					errors: customBehavior.validateCSVFiltersFails,
				});
			}

			// Default validation logic
			const {minWorth, maxWorth} = req.query;
			if (minWorth && maxWorth && parseFloat(minWorth) > parseFloat(maxWorth)) {
				return res.status(400).json({
					success: false,
					message: 'Minimum worth cannot be greater than maximum worth',
				});
			}
			next();
		},

		validateExternalSerialNumber: (req, res, next) => {
			if (customBehavior.validateExternalSerialNumberFails) {
				return res.status(400).json({
					success: false,
					message: 'Invalid external serial number',
					errors: customBehavior.validateExternalSerialNumberFails,
				});
			}
			next();
		},

		sanitizeRequest: (req, res, next) => next(),
		checkCSVDownloadLimits: (req, res, next) => next(),
	};
}

/**
 * Setup module mocking for tests
 */
function setupModuleMocks(orderModel, securityMiddleware, validators) {
	const Module = require('module');
	const originalRequire = Module.prototype.require;

	Module.prototype.require = function(id) {
		if (id === '../models/order-model') {
			return orderModel;
		}
		if (id === '../middleware/security-middleware') {
			return securityMiddleware;
		}
		if (id === '../validators/order-validators') {
			return validators;
		}
		return originalRequire.apply(this, arguments);
	};

	return () => {
		Module.prototype.require = originalRequire;
	};
}

/**
 * CSV Test Utilities
 */
const csvUtils = {
	parseCSV: (csvContent) => {
		const lines = csvContent.split('\n').filter(line => line.trim());
		if (lines.length === 0) return [];

		const headers = lines[0].split(',');
		const data = [];

		for (let i = 1; i < lines.length; i++) {
			const values = lines[i].split(',');
			const row = {};
			headers.forEach((header, index) => {
				row[header] = values[index]?.replace(/"/g, '') || '';
			});
			data.push(row);
		}

		return data;
	},

	assertCSVHeaders: (csvContent, expectedHeaders) => {
		const lines = csvContent.split('\n');
		const headers = lines[0].split(',');
		expectedHeaders.forEach(expectedHeader => {
			if (!headers.includes(expectedHeader)) {
				throw new Error(`Expected header '${expectedHeader}' not found in CSV`);
			}
		});
	},

	extractFieldValue: (csvContent, rowIndex, fieldName) => {
		const lines = csvContent.split('\n').filter(line => line.trim());
		if (lines.length <= rowIndex + 1) return null;

		const headers = lines[0].split(',');
		const values = lines[rowIndex + 1].split(',');
		const fieldIndex = headers.indexOf(fieldName);

		if (fieldIndex === -1) return null;
		return values[fieldIndex]?.replace(/"/g, '') || '';
	},

	assertCSVRowCount: (csvContent, expectedCount) => {
		const lines = csvContent.split('\n').filter(line => line.trim());
		const actualCount = lines.length - 1; // Subtract header row
		if (actualCount !== expectedCount) {
			throw new Error(`Expected ${expectedCount} data rows, but got ${actualCount}`);
		}
	},
};

/**
 * Test Data Builders
 */
const builders = {
	order: (overrides = {}) => ({
		...mockOrders.order1,
		...overrides,
	}),

	orderWithProducts: (productCount = 2) => ({
		...mockOrders.order1,
		orderProducts: Array.from({length: productCount}, (_, i) => ({
			productQuantity: i + 1,
		})),
	}),
};

module.exports = {
	mockOrders,
	createMockOrderModel,
	createMockSecurityMiddleware,
	createMockValidators,
	setupModuleMocks,
	csvUtils,
	builders,
};
