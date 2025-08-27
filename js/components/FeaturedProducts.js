/**
 * Featured Products Component - Manages the featured products section with Swiper carousel
 */
const FeaturedProducts = (() => {
	// Private variables
	let intersectionObserver = null;
	let swiperInstance = null;

	// Featured products data - cycles through the three available images
	const featuredProductsData = [
		{
			id: 'FP-001',
			title: 'Premium Alpine Climbing Gear',
			price: '€299.00 EUR',
			image: 'assets/images/featured-product-1.webp',
			alt: 'Premium alpine climbing gear for professional mountaineers',
			badges: ['BESTSELLER'],
		},
		{
			id: 'FP-002',
			title: 'Professional Mountain Equipment',
			price: '€359.00 EUR',
			image: 'assets/images/featured-product-2.webp',
			alt: 'Professional mountain equipment for extreme conditions',
			badges: ['LIMITED EDITION'],
		},
		{
			id: 'FP-003',
			title: 'Elite Outdoor Adventure Kit',
			price: '€429.00 EUR',
			image: 'assets/images/featured-product-3.webp',
			alt: 'Elite outdoor adventure kit for serious climbers',
			badges: [],
		},
	];

	// Private methods
	function getProductData(index) {
		// Cycle through the three images if more products are needed
		return featuredProductsData[index % featuredProductsData.length];
	}

	function createProductCard(productData) {
		const badgesHtml =
			productData.badges.length > 0
				? `<div class="product-card__badges">
				${productData.badges
		.map(
			(badge) =>
				`<span class="badge badge--${badge
					.toLowerCase()
					.replace(' ', '-')}"">${badge}</span>`,
		)
		.join('')}
			</div>`
				: '';

		return `
			<div class="swiper-slide">
				<article class="product-card" data-product-id="${productData.id}">
					${badgesHtml}
					<div class="product-card__image-container">
						<img
							src="${productData.image}"
							alt="${productData.alt}"
							class="product-card__image"
							loading="lazy"
						/>
						<button
							class="product-card__favorite"
							aria-label="Add to favorites"
						>
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
									stroke="currentColor"
									stroke-width="2"
									fill="none"
								/>
							</svg>
						</button>
					</div>
					<div class="product-card__content">
						<h3 class="product-card__title">${productData.title}</h3>
						<p class="product-card__price">${productData.price}</p>
					</div>
				</article>
			</div>
		`;
	}

	function generateFeaturedProducts(numberOfProducts) {
		const featuredGrid = document.querySelector('.products-grid--featured');
		if (!featuredGrid) return;

		// Clear existing products
		featuredGrid.innerHTML = '';

		// Generate product cards (cycle through images if more products needed)
		for (let i = 0; i < numberOfProducts; i++) {
			const productData = getProductData(i);
			const productCardHtml = createProductCard(productData);
			featuredGrid.insertAdjacentHTML('beforeend', productCardHtml);
		}
	}

	function initializeSwiper() {
		const swiperContainer = document.querySelector(
			'.featured-products-swiper .swiper',
		);
		if (!swiperContainer) return null;

		// Destroy existing instance if it exists
		if (swiperInstance) {
			swiperInstance.destroy();
		}

		// Initialize Swiper
		swiperInstance = new Swiper(swiperContainer, {
			// Scrollbar
			scrollbar: {
				el: '.swiper-scrollbar',
				draggable: true,
				dragSize: 'auto', // Fixed drag size in pixels (instead of 'auto')
				// Alternative options:
				// dragSize: 'auto', // Default - proportional to content
				// snapOnRelease: true, // Snap to nearest slide when released
			},

			// Basic parameters
			slidesPerView: 1,
			spaceBetween: 20,

			// Responsive breakpoints
			breakpoints: {
				640: {
					slidesPerView: 2,
				},
				968: {
					slidesPerView: 3,
					spaceBetween: 0,
				},
				1200: {
					slidesPerView: 4,
					spaceBetween: 0,
				},
			},

			// Navigation arrows
			navigation: {
				nextEl: '.swiper-button-next',
				prevEl: '.swiper-button-prev',
				hideOnClick: false,
				disabledClass: 'swiper-button-disabled',
			},

			// Watch for overflow - hides navigation when not needed
			watchOverflow: true,

			// Effects
			effect: 'slide',
			speed: 600,

			// Events
			on: {
				init() {
					// Custom initialization logic
					console.log('Featured Products Swiper initialized');
				},
				slideChange() {
					// Update any states when slide changes
				},
			},
		});

		return swiperInstance;
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

	function setupFavoriteButtons() {
		const featuredFavoriteButtons = document.querySelectorAll(
			'.products-grid--featured .product-card__favorite',
		);
		featuredFavoriteButtons.forEach((button) => {
			button.addEventListener('click', handleFavoriteClick);
		});
	}

	function handleFavoriteClick(event) {
		event.preventDefault();
		event.stopPropagation();

		const button = event.currentTarget;
		const productCard = button.closest('.product-card');
		const productId = productCard?.dataset.productId;

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
		const productId = card.dataset.productId;
		const productImage = card.querySelector('.product-card__image')?.src;
		const productTitle = card.querySelector(
			'.product-card__title',
		)?.textContent;

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
		const featuredProductCards = document.querySelectorAll(
			'.products-grid--featured .swiper-slide .product-card',
		);

		featuredProductCards.forEach((card) => {
			// Add click event listener
			card.addEventListener('click', handleProductCardClick);
		});
	}

	function loadFavoriteStates() {
		const featuredFavoriteButtons = document.querySelectorAll(
			'.products-grid--featured .product-card__favorite',
		);
		featuredFavoriteButtons.forEach((button) => {
			const productCard = button.closest('.product-card');
			const productId = productCard?.dataset.productId;

			if (productId && FavoriteStore.isFavorite(productId)) {
				button.classList.add('is-favorite');
				button.setAttribute('aria-label', 'Remove from favorites');
			}
		});
	}

	// Public controller
	const controller = {
		// Initialize featured products component with Swiper
		init(numberOfProducts = 16) {
			// Generate featured products dynamically
			generateFeaturedProducts(numberOfProducts);

			// Initialize Swiper carousel
			initializeSwiper();

			// Setup component functionality
			setupIntersectionObserver();
			setupFavoriteButtons();
			setupProductCardInteractions();

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

		// Regenerate featured products with specified count
		regenerateProducts(numberOfProducts = 6) {
			generateFeaturedProducts(numberOfProducts);
			// Re-initialize Swiper with new content
			initializeSwiper();
			// Re-setup interactions for new products
			setupFavoriteButtons();
			loadFavoriteStates();
		},

		// Get Swiper instance
		getSwiperInstance() {
			return swiperInstance;
		},

		// Control Swiper programmatically
		nextSlide() {
			if (swiperInstance) {
				swiperInstance.slideNext();
			}
		},

		prevSlide() {
			if (swiperInstance) {
				swiperInstance.slidePrev();
			}
		},

		pauseAutoplay() {
			if (swiperInstance && swiperInstance.autoplay) {
				swiperInstance.autoplay.stop();
			}
		},

		resumeAutoplay() {
			if (swiperInstance && swiperInstance.autoplay) {
				swiperInstance.autoplay.start();
			}
		},

		// Get featured products data
		getFeaturedProductsData() {
			return featuredProductsData;
		},

		// Refresh favorite states (useful if called from external code)
		refreshFavoriteStates() {
			loadFavoriteStates();
		},

		// Get all favorited products from featured section
		getFavoritedProducts() {
			const favoritedProducts = [];
			const featuredProductCards = document.querySelectorAll(
				'.products-grid--featured .product-card',
			);

			featuredProductCards.forEach((card) => {
				const productId = card.dataset.productId;
				const favoriteButton = card.querySelector('.product-card__favorite');

				if (
					productId &&
					favoriteButton &&
					favoriteButton.classList.contains('is-favorite')
				) {
					const productTitle = card.querySelector(
						'.product-card__title',
					)?.textContent;
					const productImage = card.querySelector('.product-card__image')?.src;
					const productPrice = card.querySelector(
						'.product-card__price',
					)?.textContent;

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
	};

	return controller;
})();
