/**
 * Featured Products Component - Manages the featured products section
 */
const FeaturedProducts = (() => {
	// Private variables
	let intersectionObserver = null;

	// Private methods
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

	function setupFavoriteButtons() {
		const featuredFavoriteButtons = document.querySelectorAll('.products-grid--featured .product-card__favorite');
		featuredFavoriteButtons.forEach(button => {
			button.addEventListener('click', handleFavoriteClick);
		});
	}

	function handleFavoriteClick(event) {
		event.preventDefault();
		event.stopPropagation();

		const button = event.currentTarget;
		const productCard = button.closest('.product-card');
		const productId = productCard?.querySelector('.product-card__id')?.textContent;

		if (!productId) return;

		const isFavorite = FavoriteStore.toggleFavorite(productId);

		// Update button state
		button.classList.toggle('is-favorite', isFavorite);

		// Update aria-label for accessibility
		const newLabel = isFavorite ? 'Remove from favorites' : 'Add to favorites';
		button.setAttribute('aria-label', newLabel);

		// Add animation
		UtilsService.addClickAnimation(button, 'favorite-animate');
	}

	function handleProductCardClick(event) {
		// Don't trigger if favorite button was clicked
		if (event.target.closest('.product-card__favorite')) {
			return;
		}

		const card = event.currentTarget;
		const productId = card.querySelector('.product-card__id')?.textContent;
		const productImage = card.querySelector('.product-card__image')?.src;
		const productTitle = card.querySelector('.product-card__title')?.textContent;

		if (!productId) return;

		// Add click animation
		UtilsService.addClickAnimation(card, 'product-clicked');

		// Show product modal
		ModalService.showProduct({
			title: productTitle || productId,
			id: productId,
			image: productImage,
		});
	}

	function setupProductCardInteractions() {
		const featuredProductCards = document.querySelectorAll('.products-grid--featured .product-card');

		featuredProductCards.forEach((card) => {
			// Add click event listener
			card.addEventListener('click', handleProductCardClick);

			// Add hover animations
			card.addEventListener('mouseenter', () => {
				card.style.transform = 'translateY(-8px) scale(1.02)';
			});

			card.addEventListener('mouseleave', () => {
				card.style.transform = '';
			});
		});
	}

	function loadFavoriteStates() {
		const featuredFavoriteButtons = document.querySelectorAll('.products-grid--featured .product-card__favorite');
		featuredFavoriteButtons.forEach((button) => {
			const productCard = button.closest('.product-card');
			const productId = productCard?.querySelector('.product-card__id')?.textContent;

			if (productId && FavoriteStore.isFavorite(productId)) {
				button.classList.add('is-favorite');
				button.setAttribute('aria-label', 'Remove from favorites');
			}
		});
	}

	function staggerProductCards() {
		const featuredProductCards = document.querySelectorAll('.products-grid--featured .product-card');
		featuredProductCards.forEach((card, index) => {
			card.style.animationDelay = `${index * 0.1}s`;
		});
	}

	// Public controller
	const controller = {
		// Initialize featured products component
		init() {
			setupIntersectionObserver();
			setupFavoriteButtons();
			setupProductCardInteractions();
			staggerProductCards();

			// Load favorite states after a short delay to ensure DOM is ready
			setTimeout(() => {
				loadFavoriteStates();
			}, 100);

			// Setup intersection observer for featured section
			const featuredSection = document.querySelector('.featured');
			if (featuredSection && intersectionObserver) {
				intersectionObserver.observe(featuredSection);
			}
		},

		// Refresh favorite states (useful if called from external code)
		refreshFavoriteStates() {
			loadFavoriteStates();
		},

		// Get all favorited products from featured section
		getFavoritedProducts() {
			const favoritedProducts = [];
			const featuredProductCards = document.querySelectorAll('.products-grid--featured .product-card');

			featuredProductCards.forEach((card) => {
				const productId = card.querySelector('.product-card__id')?.textContent;
				const favoriteButton = card.querySelector('.product-card__favorite');

				if (productId && favoriteButton && favoriteButton.classList.contains('is-favorite')) {
					const productTitle = card.querySelector('.product-card__title')?.textContent;
					const productImage = card.querySelector('.product-card__image')?.src;
					const productPrice = card.querySelector('.product-card__price')?.textContent;

					favoritedProducts.push({
						id: productId,
						title: productTitle,
						image: productImage,
						price: productPrice,
					});
				}
			});

			return favoritedProducts;
		},

		// Observe element for animations
		observeElement(element) {
			if (intersectionObserver) {
				intersectionObserver.observe(element);
			}
		},
	};

	return controller;
})();
