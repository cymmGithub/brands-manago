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

		// Product pagination dropdown
		setupCustomDropdown();
	}

	function setupCustomDropdown() {
		const dropdown = document.querySelector('.custom-dropdown');
		if (!dropdown) return;

		const trigger = dropdown.querySelector('.custom-dropdown__trigger');
		const list = dropdown.querySelector('.custom-dropdown__list');
		const items = dropdown.querySelectorAll('.custom-dropdown__item');
		const valueSpan = dropdown.querySelector('.custom-dropdown__value');

		// Toggle dropdown
		function toggleDropdown() {
			const isOpen = dropdown.getAttribute('aria-expanded') === 'true';
			dropdown.setAttribute('aria-expanded', !isOpen);
			trigger.setAttribute('aria-expanded', !isOpen);
		}

		// Close dropdown
		function closeDropdown() {
			dropdown.setAttribute('aria-expanded', 'false');
			trigger.setAttribute('aria-expanded', 'false');
		}

		// Select item
		function selectItem(item) {
			const value = item.getAttribute('data-value');
			const text = item.textContent;

			// Update UI
			valueSpan.textContent = text;
			dropdown.setAttribute('data-value', value);

			// Update selected state
			items.forEach(i => {
				i.classList.remove('custom-dropdown__item--selected');
				i.setAttribute('aria-selected', 'false');
			});
			item.classList.add('custom-dropdown__item--selected');
			item.setAttribute('aria-selected', 'true');

			closeDropdown();

			// Trigger change event
			handlePaginationChange(parseInt(value));
		}

		// Event listeners
		trigger.addEventListener('click', (e) => {
			e.preventDefault();
			toggleDropdown();
		});

		// Item selection
		items.forEach(item => {
			item.addEventListener('click', (e) => {
				e.preventDefault();
				selectItem(item);
			});
		});

		// Keyboard support
		trigger.addEventListener('keydown', (e) => {
			switch (e.key) {
				case 'Enter':
				case ' ':
					e.preventDefault();
					toggleDropdown();
					break;
				case 'Escape':
					closeDropdown();
					break;
				case 'ArrowDown':
					e.preventDefault();
					if (dropdown.getAttribute('aria-expanded') !== 'true') {
						toggleDropdown();
					} else {
						const firstItem = list.querySelector('.custom-dropdown__item');
						if (firstItem) firstItem.focus();
					}
					break;
			}
		});

		// Keyboard navigation in list
		items.forEach((item, index) => {
			item.setAttribute('tabindex', '-1');
			item.addEventListener('keydown', (e) => {
				switch (e.key) {
					case 'Enter':
					case ' ':
						e.preventDefault();
						selectItem(item);
						trigger.focus();
						break;
					case 'Escape':
						closeDropdown();
						trigger.focus();
						break;
					case 'ArrowDown':
						e.preventDefault();
						const nextItem = items[index + 1] || items[0];
						nextItem.focus();
						break;
					case 'ArrowUp':
						e.preventDefault();
						const prevItem = items[index - 1] || items[items.length - 1];
						prevItem.focus();
						break;
				}
			});
		});

		// Close on outside click
		document.addEventListener('click', (e) => {
			if (!dropdown.contains(e.target)) {
				closeDropdown();
			}
		});
	}

	function handlePaginationChange(value) {
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
			PromoBanner.init();
			ProductGrid.init();

			setupEventListeners();

			// Load initial products
			controller.loadProducts();

			isInitialized = true;
		},

		// Load products from API
		async loadProducts() {
				const result = await ProductStore.fetchProducts();
				ProductGrid.render(result.products);
		},
	};

	return controller;
})();

// Initialize the application
FormaSintApp.init();
