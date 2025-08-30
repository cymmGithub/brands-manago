const sampleProducts = [
	{
		id: 1,
		name: 'Premium Climbing Harness',
		price: 129.99,
		image: 'assets/images/featured-product-1.webp',
		category: 'climbing',
		featured: true,
	},
	{
		id: 2,
		name: 'Professional Ice Axe',
		price: 199.99,
		image: 'assets/images/featured-product-2.webp',
		category: 'climbing',
		featured: true,
	},
	{
		id: 3,
		name: 'Alpine Mountaineering Boots',
		price: 299.99,
		image: 'assets/images/featured-product-3.webp',
		category: 'footwear',
		featured: true,
	},
	{
		id: 4,
		name: 'Winter Ski Package',
		price: 599.99,
		image: 'assets/images/promo-banner-skis.jpg',
		category: 'skiing',
		featured: false,
	},
];

const productModel = {
	getAll(filters = {}) {
		let products = [...sampleProducts];

		if (filters.category) {
			products = products.filter((product) => product.category === filters.category);
		}

		if (filters.featured !== undefined) {
			const isFeatured = filters.featured === 'true';
			products = products.filter((product) => product.featured === isFeatured);
		}

		if (filters.limit) {
			const limitNum = parseInt(filters.limit, 10);
			products = products.slice(0, limitNum);
		}

		return products;
	},

	getById(id) {
		return sampleProducts.find((p) => p.id === parseInt(id, 10));
	},

	create(productData) {
		const newProduct = {
			id: sampleProducts.length + 1,
			name: productData.name,
			price: parseFloat(productData.price),
			image: productData.image || 'assets/images/placeholder.webp',
			category: productData.category || 'other',
			featured: Boolean(productData.featured),
		};

		sampleProducts.push(newProduct);
		return newProduct;
	},
};

module.exports = productModel;
