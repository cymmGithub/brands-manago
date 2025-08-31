const express = require('express');
const _ = require('lodash');
const orderModel = require('../models/order-model');
const {getCSVDownloadMiddleware} = require('../middleware/security-middleware');
const {
	validateCSVFilters,
	validateExternalSerialNumber,
	sanitizeRequest,
	checkCSVDownloadLimits,
} = require('../validators/order-validators');

const router = express.Router();

/**
 * Helper function to convert array of objects to CSV format
 * @param {Array} data - Array of order objects
 * @returns {string} CSV formatted string
 */
function convertToCSV(data) {
	if (_.isEmpty(data)) {
		return 'No orders found';
	}

	// Define CSV headers based on order structure
	const headers = [
		'ID',
		'External ID',
		'External Serial Number',
		'Currency',
		'Status',
		'Order Products Cost',
		'Products Count',
		'Products Details',
		'External Created At',
		'External Updated At',
		'Created At',
		'Updated At',
	];

	// Create CSV content
	const csvRows = [];
	csvRows.push(_.join(headers, ','));

	const formatDate = (date) => {
		return _.isNil(date) ? 'N/A' : new Date(date).toISOString();
	};

	const formatProductDetails = (products) => {
		if (_.isEmpty(products)) {
			return 'No products';
		}
		return _.join(
			_.map(products, (p, index) => `Product ${index + 1} (Qty: ${_.get(p, 'productQuantity', 'N/A')})`),
			'; ',
		);
	};

	_.forEach(data, order => {
		const productsCount = _.size(_.get(order, 'orderProducts', []));
		const productsDetails = formatProductDetails(_.get(order, 'orderProducts'));

		// Create row data array with safe property access
		const row = [
			_.get(order, 'id', 'N/A'),
			_.get(order, 'externalId', 'N/A'),
			_.get(order, 'externalSerialNumber', 'N/A'),
			_.get(order, 'currency', 'N/A'),
			_.get(order, 'status', 'N/A'),
			_.get(order, 'orderProductsCost', 'N/A'),
			productsCount,
			`"${productsDetails}"`, // Wrap in quotes to handle commas in product details
			formatDate(_.get(order, 'externalCreatedAt')),
			formatDate(_.get(order, 'externalUpdatedAt')),
			formatDate(_.get(order, 'createdAt')),
			formatDate(_.get(order, 'updatedAt')),
		];

		csvRows.push(_.join(row, ','));
	});

	return _.join(csvRows, '\n');
}

router.get('/orders/download-csv',
	sanitizeRequest,
	...getCSVDownloadMiddleware(),
	validateCSVFilters,
	checkCSVDownloadLimits,
	async(req, res) => {
		try {
			console.log('CSV download request received');

			// Extract filter parameters from query
			const filters = {};

			if (req.query.minWorth !== undefined) {
				const minWorth = parseFloat(req.query.minWorth);
				if (!_.isNaN(minWorth) && minWorth >= 0) {
					filters.minWorth = minWorth;
				}
			}

			if (req.query.maxWorth !== undefined) {
				const maxWorth = parseFloat(req.query.maxWorth);
				if (!_.isNaN(maxWorth) && maxWorth >= 0) {
					filters.maxWorth = maxWorth;
				}
			}

			// Validate filter logic
			if (filters.minWorth !== undefined && filters.maxWorth !== undefined) {
				if (filters.minWorth > filters.maxWorth) {
					return res.status(400).json({
						success: false,
						message: 'Minimum worth cannot be greater than maximum worth',
					});
				}
			}

			const filterCount = _.size(filters);
			if (filterCount > 0) {
				console.log(`Applying ${filterCount} filter(s):`, filters);
			}

			// Get orders with filters
			const orders = await orderModel.getAll(filters);

			console.log(`Found ${orders.length} orders for CSV export`);

			// Convert to CSV format
			const csvContent = convertToCSV(orders);

			// Generate filename with current timestamp and filter indication
			const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
			const filterSuffix = filterCount > 0 ? '-filtered' : '';
			const filename = `orders-export${filterSuffix}-${timestamp}.csv`;

			// Set headers for file download
			res.setHeader('Content-Type', 'text/csv; charset=utf-8');
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
			res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
			res.setHeader('Pragma', 'no-cache');
			res.setHeader('Expires', '0');

			// Send CSV content
			res.send(csvContent);

			console.log(`CSV file "${filename}" sent successfully`);
		} catch (error) {
			console.error('Error generating CSV export:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to generate CSV export',
				error: error.message,
			});
		}
	});

router.get('/orders/download-csv/:externalSerialNumber',
	sanitizeRequest,
	...getCSVDownloadMiddleware(),
	validateExternalSerialNumber,
	async(req, res) => {
		try {
			const {externalSerialNumber} = req.params;
			// Input is already validated by middleware

			console.log(`CSV download request received for order: ${externalSerialNumber}`);

			// Get the specific order by external serial number
			const order = await orderModel.getByExternalSerialNumber(externalSerialNumber);

			if (!order) {
				return res.status(404).json({
					success: false,
					message: `Order with external serial number '${externalSerialNumber}' not found`,
				});
			}

			console.log(`Found order for CSV export: ${order.id}`);

			// Convert to CSV format (pass as array since convertToCSV expects an array)
			const csvContent = convertToCSV([order]);

			// Generate filename with order serial number and timestamp
			const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
			const filename = `order-${externalSerialNumber}-${timestamp}.csv`;

			// Set headers for file download
			res.setHeader('Content-Type', 'text/csv; charset=utf-8');
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
			res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
			res.setHeader('Pragma', 'no-cache');
			res.setHeader('Expires', '0');

			// Send CSV content
			res.send(csvContent);

			console.log(`CSV file "${filename}" sent successfully`);
		} catch (error) {
			console.error('Error generating single order CSV export:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to generate CSV export for the specified order',
				error: error.message,
			});
		}
	});

module.exports = router;
