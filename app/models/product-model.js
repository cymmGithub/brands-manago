const { ObjectId } = require('mongodb');
const { getDb } = require('../database/mongodb');

/**
 * Product Model - MongoDB implementation
 */
const productModel = {
	/**
	 * Get all products with optional filters
	 * @param {Object} filters - Filter options
	 * @returns {Promise<Array>} Array of products
	 */
	async getAll(filters = {}) {
		try {
			const db = getDb();
			const collection = db.collection('products');

			const query = {};
			const options = {};

			// Apply category filter
			if (filters.category) {
				query.category = filters.category;
			}

			// Apply featured filter
			if (filters.featured !== undefined) {
				query.featured = filters.featured === 'true';
			}

			// Apply limit
			if (filters.limit) {
				options.limit = parseInt(filters.limit, 10);
			}

			// Sort by creation date (newest first)
			options.sort = { createdAt: -1 };

			const products = await collection.find(query, options).toArray();

			// Convert MongoDB _id to id for frontend compatibility
			return products.map(product => ({
				...product,
				id: product._id.toString(),
			}));
		} catch (error) {
			console.error('Error fetching products:', error);
			throw error;
		}
	},

	/**
	 * Get product by ID
	 * @param {string} id - Product ID
	 * @returns {Promise<Object|null>} Product or null if not found
	 */
	async getById(id) {
		try {
			const db = getDb();
			const collection = db.collection('products');

			// Validate ObjectId format
			if (!ObjectId.isValid(id)) {
				return null;
			}

			const product = await collection.findOne({ _id: new ObjectId(id) });

			if (product) {
				return {
					...product,
					id: product._id.toString(),
				};
			}

			return null;
		} catch (error) {
			console.error('Error fetching product by ID:', error);
			throw error;
		}
	},

	/**
	 * Create a new product
	 * @param {Object} productData - Product data
	 * @returns {Promise<Object>} Created product
	 */
	async create(productData) {
		try {
			const db = getDb();
			const collection = db.collection('products');

			const newProduct = {
				name: productData.name,
				price: parseFloat(productData.price),
				category: productData.category || 'other',
				description: productData.description || '',
				imageUrl: productData.imageUrl || '/assets/images/placeholder.webp',
				inStock: Boolean(productData.inStock !== false), // Default to true
				featured: Boolean(productData.featured),
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await collection.insertOne(newProduct);

			return {
				...newProduct,
				id: result.insertedId.toString(),
			};
		} catch (error) {
			console.error('Error creating product:', error);
			throw error;
		}
	},

	/**
	 * Update a product
	 * @param {string} id - Product ID
	 * @param {Object} updateData - Update data
	 * @returns {Promise<Object|null>} Updated product or null if not found
	 */
	async update(id, updateData) {
		try {
			const db = getDb();
			const collection = db.collection('products');

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
				{ _id: new ObjectId(id) },
				{ $set: updateFields },
				{ returnDocument: 'after' }
			);

			if (result.value) {
				return {
					...result.value,
					id: result.value._id.toString(),
				};
			}

			return null;
		} catch (error) {
			console.error('Error updating product:', error);
			throw error;
		}
	},

	/**
	 * Delete a product
	 * @param {string} id - Product ID
	 * @returns {Promise<boolean>} True if deleted, false if not found
	 */
	async delete(id) {
		try {
			const db = getDb();
			const collection = db.collection('products');

			// Validate ObjectId format
			if (!ObjectId.isValid(id)) {
				return false;
			}

			const result = await collection.deleteOne({ _id: new ObjectId(id) });
			return result.deletedCount === 1;
		} catch (error) {
			console.error('Error deleting product:', error);
			throw error;
		}
	},

	/**
	 * Get products count
	 * @param {Object} filters - Filter options
	 * @returns {Promise<number>} Products count
	 */
	async getCount(filters = {}) {
		try {
			const db = getDb();
			const collection = db.collection('products');

			const query = {};

			if (filters.category) {
				query.category = filters.category;
			}

			if (filters.featured !== undefined) {
				query.featured = filters.featured === 'true';
			}

			return await collection.countDocuments(query);
		} catch (error) {
			console.error('Error counting products:', error);
			throw error;
		}
	},
};

module.exports = productModel;
