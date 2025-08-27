/**
 * Product Grid Component - Manages the display and interaction of product cards
 */
const ProductGrid = (() => {
	// Private variables
	let intersectionObserver = null;

	// Private methods
	function createProductCard(product) {
		const article = document.createElement('article');
		article.className = 'product-card product-card--grid';

		article.innerHTML = `
            <div class="product-card__id">ID: ${product.formattedId}</div>
            <div class="product-card__image-container">
                <img src="${product.image}" alt="${product.text}" class="product-card__image" loading="lazy">
            </div>
        `;

		// Add event listeners
		article.addEventListener('click', handleProductCardClick);

		return article;
	}

	function handleProductCardClick(event) {
		const card = event.currentTarget;
		const productId = card.querySelector('.product-card__id')?.textContent;
		const productImage = card.querySelector('.product-card__image')?.src;

		if (!productId) return;

		// Show product modal
		ModalService.showProduct({
			title: productId,
			id: productId,
			image: productImage,
		});
	}

	function setupIntersectionObserver() {
		const observerOptions = {
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px',
		};

		intersectionObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('in-view');
				}
			});
		}, observerOptions);
	}

	// Public controller
	const controller = {
		// Initialize product grid
		init() {
			setupIntersectionObserver();
		},

		// Render products in the grid
		render(products) {
			const productGrid = document.getElementById('products-grid');
			if (!productGrid) {
				return;
			}

			// Clear existing products but keep the promo banner
			const promoBanner = productGrid.querySelector('.promo-banner');
			productGrid.innerHTML = '';

			// For 4-column layout: [1][2][3][4] [5][P][P][6] [7][8][9][10] [11][12][13][14]
			// We want promo banner to appear after position 5 (so it takes positions 6-7 in the DOM order)
			// but visually appears in the center columns of row 2

			let productIndex = 0;
			let promoInserted = false;

			// Add products in the desired order
			for (let i = 0; i < products.length + 1; i++) {
				// Insert promo banner after 5th product (at position where it should be visually)
				if (i === 5 && promoBanner && !promoInserted) {
					productGrid.appendChild(promoBanner);
					promoInserted = true;
				} else if (productIndex < products.length) {
					const productElement = createProductCard(products[productIndex]);
					productGrid.appendChild(productElement);
					productIndex++;
				}
			}

			// If we have fewer than 5 products, still append the banner at the end
			if (!promoInserted && promoBanner) {
				productGrid.appendChild(promoBanner);
			}

			// Setup intersection observer for new elements
			const newProductCards = productGrid.querySelectorAll('.product-card--grid');
			newProductCards.forEach((card) => {
				if (intersectionObserver) {
					intersectionObserver.observe(card);
				}
			});
		},

		// Show loading state
		showLoading(isLoading) {
			const productGrid = document.getElementById('products-grid');

			if (productGrid) {
				productGrid.style.opacity = isLoading ? '0.5' : '1';
				productGrid.style.pointerEvents = isLoading ? 'none' : 'auto';
			}
		},
	};

	return controller;
})();
