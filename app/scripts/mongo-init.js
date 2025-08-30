// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

print('MongoDB: Starting database initialization...');

// Switch to the brands-manago database
db = db.getSiblingDB('brands-manago');

// Create collections with validation
db.createCollection('products', {
	validator: {
		$jsonSchema: {
			bsonType: 'object',
			required: ['name', 'price', 'category'],
			properties: {
				name: {
					bsonType: 'string',
					description: 'Product name is required and must be a string',
				},
				price: {
					bsonType: 'number',
					minimum: 0,
					description: 'Price must be a positive number',
				},
				category: {
					bsonType: 'string',
					description: 'Category is required and must be a string',
				},
				description: {
					bsonType: 'string',
					description: 'Product description',
				},
				imageUrl: {
					bsonType: 'string',
					description: 'Image URL',
				},
				inStock: {
					bsonType: 'bool',
					description: 'Stock availability',
				},
				createdAt: {
					bsonType: 'date',
					description: 'Creation timestamp',
				},
				updatedAt: {
					bsonType: 'date',
					description: 'Last update timestamp',
				},
			},
		},
	},
});

// Create indexes for better performance
db.products.createIndex({name: 1});
db.products.createIndex({category: 1});
db.products.createIndex({price: 1});
db.products.createIndex({createdAt: -1});

// Insert sample data
const sampleProducts = [
	{
		name: 'Professional Climbing Harness',
		price: 89.99,
		category: 'climbing',
		description: 'High-quality climbing harness for professional climbers',
		imageUrl: '/assets/images/featured-product-1.webp',
		inStock: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	{
		name: 'Alpine Ski Set',
		price: 299.99,
		category: 'skiing',
		description: 'Complete alpine ski set for winter sports enthusiasts',
		imageUrl: '/assets/images/featured-product-2.webp',
		inStock: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	{
		name: 'Waterproof Hiking Boots',
		price: 149.99,
		category: 'hiking',
		description: 'Durable waterproof boots for all-terrain hiking',
		imageUrl: '/assets/images/featured-product-3.webp',
		inStock: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
];

db.products.insertMany(sampleProducts);

print('MongoDB: Database initialization completed successfully!');
print('MongoDB: Created products collection with sample data');
print('MongoDB: Created indexes for optimal performance');
