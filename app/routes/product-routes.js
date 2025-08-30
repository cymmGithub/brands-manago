const express = require('express');
const productModel = require('../models/product-model');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/products - Get all products with optional filters
 */
router.get('/products', async (req, res) => {
	try {
		const products = await productModel.getAll(req.query);
		const count = await productModel.getCount(req.query);

		res.json({
			success: true,
			count: products.length,
			total: count,
			data: products,
		});
	} catch (error) {
		console.error('Error fetching products:', error);
		res.status(500).json({
			success: false,
			error: config.env === 'development' ? error.message : undefined,
			error: config.env === 'development' ? error.message : undefined,
		});
	}
});

/**
 * GET /api/products/:id - Get product by ID
 */
router.get('/products/:id', async (req, res) => {
	try {
		const product = await productModel.getById(req.params.id);

		if (!product) {
			return res.status(404).json({
				success: false,
				message: 'Product not found',
			});
		}

		res.json({
			success: true,
			data: product,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: config.env === 'development' ? error.message : undefined,
		});
	}
});

/**
 * POST /api/products - Create a new product
 */
router.post('/products', async (req, res) => {
	try {
		const { name, price } = req.body;

		if (!name || !price) {
			return res.status(400).json({
				success: false,
				message: 'Name and price are required',
			});
		}

		const newProduct = await productModel.create(req.body);

		res.status(201).json({
			success: true,
			message: 'Product created successfully',
			data: newProduct,
		});
	} catch (error) {
		console.error('Error creating product:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: config.env === 'development' ? error.message : undefined,
		});
	}
});

/**
 * PUT /api/products/:id - Update a product
 */
router.put('/products/:id', async (req, res) => {
	try {
		const updatedProduct = await productModel.update(req.params.id, req.body);

		if (!updatedProduct) {
			return res.status(404).json({
				success: false,
				message: 'Product not found',
			});
		}

		res.json({
			success: true,
			message: 'Product updated successfully',
			data: updatedProduct,
		});
	} catch (error) {
		console.error('Error updating product:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: process.env.NODE_ENV === 'development' ? error.message : undefined,
		});
	}
});

/**
 * DELETE /api/products/:id - Delete a product
 */
router.delete('/products/:id', async (req, res) => {
	try {
		const deleted = await productModel.delete(req.params.id);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: 'Product not found',
			});
		}

		res.json({
			success: true,
			message: 'Product deleted successfully',
		});
	} catch (error) {
		console.error('Error deleting product:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: process.env.NODE_ENV === 'development' ? error.message : undefined,
		});
	}
});

module.exports = router;
