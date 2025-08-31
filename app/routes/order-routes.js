const express = require('express');
const orderModel = require('../models/order-model');
const ExternalApiService = require('../services/external-api-service');

const router = express.Router();
const externalApiService = new ExternalApiService();

/**
 * GET /api/orders
 * Get all orders with optional filters
 */
router.get('/orders', async(req, res) => {
	try {
		const filters = {
			status: req.query.status,
			dateFrom: req.query.dateFrom,
			dateTo: req.query.dateTo,
			limit: req.query.limit,
		};

		// Remove undefined filters
		Object.keys(filters).forEach(key => {
			if (filters[key] === undefined) {
				delete filters[key];
			}
		});

		const orders = await orderModel.getAll(filters);
		const totalCount = await orderModel.getCount(filters);

		res.json({
			success: true,
			data: orders,
			total: totalCount,
			filters: filters,
		});
	} catch (error) {
		console.error('Error fetching orders:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to fetch orders',
			error: error.message,
		});
	}
});


/**
 * GET /api/orders/download/status
 * Check external API service status
 */
router.get('/orders/download/status', (req, res) => {
	try {
		const isReady = externalApiService.isReady();

		res.json({
			success: true,
			data: {
				ready: isReady,
				shopUrl: process.env.IDOSELL_SHOP_URL ? '***configured***' : 'not configured',
				apiKey: process.env.IDOSELL_API_KEY ? '***configured***' : 'not configured',
				apiVersion: externalApiService.apiVersion,
			},
		});
	} catch (error) {
		console.error('Error checking external API status:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to check external API status',
			error: error.message,
		});
	}
});

/**
 * POST /api/orders
 * Create a new order manually
 */
router.post('/orders', async(req, res) => {
	try {
		const order = await orderModel.create(req.body);

		res.status(201).json({
			success: true,
			message: 'Order created successfully',
			data: order,
		});
	} catch (error) {
		console.error('Error creating order:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to create order',
			error: error.message,
		});
	}
});

/**
 * PUT /api/orders/:id
 * Update an order
 */
router.put('/orders/:id', async(req, res) => {
	try {
		const order = await orderModel.update(req.params.id, req.body);

		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found',
			});
		}

		res.json({
			success: true,
			message: 'Order updated successfully',
			data: order,
		});
	} catch (error) {
		console.error('Error updating order:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to update order',
			error: error.message,
		});
	}
});

/**
 * DELETE /api/orders/:id
 * Delete an order
 */
router.delete('/orders/:id', async(req, res) => {
	try {
		const deleted = await orderModel.delete(req.params.id);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: 'Order not found',
			});
		}

		res.json({
			success: true,
			message: 'Order deleted successfully',
		});
	} catch (error) {
		console.error('Error deleting order:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to delete order',
			error: error.message,
		});
	}
});

module.exports = router;
