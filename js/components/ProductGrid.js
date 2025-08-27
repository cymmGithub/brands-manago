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
		// Don't trigger if favorite button was clicked (not applicable anymore, but kept for consistency)
		if (event.target.closest('.product-card__favorite')) {
			return;
		}

		const card = event.currentTarget;
		const productId = card.querySelector('.product-card__id')?.textContent;
		const productImage = card.querySelector('.product-card__image')?.src;

		if (!productId) return;

		// Add click animation
		UtilsService.addClickAnimation(card, 'product-clicked');

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

	function staggerProductCards() {
		const productCards = document.querySelectorAll('.product-card');
		productCards.forEach((card, index) => {
			card.style.animationDelay = `${index * 0.1}s`;
		});
	}

	function setupProductCardAnimations() {
		const productCards = document.querySelectorAll('.product-card');

		productCards.forEach((card) => {
			card.addEventListener('mouseenter', () => {
				card.style.transform = 'translateY(-8px) scale(1.02)';
			});

			card.addEventListener('mouseleave', () => {
				card.style.transform = '';
			});
		});
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

			// Setup animations and observers for new product cards
			setupProductCardAnimations();
			staggerProductCards();

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
			const loadingElement = document.querySelector('.products__loading');
			const productGrid = document.getElementById('products-grid');

			if (loadingElement) {
				loadingElement.style.display = isLoading ? 'block' : 'none';
			}

			if (productGrid) {
				productGrid.style.opacity = isLoading ? '0.5' : '1';
				productGrid.style.pointerEvents = isLoading ? 'none' : 'auto';
			}
		},

		// Show error message
		showError(message) {
			const productGrid = document.getElementById('products-grid');
			if (productGrid && productGrid.children.length === 0) {
				productGrid.innerHTML = `
                    <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                        <p style="color: #dc3545; font-size: 1.1rem; margin-bottom: 1rem;">${message}</p>
                        <button onclick="FormaSintApp.loadProducts()" style="background: #1a1a1a; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                `;
			}
		},

		// Observe elements for animations
		observeElement(element) {
			if (intersectionObserver) {
				intersectionObserver.observe(element);
			}
		},
	};

	return controller;
})();
