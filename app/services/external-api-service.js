const idosell = require('idosell').default || require('idosell');
const moment = require('moment');
const config = require('../config');
const orderModel = require('../models/order-model');
const UtilsService = require('./utils-service');
const _ = require('lodash');

/**
 * External API Service - Handles communication with Idosell API
 * Note: All date/time operations use UTC timezone for consistency
 */
class ExternalApiService {
	constructor() {
		this.shopUrl = config.idosell.shopUrl;
		this.apiKey = config.idosell.apiKey;
		this.apiVersion = config.idosell.apiVersion;
		this.idosellClient = null;

		// IdoSell API ordersDateType constants
		this.DATE_TYPES = {
			ADD: 'add', // Date order was placed
			MODIFIED: 'modified', // Date of order modification
			DISPATCH: 'dispatch', // Date of order dispatch
			PAYMENT: 'payment', // Date of order payment
			LAST_PAYMENTS_OPERATION: 'last_payments_operation', // Date of last payment operation
			DECLARED_PAYMENTS: 'declared_payments', // Date of last payment
		};

		this.initializeClient();
	}

	/**
	 * Initialize Idosell client
	 */
	initializeClient() {
		if (!this.shopUrl || !this.apiKey) {
			console.warn(
				'Warning: Idosell credentials not configured. Set IDOSELL_SHOP_URL and IDOSELL_API_KEY environment variables.',
			);
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
	 * Download newly added orders using scheduler configuration
	 * Uses SCHEDULER_LOOKBACK_MINUTES to determine how far back to look
	 * @param {Object} options - Download options
	 * @param {number} options.lookbackMinutes - Override default lookback minutes
	 * @param {string} options.dateType - Type of date (use DATE_TYPES constants)
	 *   - DATE_TYPES.ADD: date order was placed
	 *   - DATE_TYPES.MODIFIED: date of order modification
	 *   - DATE_TYPES.DISPATCH: date of order dispatch
	 *   - DATE_TYPES.PAYMENT: date of order payment
	 *   - DATE_TYPES.LAST_PAYMENTS_OPERATION: date of last payment operation
	 *   - DATE_TYPES.DECLARED_PAYMENTS: date of last payment
	 * @returns {Promise<Array>} Array of downloaded orders
	 */
	async downloadNewlyAddedOrdersFromScheduler(options = {}) {
		const {
			lookbackMinutes = config.scheduler.lookbackMinutes || 60,
			dateType = this.DATE_TYPES.ADD,
		} = options;

		// Use the simplified minutes-based method
		const orders = await this.downloadOrdersByTimeWindow({
			minutes: lookbackMinutes,
			dateType,
		});

		// Handle empty results gracefully
		if (_.isEmpty(orders)) {
			console.log(`No new orders found in ${lookbackMinutes} minute lookback window (${dateType} date)`);
			return [];
		}

		return orders;
	}

	/**
	 * Get current UTC time as moment object
	 * @returns {moment} Current UTC time
	 */
	getCurrentUtcTime() {
		return moment.utc();
	}

	/**
	 * Format Date to IdoSell API format (YYYY-MM-DD HH:mm:ss) using moment.js in UTC
	 * @param {Date|moment|string} date - Date to format
	 * @returns {string} Formatted date string in UTC
	 */
	formatDateTime(date) {
		return moment.utc(date).format('YYYY-MM-DD HH:mm:ss');
	}

	/**
	 * Create ordersRange object for IdoSell API
	 * @param {Object} options - Range options
	 * @param {Date|moment|string} options.dateFrom - Start date
	 * @param {Date|moment|string} options.dateTo - End date
	 * @param {string} options.dateType - Type of date (use DATE_TYPES constants)
	 * @returns {Object} Properly formatted ordersRange object
	 */
	createOrdersRange(options) {
		const {dateFrom, dateTo, dateType = this.DATE_TYPES.ADD} = options;

		return {
			ordersRange: {
				ordersDateRange: {
					ordersDateBegin: this.formatDateTime(dateFrom),
					ordersDateEnd: this.formatDateTime(dateTo),
					ordersDateType: dateType,
				},
			},
		};
	}

	/**
	 * Download orders within a specified time window from current moment
	 * Uses UTC timezone for all date calculations
	 * @param {Object} options - Time period options
	 * @param {number} options.minutes - Number of minutes to look back (default: uses config)
	 * @param {string} options.dateType - Type of date (use DATE_TYPES constants)
	 * @returns {Promise<Array>} Array of downloaded orders
	 */
	async downloadOrdersByTimeWindow(options = {}) {
		const {
			minutes = config.scheduler.lookbackMinutes || 60,
			dateType = this.DATE_TYPES.ADD,
		} = options;

		if (!this.isReady()) {
			throw new Error(
				'Idosell API client not initialized. Check your credentials.',
			);
		}

		try {
			const dateTo = this.getCurrentUtcTime();
			const dateFrom = this.getCurrentUtcTime().subtract(minutes, 'minutes');

			console.log(
				`Checking for new orders within ${minutes} minute time window...`,
			);
			console.log(`Time range: ${this.formatDateTime(dateFrom)} UTC to ${this.formatDateTime(dateTo)} UTC`);

			const ordersRangeQuery = this.createOrdersRange({
				dateFrom,
				dateTo,
				dateType,
			});

			const {Results, resultsNumberAll} =
				await this.idosellClient.searchOrders
					.ordersRange(ordersRangeQuery.ordersRange)
					.exec();

			console.log(`Successfully downloaded ${resultsNumberAll || 0} orders within ${minutes} minute time window`);
			return Results || [];
		} catch (error) {
			// Handle the specific case where no orders are found - this is not an error, just empty results
			if (error.cause && error.cause.faultCode === 2 &&
				error.cause.faultString === 'Wyszukiwarka zamówień: zwrócono pusty wynik') {
				return [];
			}
			console.log('error', error.cause);
			console.error('Failed to download orders by time window:', error.message);
			throw new Error(`Failed to download orders: ${error.message}`);
		}
	}

	/**
	 * Download newly added orders using exact scheduler config values
	 * This is the most convenient method for scheduler operations
	 * @param {string} dateType - Type of date (use DATE_TYPES constants, default: ADD)
	 * @returns {Promise<Array>} Array of downloaded orders
	 */
	async downloadNewlyAddedOrdersForScheduler(dateType = this.DATE_TYPES.ADD) {
		const orders = await this.downloadOrdersByTimeWindow({
			minutes: config.scheduler.lookbackMinutes,
			dateType,
		});

		// Handle empty results gracefully
		if (_.isEmpty(orders)) {
			console.log(`No new orders found in ${config.scheduler.lookbackMinutes} minute scheduler window (${dateType} date)`);
			return [];
		}

		return orders;
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
			throw new Error(
				'Idosell API client not initialized. Check your credentials.',
			);
		}

		const {
			page = 1,
			limit,
			status,
		} = options;

		try {
			let request;

			request = this.idosellClient.searchOrders.page(page, limit);

			// Add status filter if provided
			if (status) {
				request = request.status(status);
			}

			const {Results} = await request.exec();

			return Results || [];
		} catch (error) {
			console.error(
				'Failed to download orders with pagination:',
				error.message,
			);
			throw new Error(`Failed to download orders: ${error.message}`);
		}
	}

	/**
	 * Get pagination information from IdoSell API
	 * @returns {Promise<Object>} Pagination information
	 */
	async getPaginationInfo() {
		if (!this.isReady()) {
			throw new Error(
				'Idosell API client not initialized. Check your credentials.',
			);
		}

		try {
			const response = await this.idosellClient.searchOrders
				.page(1, 100)
				.exec();

			return {
				totalOrders: _.get(response, 'resultsNumberAll', 0),
				totalPages: _.get(response, 'resultsNumberPage', 0),
				ordersPerPage: _.get(response, 'resultsLimit', 100),
				currentPageResults: _.size(_.get(response, 'Results', [])),
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
			throw new Error(
				'Idosell API client not initialized. Check your credentials.',
			);
		}

		console.log('Starting to download ALL orders from IdoSell...');

		try {
			// Get pagination information
			console.log('Getting pagination information...');
			const paginationInfo = await this.getPaginationInfo();

			console.log(
				`Found ${paginationInfo.totalOrders} total orders across ${paginationInfo.totalPages} pages`,
			);
			console.log(`Orders per page: ${paginationInfo.ordersPerPage}`);

			if (paginationInfo.totalOrders === 0) {
				console.log(' No orders found');
				return [];
			}

			let allOrders = [];

			// Create progress bar for downloading pages
			const progressBar = UtilsService.createDownloadProgressBar(
				paginationInfo.totalPages,
				'Downloading pages',
			);

			// Download each page
			for (
				let currentPage = 0;
				currentPage < paginationInfo.totalPages;
				currentPage++
			) {
				const pageOrders = await this.downloadOrdersWithPagination({
					page: currentPage,
					limit: paginationInfo.ordersPerPage,
				});

				allOrders = _.concat(allOrders, pageOrders);
				UtilsService.tickProgress(progressBar);

				// Small delay to avoid overwhelming the API
				if (currentPage < paginationInfo.totalPages - 1) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			}

			console.log(
				`\n Successfully downloaded ${allOrders.length} total orders`,
			);
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
		console.log('externalOrder', externalOrder);
		const {orderDetails} = externalOrder;
		const paymentInfo = _.get(orderDetails, 'payments', {});
		const currencyInfo = _.get(paymentInfo, 'orderCurrency', {});
		const productsResults = _.get(orderDetails, 'productsResults', {});

		return {
			externalId: _.get(externalOrder, 'orderId', '').toString(),
			externalSerialNumber: _.get(externalOrder, 'orderSerialNumber', null).toString(),
			currency: _.get(currencyInfo, 'currencyId', 'unknown'),
			orderProducts: _.map(productsResults, (product) => ({
				productId: _.get(product, 'productId'),
				productQuantity: _.get(product, 'productQuantity'),
			})),
			orderProductsCost: _.get(currencyInfo, 'orderProductsCost', 0),
			status: _.get(externalOrder, 'orderDetails.orderStatus', 'unknown'),
			externalCreatedAt: _.get(orderDetails, 'orderAddDate', 'unknown'),
			externalUpdatedAt: _.get(orderDetails, 'orderChangeDate', 'unknown'),
		};
	}

	/**
	 * Save orders to database
	 * @param {Array} orders - Array of orders to save
	 * @param {Object} options - Save options
	 * @param {boolean} options.updateExisting - Whether to update existing orders (default: true)
	 * @returns {Promise<Object>} Save results
	 */
	async saveOrdersToDatabase(orders, options = {}) {
		const {updateExisting = true} = options;
		const results = {
			total: orders.length,
			created: 0,
			updated: 0,
			skipped: 0,
			errors: [],
		};

		if (_.isEmpty(orders)) {
			return results;
		}

		// Create progress bar for saving orders
		const progressBar = UtilsService.createSaveProgressBar(
			orders.length,
			'Saving orders',
		);

		for (const order of orders) {
			try {
				const transformedOrder = this.transformOrderData(order);

				if (!transformedOrder.externalId) {
					results.skipped++;
					results.errors.push(
						`Order missing external ID: ${JSON.stringify(order)}`,
					);
					UtilsService.tickProgress(progressBar, {
						created: results.created,
						updated: results.updated,
					});
					continue;
				}

				// Check if order already exists
				const existingOrder = await orderModel.getByExternalId(
					transformedOrder.externalId,
				);

				if (existingOrder) {
					if (updateExisting) {
						await orderModel.updateByExternalId(
							transformedOrder.externalId,
							transformedOrder,
						);
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

			UtilsService.tickProgress(progressBar, {
				created: results.created,
				updated: results.updated,
			});
		}

		console.log('\n Database save completed');
		return results;
	}


	/**
	 * Download and save newly added orders using scheduler configuration
	 * @param {Object} options - Options
	 * @param {number} options.lookbackMinutes - Override default lookback minutes
	 * @param {string} options.dateType - Type of date ('add', 'modify', 'dispatch') - default: 'add'
	 * @param {boolean} options.updateExisting - Whether to update existing orders (default: true)
	 * @returns {Promise<Object>} Results object
	 */
	async downloadAndSaveNewlyAddedOrdersFromScheduler(options = {}) {
		try {
			const {
				updateExisting = true,
				dateType = this.DATE_TYPES.ADD,
				minutes = config.scheduler.lookbackMinutes,
			} = options;

			const orders = await this.downloadOrdersByTimeWindow({
				minutes,
				dateType,
			});

			// Handle empty results gracefully - early return to avoid unnecessary database operations
			if (_.isEmpty(orders)) {
				console.log(`No new orders found in ${minutes} minute scheduler window (${dateType} date) - skipping database operations`);
				return {
					success: true,
					downloaded: 0,
					lookbackMinutes: minutes,
					dateType,
					total: 0,
					created: 0,
					updated: 0,
					skipped: 0,
					errors: [],
				};
			}

			const saveResults = await this.saveOrdersToDatabase(orders, {updateExisting});

			console.log('Scheduler download and save completed:', saveResults);
			return _.assign(
				{
					success: true,
					downloaded: orders.length,
					lookbackMinutes: minutes,
					dateType,
				},
				saveResults,
			);
		} catch (error) {
			console.error('Scheduler download and save failed:', error.message);
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

			console.log('Download and save all orders completed:', saveResults);
			return _.assign(
				{
					success: true,
					downloaded: orders.length,
				},
				saveResults,
			);
		} catch (error) {
			console.error('Download and save all orders failed:', error.message);
			throw error;
		}
	}
}

module.exports = ExternalApiService;
