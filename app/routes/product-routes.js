const express = require('express');
const productModel = require('../models/product-model');

const router = express.Router();

router.get('/products', (req, res) => {
	const products = productModel.getAll(req.query);

	res.json({
		success: true,
		count: products.length,
		data: products,
	});
});

router.get('/products/:id', (req, res) => {
	const product = productModel.getById(req.params.id);

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
});

router.post('/products', (req, res) => {
	const {name, price} = req.body;

	if (!name || !price) {
		return res.status(400).json({
			success: false,
			message: 'Name and price are required',
		});
	}

	const newProduct = productModel.create(req.body);

	res.status(201).json({
		success: true,
		message: 'Product created successfully',
		data: newProduct,
	});
});

module.exports = router;
