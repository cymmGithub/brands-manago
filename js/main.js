/**
 * Forma'Sint Website - Main JavaScript
 * Handles navigation, product interactions, and responsive behavior
 */

class FormaSintApp {
	constructor() {
		this.apiUrl = 'https://brandstestowy.smallhost.pl/api/random';
		this.currentPageSize = 14;
		this.currentPage = 1;
		this.productModal = null;
		this.ticking = false;
		this.lastKnownScrollPosition = 0;
		this.isHeroVisible = true; // Track if hero section is visible
		this.init();
	}

	init() {
		this.setupEventListeners();
		this.setupIntersectionObserver();
		this.setupHeroVisibilityObserver();
		this.setupSmoothScrolling();
		this.setupNavigation();
		this.setupProductFilters();
		this.setupModal();
		this.loadProducts(); // Load initial products
	}

	/**
	 * Setup all event listeners
	 */
	setupEventListeners() {
		// DOM Content Loaded
		document.addEventListener('DOMContentLoaded', () => {
			this.handlePageLoad();
		});

		// Window events
		window.addEventListener('scroll', this.handleScrollEvent.bind(this), {passive: true});
		window.addEventListener(
			'resize',
			this.throttle(this.handleResize.bind(this), 250),
		);

		// Navigation toggle
		const navToggle = document.querySelector('.nav__toggle');
		if (navToggle) {
			navToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
		}

		// Product card favorites
		const favoriteButtons = document.querySelectorAll(
			'.product-card__favorite',
		);
		favoriteButtons.forEach((button) => {
			button.addEventListener('click', this.toggleFavorite.bind(this));
		});

		// Promotional banner CTA
		const promoCTA = document.querySelector('.promo-banner__cta');
		if (promoCTA) {
			promoCTA.addEventListener('click', this.handlePromoCTA.bind(this));
		}

		// Product pagination
		const paginationSelect = document.querySelector(
			'.products__pagination-select',
		);
		if (paginationSelect) {
			paginationSelect.addEventListener(
				'change',
				this.handlePaginationChange.bind(this),
			);
		}

		// Product card clicks
		const productCards = document.querySelectorAll('.product-card');
		productCards.forEach((card) => {
			card.addEventListener('click', this.handleProductCardClick.bind(this));
		});
	}

	/**
	 * Handle page load animations and setup
	 */
	handlePageLoad() {
		// Add loaded class to body for CSS animations
		document.body.classList.add('loaded');

		// Animate hero title
		this.animateHeroTitle();

		// Setup lazy loading for images
		this.setupLazyLoading();

		// Initialize product card stagger animations
		this.staggerProductCards();

		console.log("🏔️ Forma'Sint website loaded successfully!");
	}

	/**
	 * Handle scroll events with requestAnimationFrame optimization
	 */
	handleScrollEvent() {
		this.lastKnownScrollPosition = window.scrollY;

		if (!this.ticking) {
			requestAnimationFrame(this.updateParallax.bind(this));
			this.ticking = true;
		}
	}

	/**
	 * Update parallax and scroll effects using requestAnimationFrame
	 */
	updateParallax() {
		const scrollY = this.lastKnownScrollPosition;
		const header = document.querySelector('.header');

		// Add/remove header shadow based on scroll
		if (scrollY > 50) {
			header?.classList.add('header--scrolled');
		} else {
			header?.classList.remove('header--scrolled');
		}

		// Only run parallax if hero section is visible
		if (this.isHeroVisible) {
			this.updateHeroParallax(scrollY, header);
		}

		// Update navigation state
		this.updateNavigationStateFromScroll();

		this.ticking = false;
	}

	/**
	 * Update hero parallax effect (separated for better organization)
	 */
	updateHeroParallax(scrollY, header) {
		const heroImage = document.querySelector('.hero__image');
		const heroImageContainer = document.querySelector('.hero__image-container');

		if (heroImage && heroImageContainer && header) {
			// Cache these values to avoid repeated DOM queries
			if (!this.headerHeight) {
				this.headerHeight = header.offsetHeight;
			}
			if (!this.heroImageContainerTop) {
				this.heroImageContainerTop = heroImageContainer.offsetTop;
			}
			if (!this.windowHeight) {
				this.windowHeight = window.innerHeight;
			}

			const startParallaxAt = this.heroImageContainerTop - this.headerHeight;

			// Only apply parallax when container starts touching navbar and while still in viewport
			if (scrollY >= startParallaxAt && scrollY < this.windowHeight) {
				const parallaxSpeed = 0.5;
				const adjustedScrollY = scrollY - startParallaxAt;
				const translateY = adjustedScrollY * parallaxSpeed;

				// Use transform3d for GPU acceleration and better performance
				heroImage.style.transform = `translate3d(0, ${translateY}px, 0)`;
			} else if (scrollY < startParallaxAt) {
				// Reset transform when above the trigger point
				heroImage.style.transform = 'translate3d(0, 0, 0)';
			}
		}
	}

	/**
	 * Setup intersection observer to track hero visibility
	 */
	setupHeroVisibilityObserver() {
		const heroSection = document.querySelector('.hero');
		if (!heroSection) return;

		const heroObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				this.isHeroVisible = entry.isIntersecting;
			});
		}, {
			threshold: 0,
			rootMargin: '50px 0px 50px 0px',
		});

		heroObserver.observe(heroSection);
	}

	/**
	 * Handle scroll events (legacy method - kept for compatibility)
	 * @deprecated Use handleScrollEvent and updateParallax instead
	 */
	handleScroll() {
		// This method is now deprecated in favor of the optimized approach
		console.warn('handleScroll is deprecated. Use handleScrollEvent instead.');
	}

	/**
	 * Handle window resize events
	 */
	handleResize() {
		// Reset cached values on resize
		this.headerHeight = null;
		this.heroImageContainerTop = null;
		this.windowHeight = null;

		// Close mobile menu on resize to desktop
		if (window.innerWidth > 768) {
			this.closeMobileMenu();
		}

		// Recalculate product grid
		this.recalculateProductGrid();
	}

	/**
	 * Toggle mobile navigation menu
	 */
	toggleMobileMenu() {
		const nav = document.querySelector('.nav');
		const navToggle = document.querySelector('.nav__toggle');
		const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';

		nav?.classList.toggle('nav--mobile-open');
		navToggle?.setAttribute('aria-expanded', (!isExpanded).toString());

		// Prevent body scroll when menu is open
		if (!isExpanded) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	/**
	 * Close mobile menu
	 */
	closeMobileMenu() {
		const nav = document.querySelector('.nav');
		const navToggle = document.querySelector('.nav__toggle');

		nav?.classList.remove('nav--mobile-open');
		navToggle?.setAttribute('aria-expanded', 'false');
		document.body.style.overflow = '';
	}

	/**
	 * Toggle product favorite status
	 */
	toggleFavorite(event) {
		event.preventDefault();
		event.stopPropagation();

		const button = event.currentTarget;
		const isFavorite = button.classList.contains('is-favorite');

		button.classList.toggle('is-favorite');

		// Update aria-label for accessibility
		const newLabel = isFavorite ? 'Add to favorites' : 'Remove from favorites';
		button.setAttribute('aria-label', newLabel);

		// Add animation class
		button.classList.add('favorite-animate');
		setTimeout(() => {
			button.classList.remove('favorite-animate');
		}, 300);

		// Save to localStorage (simple favoriting system)
		this.saveFavoriteState(button);
	}

	/**
	 * Handle promotional banner CTA click
	 */
	handlePromoCTA(event) {
		event.preventDefault();

		// Add click animation
		const button = event.currentTarget;
		button.classList.add('cta-clicked');

		setTimeout(() => {
			button.classList.remove('cta-clicked');
		}, 200);

		// Scroll to featured products or handle navigation
		const featuredSection = document.querySelector('#featured');
		if (featuredSection) {
			featuredSection.scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			});
		}

		console.log('🎯 Promo CTA clicked!');
	}

	/**
	 * Handle pagination change
	 */
	handlePaginationChange(event) {
		const select = event.currentTarget;
		const value = parseInt(select.value);

		console.log(`📄 Pagination changed to: ${value} products per page`);

		this.currentPageSize = value;
		this.currentPage = 1; // Reset to first page
		this.loadProducts();
	}

	/**
	 * Handle product card click
	 */
	handleProductCardClick(event) {
		// Don't trigger if favorite button was clicked
		if (event.target.closest('.product-card__favorite')) {
			return;
		}

		const card = event.currentTarget;
		const productId = card.querySelector('.product-card__id')?.textContent;
		const productImage = card.querySelector('.product-card__image')?.src;

		console.log(`🛍️ Product clicked: ${productId}`);

		// Add click animation
		card.classList.add('product-clicked');
		setTimeout(() => {
			card.classList.remove('product-clicked');
		}, 300);

		// Show product modal
		this.showProductModal({
			title: productId, // Use ID as title since we removed the actual title
			id: productId,
			image: productImage,
		});
	}

	/**
	 * Setup intersection observer for animations
	 */
	setupIntersectionObserver() {
		const observerOptions = {
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px',
		};

		this.intersectionObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('in-view');
				}
			});
		}, observerOptions);

		// Observe sections and product cards
		const elementsToObserve = document.querySelectorAll(
			'.featured, .products, .product-card, .promo-banner',
		);
		elementsToObserve.forEach((el) => this.intersectionObserver.observe(el));
	}

	/**
	 * Setup smooth scrolling for navigation links
	 */
	setupSmoothScrolling() {
		const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
		const navLogo = document.querySelector('.nav__logo[href="#"]');

		// Handle navigation links
		navLinks.forEach((link) => {
			link.addEventListener('click', (event) => {
				event.preventDefault();

				const targetId = link.getAttribute('href');

				// Special case for HOME link (href="#")
				if (targetId === '#') {
					window.scrollTo({
						top: 0,
						behavior: 'smooth',
					});
					// Update navigation state after scrolling to top
					setTimeout(() => {
						this.updateNavigationState();
					}, 100);
				} else {
					const targetElement = document.querySelector(targetId);

					if (targetElement) {
						const headerHeight =
							document.querySelector('.header')?.offsetHeight || 80;
						const targetPosition = targetElement.offsetTop - headerHeight;

						window.scrollTo({
							top: targetPosition,
							behavior: 'smooth',
						});

						// Update navigation state after scrolling to section
						setTimeout(() => {
							this.updateNavigationState();
						}, 500); // Longer delay for smooth scroll animation
					}
				}

				// Close mobile menu if open
				this.closeMobileMenu();
			});
		});

		// Handle logo click (scroll to top)
		if (navLogo) {
			navLogo.addEventListener('click', (event) => {
				event.preventDefault();

				window.scrollTo({
					top: 0,
					behavior: 'smooth',
				});

				// Update navigation state after scrolling to top
				setTimeout(() => {
					this.updateNavigationState();
				}, 100);

				// Close mobile menu if open
				this.closeMobileMenu();
			});
		}
	}

	/**
	 * Setup product card hover animations
	 */
	setupProductCardAnimations() {
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

	/**
	 * Animate hero title on load
	 */
	animateHeroTitle() {
		const heroTitleImage = document.querySelector('.hero__title-image');
		if (heroTitleImage) {
			// Add fade-in animation class for the image
			heroTitleImage.style.opacity = '0';
			heroTitleImage.style.transform = 'translateY(20px)';
			heroTitleImage.style.transition =
				'opacity 0.8s ease, transform 0.8s ease';

			// Trigger animation after a short delay
			setTimeout(() => {
				heroTitleImage.style.opacity = '1';
				heroTitleImage.style.transform = 'translateY(0)';
			}, 200);
		}
	}

	/**
	 * Setup lazy loading for images
	 */
	setupLazyLoading() {
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

	/**
	 * Stagger product card animations
	 */
	staggerProductCards() {
		const productCards = document.querySelectorAll('.product-card');

		productCards.forEach((card, index) => {
			card.style.animationDelay = `${index * 0.1}s`;
		});
	}

	/**
	 * Setup navigation active states
	 */
	setupNavigation() {
		const navLinks = document.querySelectorAll('.nav__link');
		const sections = document.querySelectorAll('section[id]');
		const homeLink = document.querySelector('.nav__link[href="#"]');
		this.isHovering = false;

		// Set HOME link as active initially
		if (homeLink) {
			homeLink.classList.add('active');
		}

		// Store references for use in other methods
		this.navLinks = navLinks;
		this.sections = sections;
		this.homeLink = homeLink;

		// Setup hover behavior for navigation links
		navLinks.forEach((link) => {
			link.addEventListener('mouseenter', () => {
				this.isHovering = true;
				// Remove active class from all links when hovering starts
				navLinks.forEach((navLink) => {
					navLink.classList.remove('active');
				});
			});

			link.addEventListener('mouseleave', () => {
				this.isHovering = false;
				// Restore active state after hover ends
				this.updateNavigationState();
			});
		});

		window.addEventListener('scroll', this.throttle(this.updateNavigationState.bind(this), 100));
	}

	/**
	 * Update navigation active state based on current scroll position (optimized for parallax)
	 */
	updateNavigationStateFromScroll() {
		// Don't update active states while hovering
		if (this.isHovering) return;

		const scrollPosition = this.lastKnownScrollPosition + 100;
		let activeSection = null;

		// Check which section is currently in view
		if (this.sections) {
			this.sections.forEach((section) => {
				const sectionTop = section.offsetTop;
				const sectionHeight = section.offsetHeight;
				const sectionId = section.getAttribute('id');

				if (
					scrollPosition >= sectionTop &&
					scrollPosition < sectionTop + sectionHeight
				) {
					activeSection = sectionId;
				}
			});
		}

		// Remove active class from all links
		if (this.navLinks) {
			this.navLinks.forEach((link) => {
				link.classList.remove('active');
			});
		}

		if (activeSection) {
			// Set active class for the corresponding section link
			const activeLink = document.querySelector(`.nav__link[href="#${activeSection}"]`);
			if (activeLink) {
				activeLink.classList.add('active');
			}
		} else {
			// If no section is active (at top of page), activate HOME link
			if (this.homeLink) {
				this.homeLink.classList.add('active');
			}
		}
	}

	/**
	 * Update navigation active state based on current scroll position (for smooth scrolling)
	 */
	updateNavigationState() {
		// Don't update active states while hovering
		if (this.isHovering) return;

		const scrollPosition = window.scrollY + 100;
		let activeSection = null;

		// Check which section is currently in view
		if (this.sections) {
			this.sections.forEach((section) => {
				const sectionTop = section.offsetTop;
				const sectionHeight = section.offsetHeight;
				const sectionId = section.getAttribute('id');

				if (
					scrollPosition >= sectionTop &&
					scrollPosition < sectionTop + sectionHeight
				) {
					activeSection = sectionId;
				}
			});
		}

		// Remove active class from all links
		if (this.navLinks) {
			this.navLinks.forEach((link) => {
				link.classList.remove('active');
			});
		}

		if (activeSection) {
			// Set active class for the corresponding section link
			const activeLink = document.querySelector(`.nav__link[href="#${activeSection}"]`);
			if (activeLink) {
				activeLink.classList.add('active');
			}
		} else {
			// If no section is active (at top of page), activate HOME link
			if (this.homeLink) {
				this.homeLink.classList.add('active');
			}
		}
	}

	/**
	 * Setup product filters (placeholder for future enhancement)
	 */
	setupProductFilters() {
		// This would be expanded for actual filtering functionality
		console.log('🔍 Product filters initialized');
	}

	/**
	 * Setup modal functionality
	 */
	setupModal() {
		this.productModal = document.getElementById('product-modal');
		const closeButton = document.querySelector('.product-modal__close');

		if (!this.productModal) return;

		// Close button
		if (closeButton) {
			closeButton.addEventListener('click', () => this.closeModal());
		}

		// ESC key to close
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && this.productModal.open) {
				this.closeModal();
			}
		});

		// Click outside to close
		this.productModal.addEventListener('click', (event) => {
			if (event.target === this.productModal) {
				this.closeModal();
			}
		});
	}

	/**
	 * Show product modal
	 */
	showProductModal(product) {
		if (!this.productModal) return;

		// Update modal content
		const modalImage = document.querySelector('.product-modal__image');
		const modalId = document.querySelector('.product-modal__id');

		if (modalImage) {
			modalImage.src = product.image;
			modalImage.alt = product.title;
		}

		if (modalId) {
			modalId.textContent = product.id;
		}

		// Show modal using native showModal
		if (typeof this.productModal.showModal === 'function') {
			this.productModal.showModal();
		} else {
			// Fallback for older browsers
			this.productModal.setAttribute('open', '');
		}

		document.body.style.overflow = 'hidden';
		console.log('📱 Product modal opened');
	}

	/**
	 * Close modal
	 */
	closeModal() {
		if (!this.productModal) return;

		if (typeof this.productModal.close === 'function') {
			this.productModal.close();
		} else {
			// Fallback for older browsers
			this.productModal.removeAttribute('open');
		}

		document.body.style.overflow = '';
		console.log('❌ Product modal closed');
	}

	/**
	 * Load products from API
	 */
	async loadProducts() {
		try {
			this.showLoading(true);

			const url = `${this.apiUrl}?pageSize=${this.currentPageSize}&page=${this.currentPage}`;
			console.log(`🔄 Loading products from: ${url}`);

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log('📦 Products loaded:', data);

			this.renderProducts(data.data || []);
			this.updatePaginationInfo(data);
		} catch (error) {
			console.error('❌ Error loading products:', error);
			this.showError('Failed to load products. Please try again.');
		} finally {
			this.showLoading(false);
		}
	}

	/**
	 * Render products in the grid
	 */
	renderProducts(products) {
		const productGrid = document.getElementById('products-grid');
		if (!productGrid) return;

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
				const productElement = this.createProductCard(
					products[productIndex],
					productIndex + 1,
				);
				productGrid.appendChild(productElement);
				productIndex++;
			}
		}

		// If we have fewer than 5 products, still append the banner at the end
		if (!promoInserted && promoBanner) {
			productGrid.appendChild(promoBanner);
		}

		// Setup animations for new product cards
		this.setupProductCardAnimations();
		this.staggerProductCards();

		// Setup intersection observer for new elements
		const newProductCards = productGrid.querySelectorAll('.product-card--grid');
		newProductCards.forEach((card) => {
			if (this.intersectionObserver) {
				this.intersectionObserver.observe(card);
			}
		});
	}

	/**
	 * Create a product card element
	 */
	createProductCard(product, displayIndex) {
		const article = document.createElement('article');
		article.className = 'product-card product-card--grid';

		article.innerHTML = `
            <div class="product-card__id">ID: ${String(displayIndex).padStart(
		2,
		'0',
	)}</div>
            <div class="product-card__image-container">
                <img src="${product.image}" alt="${
	product.text
}" class="product-card__image" loading="lazy">
                <button class="product-card__favorite" aria-label="Add to favorites">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" stroke="currentColor" stroke-width="2" fill="none"/>
                    </svg>
                </button>
            </div>
        `;

		// Add event listeners
		const favoriteButton = article.querySelector('.product-card__favorite');
		favoriteButton.addEventListener('click', this.toggleFavorite.bind(this));

		article.addEventListener('click', this.handleProductCardClick.bind(this));

		return article;
	}

	/**
	 * Show/hide loading state
	 */
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
	}

	/**
	 * Show error message
	 */
	showError(message) {
		console.error('❌ Error:', message);

		// Add a more persistent error display here
		const productGrid = document.getElementById('products-grid');
		if (productGrid && productGrid.children.length === 0) {
			productGrid.innerHTML = `
                <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                    <p style="color: #dc3545; font-size: 1.1rem; margin-bottom: 1rem;">${message}</p>
                    <button onclick="app.loadProducts()" style="background: #1a1a1a; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            `;
		}
	}

	/**
	 * Update pagination information
	 */
	updatePaginationInfo(data) {
		// You could add pagination info display here if needed
		console.log(
			`📊 Pagination info - Current: ${
				data.currentPage || this.currentPage
			}, Total: ${data.totalPages || 'Unknown'}`,
		);
	}

	/**
	 * Recalculate product grid layout
	 */
	recalculateProductGrid() {
		// Force reflow for CSS Grid
		const grids = document.querySelectorAll('.products-grid');
		grids.forEach((grid) => {
			grid.style.display = 'none';
			grid.offsetHeight; // Trigger reflow
			grid.style.display = 'grid';
		});
	}

	/**
	 * Save favorite state to localStorage
	 */
	saveFavoriteState(button) {
		const productCard = button.closest('.product-card');
		const productId =
			productCard?.querySelector('.product-card__id')?.textContent;
		const identifier = productId || 'unknown';

		const favorites = JSON.parse(
			localStorage.getItem('formasint-favorites') || '[]',
		);
		const isFavorite = button.classList.contains('is-favorite');

		if (isFavorite) {
			if (!favorites.includes(identifier)) {
				favorites.push(identifier);
			}
		} else {
			const index = favorites.indexOf(identifier);
			if (index > -1) {
				favorites.splice(index, 1);
			}
		}

		localStorage.setItem('formasint-favorites', JSON.stringify(favorites));
	}

	/**
	 * Load favorite states from localStorage
	 */
	loadFavoriteStates() {
		const favorites = JSON.parse(
			localStorage.getItem('formasint-favorites') || '[]',
		);
		const favoriteButtons = document.querySelectorAll(
			'.product-card__favorite',
		);

		favoriteButtons.forEach((button) => {
			const productCard = button.closest('.product-card');
			const productTitle = productCard?.querySelector(
				'.product-card__title',
			)?.textContent;
			const productId =
				productCard?.querySelector('.product-card__id')?.textContent;
			const identifier = productTitle || productId || 'unknown';

			if (favorites.includes(identifier)) {
				button.classList.add('is-favorite');
				button.setAttribute('aria-label', 'Remove from favorites');
			}
		});
	}

	/**
	 * Throttle function for performance
	 */
	throttle(func, limit) {
		let inThrottle;
		return function() {
			const args = arguments;
			const context = this;
			if (!inThrottle) {
				func.apply(context, args);
				inThrottle = true;
				setTimeout(() => (inThrottle = false), limit);
			}
		};
	}

	/**
	 * Debounce function for performance
	 */
	debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}
}

// Initialize the application
const app = new FormaSintApp();

// Load favorite states when page is loaded
document.addEventListener('DOMContentLoaded', () => {
	setTimeout(() => {
		app.loadFavoriteStates();
	}, 100);
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = FormaSintApp;
}
