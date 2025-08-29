/**
 * Product Store - Manages product data and API interactions
 */
const ProductStore = (() => {
	// Private variables
	let currentPageSize = 14;
	let currentPage = 1;
	const apiUrl = 'https://brandstestowy.smallhost.pl/api/random';

	// Private methods
	function formatProductForDisplay(product, displayIndex) {
		return {
			...product,
			displayIndex: displayIndex,
			formattedId: String(displayIndex).padStart(2, '0'),
		};
	}

	// Public controller
	const controller = {
		data: [],

		// Getters
		getCurrentPageSize() {
			return currentPageSize;
		},

		// Setters
		setPageSize(size) {
			currentPageSize = size;
			currentPage = 1; // Reset to first page
		},

		// Data operations
		async fetchProducts() {
			try {
				const url = `${apiUrl}?pageSize=${currentPageSize}&page=${currentPage}`;

				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();

				// Format products with display indices
				controller.data = (data.data || []).map((product, index) =>
					formatProductForDisplay(product, index + 1),
				);

				return {
					products: controller.data,
					pagination: {
						currentPage: data.currentPage || currentPage,
						totalPages: data.totalPages || 'Unknown',
					},
				};
			} catch (error) {
				console.error('Failed to fetch products:', error);
				// Return empty result with error indication
				controller.data = [];
				return {
					products: [],
					pagination: {
						currentPage: currentPage,
						totalPages: 'Error',
					},
					error: error.message,
				};
			}
		},
	};

	return controller;
})();
