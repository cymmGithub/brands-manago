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
					// Stop observing this element after the animation is triggered
					intersectionObserver.unobserve(entry.target);
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

			// Clear existing products
			productGrid.innerHTML = '';

			// For 4-column layout: [1][2][3][4] [5][P][P][6] [7][8][9][10] [11][12][13][14]
			// We want promo banner to appear after position 5 (so it takes positions 6-7 in the DOM order)
			// but visually appears in the center columns of row 2

			const wideScreenGridThreshold = 5;
			const mobileGridThreshold = 6;

			// Determine which threshold to use based on viewport width
			const threshold = window.innerWidth > 770
				? wideScreenGridThreshold
				: mobileGridThreshold;

			let promoInserted = false;

			// Add products and promo banner
			for (let i = 0; i < products.length; i++) {
				// Insert promo banner at the threshold position
				if (i === threshold && !promoInserted) {
					const bannerElement = PromoBanner.render(productGrid);
					if (bannerElement) {
						promoInserted = true;
					}
				}

				// Add the product
				const productElement = createProductCard(products[i]);
				productGrid.appendChild(productElement);
			}

			// If we have fewer products than the threshold, try to append the banner at the end
			if (!promoInserted) {
				PromoBanner.render(productGrid);
			}

			// Setup intersection observer for new elements
			const newProductCards = productGrid.querySelectorAll('.product-card--grid');
			newProductCards.forEach((card) => {
				if (intersectionObserver) {
					intersectionObserver.observe(card);
				}
			});
		},
	};

	return controller;
})();
