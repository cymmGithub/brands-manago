const idosell = require('idosell').default || require('idosell');
const orderModel = require('../models/order-model');
const ProgressBar = require('progress');
const _ = require('lodash');

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
			console.warn('Warning: Idosell credentials not configured. Set IDOSELL_SHOP_URL and IDOSELL_API_KEY environment variables.');
			return;
		}

		try {
			this.idosellClient = idosell(this.shopUrl, this.apiKey, this.apiVersion);
			console.log('Idosell API client initialized');
		} catch (error) {
			console.error('Failed to initialize Idosell client:', error.message);
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

		if (!_.isArray(orderSerialNumbers) || _.isEmpty(orderSerialNumbers)) {
			throw new Error('orderSerialNumbers must be a non-empty array');
		}

		try {
			console.log(`Downloading ${orderSerialNumbers.length} orders from Idosell API...`);

			const {Results, resultsNumberAll} = await this.idosellClient
				.searchOrders
				.ordersSerialNumbers(orderSerialNumbers)
				.exec();

			console.log(`Successfully downloaded ${resultsNumberAll || 0} orders`);
			return Results || [];
		} catch (error) {
			console.error('Failed to download orders:', error.message);
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

		if (_.isEmpty(dateFrom) || _.isEmpty(dateTo)) {
			throw new Error('dateFrom and dateTo are required');
		}

		try {
			console.log(`Downloading orders from ${dateFrom} to ${dateTo} (${dateType} date)...`);

			const {Results, resultsNumberAll} = await this.idosellClient
				.searchOrders
				.dates(dateFrom, dateTo, dateType)
				.exec();

			console.log(`Successfully downloaded ${resultsNumberAll || 0} orders`);
			return Results || [];
		} catch (error) {
			console.error('Failed to download orders by date range:', error.message);
			throw new Error(`Failed to download orders: ${error.message}`);
		}
	}

	/**
	 * Download orders with pagination
	 * @param {Object} options - Download options
	 * @param {number} options.page - Page number (default: 1)
	 * @param {number} options.limit - Items per page (default: 50)
	 * @param {string} options.status - Order status filter (optional)
	 * @param {string} options.dateFrom - Start date for filtering (optional, format: YYYY-MM-DD)
	 * @param {string} options.dateTo - End date for filtering (optional, format: YYYY-MM-DD)
	 * @param {string} options.dateType - Date type: 'add', 'modify', 'dispatch' (default: 'add')
	 * @returns {Promise<Array>} Array of downloaded orders
	 */
	async downloadOrdersWithPagination(options = {}) {
		if (!this.isReady()) {
			throw new Error('Idosell API client not initialized. Check your credentials.');
		}

		const { page = 1, limit = 50, status, dateFrom, dateTo, dateType = 'add' } = options;

		try {
			let request;

			// Choose between date-based search or regular pagination
			if (dateFrom && dateTo) {
				// Use date-based search with pagination
				request = this.idosellClient.searchOrders
					.dates(dateFrom, dateTo, dateType)
					.page(page, limit);
			} else {
				// Use regular pagination
				request = this.idosellClient.searchOrders.page(page, limit);
			}

			// Add status filter if provided
			if (status) {
				request = request.status(status);
			}

			const {Results, resultsNumberAll} = await request.exec();

			return Results || [];
		} catch (error) {
			console.error('Failed to download orders with pagination:', error.message);
			throw new Error(`Failed to download orders: ${error.message}`);
		}
	}

	/**
	 * Get pagination information from IdoSell API
	 * @returns {Promise<Object>} Pagination information
	 */
	async getPaginationInfo() {
		if (!this.isReady()) {
			throw new Error('Idosell API client not initialized. Check your credentials.');
		}

		try {
			const response = await this.idosellClient.searchOrders.page(1, 100).exec();

			return {
				totalOrders: _.get(response, 'resultsNumberAll', 0),
				totalPages: _.get(response, 'resultsNumberPage', 0),
				ordersPerPage: _.get(response, 'resultsLimit', 100),
				currentPageResults: _.size(_.get(response, 'Results', []))
			};
		} catch (error) {
			console.error('Failed to get pagination info:', error.message);
			throw new Error(`Failed to get pagination info: ${error.message}`);
		}
	}

	/**
	 * Download ALL orders from IdoSell (simplified version)
	 * @returns {Promise<Array>} Array of all downloaded orders
	 */
	async downloadAllOrders() {
		if (!this.isReady()) {
			throw new Error('Idosell API client not initialized. Check your credentials.');
		}

		console.log(`Starting to download ALL orders from IdoSell...`);

		try {
			// Get pagination information
			console.log(`Getting pagination information...`);
			const paginationInfo = await this.getPaginationInfo();

			console.log(`Found ${paginationInfo.totalOrders} total orders across ${paginationInfo.totalPages} pages`);
			console.log(`Orders per page: ${paginationInfo.ordersPerPage}`);

			if (paginationInfo.totalOrders === 0) {
				console.log(` No orders found`);
				return [];
			}

			let allOrders = [];

			// Create progress bar for downloading pages
			const progressBar = new ProgressBar(' Downloading pages [:bar] :current/:total :percent :etas', {
				complete: '=',
				incomplete: ' ',
				width: 30,
				total: paginationInfo.totalPages
			});

			// Download each page
			for (let currentPage = 0; currentPage < paginationInfo.totalPages; currentPage++) {
				const pageOrders = await this.downloadOrdersWithPagination({
					page: currentPage,
					limit: paginationInfo.ordersPerPage
				});

				allOrders = _.concat(allOrders, pageOrders);
				progressBar.tick();

				// Small delay to avoid overwhelming the API
				if (currentPage < paginationInfo.totalPages - 1) {
					await new Promise(resolve => setTimeout(resolve, 500));
				}
			}

			console.log(`\n Successfully downloaded ${allOrders.length} total orders`);
			return allOrders;
		} catch (error) {
			console.error('Failed to download all orders:', error.message);
			throw new Error(`Failed to download all orders: ${error.message}`);
		}
	}

	/**
	 * Transform Idosell order data to our internal format
	 * @param {Object} externalOrder - Order data from Idosell API
	 * @returns {Object} Transformed order data
	 */
	transformOrderData(externalOrder) {
		const customerName = _.trim(`${_.get(externalOrder, 'customerFirstName', '')} ${_.get(externalOrder, 'customerLastName', '')}`);

		return {
			externalId: _.get(externalOrder, 'orderSerialNumber', '').toString(),
			orderNumber: _.get(externalOrder, 'orderNumber') || _.get(externalOrder, 'orderSerialNumber', '').toString(),
			customerEmail: _.get(externalOrder, 'customerEmail'),
			customerName: _.isEmpty(customerName) ? 'Unknown Customer' : customerName,
			totalAmount: _.get(externalOrder, 'orderGrossValue') || _.get(externalOrder, 'orderNetValue', 0),
			currency: _.get(externalOrder, 'orderCurrency', 'PLN'),
			status: this.mapOrderStatus(_.get(externalOrder, 'orderStatusId')),
			orderDate: _.get(externalOrder, 'orderAddDate') ? new Date(externalOrder.orderAddDate) : new Date(),
			items: this.transformOrderItems(_.get(externalOrder, 'orderProducts', [])),
			shippingAddress: _.mapKeys(_.pick(externalOrder, [
				'deliveryFirstName',
				'deliveryLastName',
				'deliveryCompanyName',
				'deliveryStreet',
				'deliveryCity',
				'deliveryPostCode',
				'deliveryCountryName',
				'deliveryPhone'
			]), (value, key) => _.camelCase(key.replace('delivery', ''))),
			billingAddress: _.mapKeys(_.pick(externalOrder, [
				'customerFirstName',
				'customerLastName',
				'customerCompanyName',
				'customerStreet',
				'customerCity',
				'customerPostCode',
				'customerCountryName',
				'customerPhone'
			]), (value, key) => _.camelCase(key.replace('customer', ''))),
			paymentMethod: _.get(externalOrder, 'paymentName'),
			shippingMethod: _.get(externalOrder, 'deliveryName'),
			notes: _.get(externalOrder, 'orderComment', ''),
			externalData: externalOrder
		};
	}

	/**
	 * Transform order items from external format
	 * @param {Array} externalItems - Array of order items from external API
	 * @returns {Array} Transformed order items
	 */
	transformOrderItems(externalItems) {
		return _.map(externalItems, item => {
			const quantity = _.get(item, 'orderProductQuantity', 1);
			const unitPrice = _.get(item, 'orderProductGrossPrice') || _.get(item, 'orderProductNetPrice', 0);

			return {
				productId: _.get(item, 'productId'),
				productCode: _.get(item, 'productCode'),
				productName: _.get(item, 'productName'),
				quantity,
				unitPrice,
				totalPrice: _.multiply(quantity, unitPrice),
				currency: _.get(item, 'orderProductCurrency', 'PLN')
			};
		});
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

		return _.get(statusMap, externalStatusId, 'pending');
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

		if (_.isEmpty(orders)) {
			return results;
		}

		// Create progress bar for saving orders
		const progressBar = new ProgressBar(' Saving orders [:bar] :current/:total :percent (:created created, :updated updated)', {
			complete: '=',
			incomplete: ' ',
			width: 30,
			total: orders.length
		});

		for (const externalOrder of orders) {
			try {
				const transformedOrder = this.transformOrderData(externalOrder);

				if (!transformedOrder.externalId) {
					results.skipped++;
					results.errors.push(`Order missing external ID: ${JSON.stringify(externalOrder)}`);
					progressBar.tick({ created: results.created, updated: results.updated });
					continue;
				}

				// Check if order already exists
				const existingOrder = await orderModel.getByExternalId(transformedOrder.externalId);

				if (existingOrder) {
					if (updateExisting) {
						await orderModel.updateByExternalId(transformedOrder.externalId, transformedOrder);
						results.updated++;
					} else {
						results.skipped++;
					}
				} else {
					await orderModel.create(transformedOrder);
					results.created++;
				}
			} catch (error) {
				results.errors.push(`Failed to save order: ${error.message}`);
			}

			progressBar.tick({ created: results.created, updated: results.updated });
		}

		console.log('\n Database save completed');
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
			const orders = await this.downloadOrdersBySerialNumbers(orderSerialNumbers);
			const saveResults = await this.saveOrdersToDatabase(orders, options);

			console.log(`Download and save completed:`, saveResults);
			return _.assign({
				success: true,
				downloaded: orders.length
			}, saveResults);
		} catch (error) {
			console.error('Download and save failed:', error.message);
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

			console.log(`Download and save completed:`, saveResults);
			return _.assign({
				success: true,
				downloaded: orders.length
			}, saveResults);
		} catch (error) {
			console.error('Download and save failed:', error.message);
			throw error;
		}
	}

	/**
	 * Download and save ALL orders from IdoSell (simplified version)
	 * @returns {Promise<Object>} Results object
	 */
	async downloadAndSaveAllOrders() {
		try {
			const orders = await this.downloadAllOrders();
			const saveResults = await this.saveOrdersToDatabase(orders);

			console.log(`Download and save all orders completed:`, saveResults);
			return _.assign({
				success: true,
				downloaded: orders.length
			}, saveResults);
		} catch (error) {
			console.error('Download and save all orders failed:', error.message);
			throw error;
		}
	}
}

module.exports = ExternalApiService;
