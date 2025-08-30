const idosell = require('idosell').default || require('idosell');
const orderModel = require('../models/order-model');

/**
 * External API Service - Handles communication with Idosell API
 */
class ExternalApiService {
	constructor() {
		this.shopUrl = process.env.IDOSELL_SHOP_URL;
		this.apiKey = process.env.IDOSELL_API_KEY;
		this.apiVersion = process.env.IDOSELL_API_VERSION || 'v6';
		this.idosellClient = null;

		this.initializeClient();
	}

	/**
	 * Initialize Idosell client
	 */
	initializeClient() {
		if (!this.shopUrl || !this.apiKey) {
			console.warn('⚠️  Idosell credentials not configured. Set IDOSELL_SHOP_URL and IDOSELL_API_KEY environment variables.');
			return;
		}

		try {
			this.idosellClient = idosell(this.shopUrl, this.apiKey, this.apiVersion);
			console.log('✅ Idosell API client initialized');
		} catch (error) {
			console.error('❌ Failed to initialize Idosell client:', error.message);
		}
	}

	/**
	 * Check if the API client is ready
	 * @returns {boolean} True if client is initialized
	 */
	isReady() {
		return this.idosellClient !== null;
	}

	/**
	 * Download specific orders by their serial numbers
	 * @param {Array<number>} orderSerialNumbers - Array of order serial numbers
	 * @returns {Promise<Array>} Array of downloaded orders
	 */
	async downloadOrdersBySerialNumbers(orderSerialNumbers) {
		if (!this.isReady()) {
			throw new Error('Idosell API client not initialized. Check your credentials.');
		}

		try {
			console.log(`📥 Downloading ${orderSerialNumbers.length} orders from Idosell API...`);

			const orders = await this.idosellClient
				.searchOrders
				.ordersSerialNumbers(orderSerialNumbers)
				.exec();

			console.log(`✅ Successfully downloaded ${orders?.length || 0} orders`);
			return orders || [];
		} catch (error) {
			console.error('❌ Failed to download orders:', error.message);
			throw new Error(`Failed to download orders: ${error.message}`);
		}
	}

	/**
	 * Download orders by date range
	 * @param {string} dateFrom - Start date (YYYY-MM-DD)
	 * @param {string} dateTo - End date (YYYY-MM-DD)
	 * @param {string} dateType - Type of date ('add', 'modify', 'dispatch') - default: 'add'
	 * @returns {Promise<Array>} Array of downloaded orders
	 */
	async downloadOrdersByDateRange(dateFrom, dateTo, dateType = 'add') {
		if (!this.isReady()) {
			throw new Error('Idosell API client not initialized. Check your credentials.');
		}

		try {
			console.log(`📥 Downloading orders from ${dateFrom} to ${dateTo} (${dateType} date)...`);

			const orders = await this.idosellClient
				.searchOrders
				.dates(dateFrom, dateTo, dateType)
				.exec();

			console.log(`✅ Successfully downloaded ${orders?.length || 0} orders`);
			return orders || [];
		} catch (error) {
			console.error('❌ Failed to download orders by date range:', error.message);
			throw new Error(`Failed to download orders: ${error.message}`);
		}
	}

	/**
	 * Download orders with pagination
	 * @param {Object} options - Download options
	 * @param {number} options.page - Page number (default: 1)
	 * @param {number} options.limit - Items per page (default: 50)
	 * @param {string} options.status - Order status filter (optional)
	 * @returns {Promise<Array>} Array of downloaded orders
	 */
	async downloadOrdersWithPagination(options = {}) {
		if (!this.isReady()) {
			throw new Error('Idosell API client not initialized. Check your credentials.');
		}

		const { page = 1, limit = 50, status } = options;

		try {
			console.log(`📥 Downloading orders (page ${page}, limit ${limit})...`);

			let request = this.idosellClient.searchOrders.page(page, limit);

			// Add status filter if provided
			if (status) {
				request = request.status(status);
			}

			const orders = await request.exec();

			console.log(`✅ Successfully downloaded ${orders?.length || 0} orders`);
			return orders || [];
		} catch (error) {
			console.error('❌ Failed to download orders with pagination:', error.message);
			throw new Error(`Failed to download orders: ${error.message}`);
		}
	}

	/**
	 * Transform Idosell order data to our internal format
	 * @param {Object} externalOrder - Order data from Idosell API
	 * @returns {Object} Transformed order data
	 */
	transformOrderData(externalOrder) {
		return {
			externalId: externalOrder.orderSerialNumber?.toString(),
			orderNumber: externalOrder.orderNumber || externalOrder.orderSerialNumber?.toString(),
			customerEmail: externalOrder.customerEmail,
			customerName: `${externalOrder.customerFirstName || ''} ${externalOrder.customerLastName || ''}`.trim(),
			totalAmount: externalOrder.orderGrossValue || externalOrder.orderNetValue || 0,
			currency: externalOrder.orderCurrency || 'PLN',
			status: this.mapOrderStatus(externalOrder.orderStatusId),
			orderDate: externalOrder.orderAddDate ? new Date(externalOrder.orderAddDate) : new Date(),
			items: this.transformOrderItems(externalOrder.orderProducts || []),
			shippingAddress: {
				firstName: externalOrder.deliveryFirstName,
				lastName: externalOrder.deliveryLastName,
				company: externalOrder.deliveryCompanyName,
				street: externalOrder.deliveryStreet,
				city: externalOrder.deliveryCity,
				postalCode: externalOrder.deliveryPostCode,
				country: externalOrder.deliveryCountryName,
				phone: externalOrder.deliveryPhone,
			},
			billingAddress: {
				firstName: externalOrder.customerFirstName,
				lastName: externalOrder.customerLastName,
				company: externalOrder.customerCompanyName,
				street: externalOrder.customerStreet,
				city: externalOrder.customerCity,
				postalCode: externalOrder.customerPostCode,
				country: externalOrder.customerCountryName,
				phone: externalOrder.customerPhone,
			},
			paymentMethod: externalOrder.paymentName,
			shippingMethod: externalOrder.deliveryName,
			notes: externalOrder.orderComment || '',
			externalData: externalOrder, // Store complete external data for reference
		};
	}

	/**
	 * Transform order items from external format
	 * @param {Array} externalItems - Array of order items from external API
	 * @returns {Array} Transformed order items
	 */
	transformOrderItems(externalItems) {
		return externalItems.map(item => ({
			productId: item.productId,
			productCode: item.productCode,
			productName: item.productName,
			quantity: item.orderProductQuantity || 1,
			unitPrice: item.orderProductGrossPrice || item.orderProductNetPrice || 0,
			totalPrice: (item.orderProductQuantity || 1) * (item.orderProductGrossPrice || item.orderProductNetPrice || 0),
			currency: item.orderProductCurrency || 'PLN',
		}));
	}

	/**
	 * Map external order status to internal status
	 * @param {number} externalStatusId - External status ID
	 * @returns {string} Internal status string
	 */
	mapOrderStatus(externalStatusId) {
		const statusMap = {
			1: 'pending',
			2: 'confirmed',
			3: 'processing',
			4: 'shipped',
			5: 'delivered',
			6: 'cancelled',
			7: 'returned',
		};

		return statusMap[externalStatusId] || 'pending';
	}

	/**
	 * Save orders to database
	 * @param {Array} orders - Array of orders to save
	 * @param {Object} options - Save options
	 * @param {boolean} options.updateExisting - Whether to update existing orders (default: true)
	 * @returns {Promise<Object>} Save results
	 */
	async saveOrdersToDatabase(orders, options = {}) {
		const { updateExisting = true } = options;
		const results = {
			total: orders.length,
			created: 0,
			updated: 0,
			skipped: 0,
			errors: []
		};

		for (const externalOrder of orders) {
			try {
				const transformedOrder = this.transformOrderData(externalOrder);

				if (!transformedOrder.externalId) {
					results.skipped++;
					results.errors.push(`Order missing external ID: ${JSON.stringify(externalOrder)}`);
					continue;
				}

				// Check if order already exists
				const existingOrder = await orderModel.getByExternalId(transformedOrder.externalId);

				if (existingOrder) {
					if (updateExisting) {
						await orderModel.updateByExternalId(transformedOrder.externalId, transformedOrder);
						results.updated++;
						console.log(`✅ Updated order: ${transformedOrder.externalId}`);
					} else {
						results.skipped++;
						console.log(`⏭️  Skipped existing order: ${transformedOrder.externalId}`);
					}
				} else {
					await orderModel.create(transformedOrder);
					results.created++;
					console.log(`✅ Created order: ${transformedOrder.externalId}`);
				}
			} catch (error) {
				results.errors.push(`Failed to save order: ${error.message}`);
				console.error(`❌ Failed to save order:`, error.message);
			}
		}

		return results;
	}

	/**
	 * Download and save orders by serial numbers
	 * @param {Array<number>} orderSerialNumbers - Array of order serial numbers
	 * @param {Object} options - Options
	 * @returns {Promise<Object>} Results object
	 */
	async downloadAndSaveOrdersBySerialNumbers(orderSerialNumbers, options = {}) {
		try {
			const {Results, resultsNumberAll} = await this.downloadOrdersBySerialNumbers(orderSerialNumbers);
			const saveResults = await this.saveOrdersToDatabase(Results, options);

			console.log(`📊 Download and save completed:`, saveResults);
			return {
				success: true,
				downloaded: resultsNumberAll,
				...saveResults
			};
		} catch (error) {
			console.error('❌ Download and save failed:', error.message);
			throw error;
		}
	}

	/**
	 * Download and save orders by date range
	 * @param {string} dateFrom - Start date
	 * @param {string} dateTo - End date
	 * @param {Object} options - Options
	 * @returns {Promise<Object>} Results object
	 */
	async downloadAndSaveOrdersByDateRange(dateFrom, dateTo, options = {}) {
		try {
			const { dateType = 'add', ...saveOptions } = options;
			const orders = await this.downloadOrdersByDateRange(dateFrom, dateTo, dateType);
			const saveResults = await this.saveOrdersToDatabase(orders, saveOptions);

			console.log(`📊 Download and save completed:`, saveResults);
			return {
				success: true,
				downloaded: orders.length,
				...saveResults
			};
		} catch (error) {
			console.error('❌ Download and save failed:', error.message);
			throw error;
		}
	}
}

module.exports = ExternalApiService;
