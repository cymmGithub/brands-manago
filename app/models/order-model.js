const {ObjectId} = require('mongodb');
const {getDb} = require('../database/mongodb');

/**
 * Order Model - MongoDB implementation
 */
const orderModel = {
	/**
	 * Get all orders with optional filters
	 * @param {Object} filters - Filter options
	 * @returns {Promise<Array>} Array of orders
	 */
	async getAll(filters = {}) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			const query = {};
			const options = {};

			// Apply status filter
			if (filters.status) {
				query.status = filters.status;
			}

			// Apply date range filter
			if (filters.dateFrom || filters.dateTo) {
				query.orderDate = {};
				if (filters.dateFrom) {
					query.orderDate.$gte = new Date(filters.dateFrom);
				}
				if (filters.dateTo) {
					query.orderDate.$lte = new Date(filters.dateTo);
				}
			}

			// Apply limit
			if (filters.limit) {
				options.limit = parseInt(filters.limit, 10);
			}

			// Sort by order date (newest first)
			options.sort = {orderDate: -1};

			const orders = await collection.find(query, options).toArray();

			// Convert MongoDB _id to id for frontend compatibility
			return orders.map(order => ({
				...order,
				id: order._id.toString(),
			}));
		} catch (error) {
			console.error('Error fetching orders:', error);
			throw error;
		}
	},

	/**
	 * Get order by ID
	 * @param {string} id - Order ID
	 * @returns {Promise<Object|null>} Order or null if not found
	 */
	async getById(id) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			// Validate ObjectId format
			if (!ObjectId.isValid(id)) {
				return null;
			}

			const order = await collection.findOne({_id: new ObjectId(id)});

			if (order) {
				return {
					...order,
					id: order._id.toString(),
				};
			}

			return null;
		} catch (error) {
			console.error('Error fetching order by ID:', error);
			throw error;
		}
	},

	/**
	 * Get order by external ID (from Idosell)
	 * @param {string} externalId - External order ID
	 * @returns {Promise<Object|null>} Order or null if not found
	 */
	async getByExternalId(externalId) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			const order = await collection.findOne({externalId: externalId});

			if (order) {
				return {
					...order,
					id: order._id.toString(),
				};
			}

			return null;
		} catch (error) {
			console.error('Error fetching order by external ID:', error);
			throw error;
		}
	},

	/**
	 * Create a new order
	 * @param {Object} orderData - Order data
	 * @returns {Promise<Object>} Created order
	 */
	async create(orderData) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			const newOrder = {
				externalId: orderData.externalId,
				orderNumber: orderData.orderNumber,
				customerEmail: orderData.customerEmail,
				customerName: orderData.customerName,
				totalAmount: parseFloat(orderData.totalAmount || 0),
				currency: orderData.currency || 'PLN',
				status: orderData.status || 'pending',
				orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
				items: orderData.items || [],
				shippingAddress: orderData.shippingAddress || {},
				billingAddress: orderData.billingAddress || {},
				paymentMethod: orderData.paymentMethod || '',
				shippingMethod: orderData.shippingMethod || '',
				notes: orderData.notes || '',
				externalData: orderData.externalData || {}, // Store raw data from external API
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await collection.insertOne(newOrder);

			return {
				...newOrder,
				id: result.insertedId.toString(),
			};
		} catch (error) {
			console.error('Error creating order:', error);
			throw error;
		}
	},

	/**
	 * Update an order
	 * @param {string} id - Order ID
	 * @param {Object} updateData - Update data
	 * @returns {Promise<Object|null>} Updated order or null if not found
	 */
	async update(id, updateData) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			// Validate ObjectId format
			if (!ObjectId.isValid(id)) {
				return null;
			}

			const updateFields = {
				...updateData,
				updatedAt: new Date(),
			};

			// Remove undefined fields
			Object.keys(updateFields).forEach(key => {
				if (updateFields[key] === undefined) {
					delete updateFields[key];
				}
			});

			const result = await collection.findOneAndUpdate(
				{_id: new ObjectId(id)},
				{$set: updateFields},
				{returnDocument: 'after'},
			);

			if (result.value) {
				return {
					...result.value,
					id: result.value._id.toString(),
				};
			}

			return null;
		} catch (error) {
			console.error('Error updating order:', error);
			throw error;
		}
	},

	/**
	 * Update order by external ID
	 * @param {string} externalId - External order ID
	 * @param {Object} updateData - Update data
	 * @returns {Promise<Object|null>} Updated order or null if not found
	 */
	async updateByExternalId(externalId, updateData) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			const updateFields = {
				...updateData,
				updatedAt: new Date(),
			};

			// Remove undefined fields
			Object.keys(updateFields).forEach(key => {
				if (updateFields[key] === undefined) {
					delete updateFields[key];
				}
			});

			const result = await collection.findOneAndUpdate(
				{externalId: externalId},
				{$set: updateFields},
				{returnDocument: 'after'},
			);

			if (result.value) {
				return {
					...result.value,
					id: result.value._id.toString(),
				};
			}

			return null;
		} catch (error) {
			console.error('Error updating order by external ID:', error);
			throw error;
		}
	},

	/**
	 * Delete an order
	 * @param {string} id - Order ID
	 * @returns {Promise<boolean>} True if deleted, false if not found
	 */
	async delete(id) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			// Validate ObjectId format
			if (!ObjectId.isValid(id)) {
				return false;
			}

			const result = await collection.deleteOne({_id: new ObjectId(id)});
			return result.deletedCount === 1;
		} catch (error) {
			console.error('Error deleting order:', error);
			throw error;
		}
	},

	/**
	 * Get orders count
	 * @param {Object} filters - Filter options
	 * @returns {Promise<number>} Orders count
	 */
	async getCount(filters = {}) {
		try {
			const db = getDb();
			const collection = db.collection('orders');

			const query = {};

			if (filters.status) {
				query.status = filters.status;
			}

			if (filters.dateFrom || filters.dateTo) {
				query.orderDate = {};
				if (filters.dateFrom) {
					query.orderDate.$gte = new Date(filters.dateFrom);
				}
				if (filters.dateTo) {
					query.orderDate.$lte = new Date(filters.dateTo);
				}
			}

			return await collection.countDocuments(query);
		} catch (error) {
			console.error('Error counting orders:', error);
			throw error;
		}
	},
};

module.exports = orderModel;
