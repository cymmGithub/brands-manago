/**
 * Forma'Sint App - Main application controller
 * Coordinates all components, services, and stores
 */
const FormaSintApp = (() => {
	// Private variables
	let isInitialized = false;

	// Private methods
	function handlePageLoad() {
		// Add loaded class to body for CSS animations
		document.body.classList.add('loaded');

		// Animate hero title
		animateHeroTitle();

		// Setup lazy loading for images
		setupLazyLoading();
	}

	function animateHeroTitle() {
		const heroTitleImage = document.querySelector('.hero__title-image');
		if (heroTitleImage) {
			// Add fade-in animation class for the image
			heroTitleImage.style.opacity = '0';
			heroTitleImage.style.transform = 'translateY(20px)';
			heroTitleImage.style.transition = 'opacity 0.8s ease, transform 0.8s ease';

			// Trigger animation after a short delay
			setTimeout(() => {
				heroTitleImage.style.opacity = '1';
				heroTitleImage.style.transform = 'translateY(0)';
			}, 200);
		}
	}

	function setupLazyLoading() {
		if ('IntersectionObserver' in window) {
			const imageObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const img = entry.target;
						if (img.dataset.src) {
							img.src = img.dataset.src;
							img.classList.add('loaded');
							imageObserver.unobserve(img);
						}
					}
				});
			});

			const lazyImages = document.querySelectorAll('img[data-src]');
			lazyImages.forEach((img) => imageObserver.observe(img));
		}
	}

	function setupEventListeners() {
		// DOM Content Loaded
		document.addEventListener('DOMContentLoaded', handlePageLoad);

		// Promotional banner CTA
		const promoCTA = document.querySelector('.promo-banner__cta');
		if (promoCTA) {
			promoCTA.addEventListener('click', handlePromoCTA);
		}

		// Product pagination
		const paginationSelect = document.querySelector('.products__pagination-select');
		if (paginationSelect) {
			paginationSelect.addEventListener('change', handlePaginationChange);
		}
	}

	function handlePromoCTA(event) {
		event.preventDefault();

		// Add click animation
		const button = event.currentTarget;
		UtilsService.addClickAnimation(button, 'cta-clicked', 200);

		// Scroll to featured products or handle navigation
		const featuredSection = document.querySelector('#featured');
		if (featuredSection) {
			featuredSection.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		}
	}

	function handlePaginationChange(event) {
		const select = event.currentTarget;
		const value = parseInt(select.value);

		ProductStore.setPageSize(value);
		controller.loadProducts();
	}

	// Public controller
	const controller = {
		// Initialize the application
		init() {
			if (isInitialized) {
				return;
			}

			// Initialize all services and components
			NavigationService.init();
			ScrollService.init();
			FeaturedProducts.init();
			ProductGrid.init();

			setupEventListeners();

			// Load initial products
			controller.loadProducts();

			isInitialized = true;
		},

		// Load products from API
		async loadProducts() {
			try {
				ProductGrid.showLoading(true);

				const result = await ProductStore.fetchProducts();
				ProductGrid.render(result.products);

			} catch (error) {
				ProductGrid.showError('Failed to load products. Please try again.');
			} finally {
				ProductGrid.showLoading(false);
			}
		},

		// Utility method for error handling
		showError(message) {
			ProductGrid.showError(message);
		},
	};

	return controller;
})();

// Initialize the application
FormaSintApp.init();

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = FormaSintApp;
}

// Global exposure for debugging and external access
window.FormaSintApp = FormaSintApp;
