/**
 * Forma'Sint Website - Main JavaScript
 * Handles navigation, product interactions, and responsive behavior
 */

class FormaSintApp {
    constructor() {
        this.apiUrl = 'https://brandstestowy.smallhost.pl/api/random';
        this.currentPageSize = 14;
        this.currentPage = 1;
        this.promoInsertPosition = 5; // Insert promo banner after 5th product
        this.productModal = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupIntersectionObserver();
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
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16));
        window.addEventListener('resize', this.throttle(this.handleResize.bind(this), 250));

        // Navigation toggle
        const navToggle = document.querySelector('.nav__toggle');
        if (navToggle) {
            navToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }

        // Product card favorites
        const favoriteButtons = document.querySelectorAll('.product-card__favorite');
        favoriteButtons.forEach(button => {
            button.addEventListener('click', this.toggleFavorite.bind(this));
        });

        // Promotional banner CTA
        const promoCTA = document.querySelector('.promo-banner__cta');
        if (promoCTA) {
            promoCTA.addEventListener('click', this.handlePromoCTA.bind(this));
        }

        // Product pagination
        const paginationSelect = document.querySelector('.products__pagination-select');
        if (paginationSelect) {
            paginationSelect.addEventListener('change', this.handlePaginationChange.bind(this));
        }

        // Product card clicks
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
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

        console.log('🏔️ Forma\'Sint website loaded successfully!');
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        const scrollY = window.scrollY;
        const header = document.querySelector('.header');

        // Add/remove header shadow based on scroll
        if (scrollY > 50) {
            header?.classList.add('header--scrolled');
        } else {
            header?.classList.remove('header--scrolled');
        }

        // Parallax effect for hero image
        const heroImage = document.querySelector('.hero__image');
        if (heroImage && scrollY < window.innerHeight) {
            const parallaxSpeed = 0.5;
            heroImage.style.transform = `translateY(${scrollY * parallaxSpeed}px)`;
        }
    }

    /**
     * Handle window resize events
     */
    handleResize() {
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
                block: 'start'
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
        const productTitle = card.querySelector('.product-card__title')?.textContent;
        const productId = card.querySelector('.product-card__id')?.textContent;
        const productImage = card.querySelector('.product-card__image')?.src;
        const productPrice = card.querySelector('.product-card__price')?.textContent;

        console.log(`🛍️ Product clicked: ${productTitle || productId}`);

        // Add click animation
        card.classList.add('product-clicked');
        setTimeout(() => {
            card.classList.remove('product-clicked');
        }, 300);

        // Show product modal
        this.showProductModal({
            title: productTitle,
            id: productId,
            image: productImage,
            price: productPrice,
            isFavorite: card.querySelector('.product-card__favorite')?.classList.contains('is-favorite')
        });
    }

    /**
     * Setup intersection observer for animations
     */
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, observerOptions);

        // Observe sections and product cards
        const elementsToObserve = document.querySelectorAll('.featured, .products, .product-card, .promo-banner');
        elementsToObserve.forEach(el => this.intersectionObserver.observe(el));
    }

    /**
     * Setup smooth scrolling for navigation links
     */
    setupSmoothScrolling() {
        const navLinks = document.querySelectorAll('.nav__link[href^="#"]');

        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();

                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 80;
                    const targetPosition = targetElement.offsetTop - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Close mobile menu if open
                    this.closeMobileMenu();
                }
            });
        });
    }

    /**
     * Setup product card hover animations
     */
    setupProductCardAnimations() {
        const productCards = document.querySelectorAll('.product-card');

        productCards.forEach(card => {
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
            heroTitleImage.style.transition = 'opacity 0.8s ease, transform 0.8s ease';

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
                entries.forEach(entry => {
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
            lazyImages.forEach(img => imageObserver.observe(img));
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

        const updateActiveNav = () => {
            const scrollPosition = window.scrollY + 100;

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        };

        window.addEventListener('scroll', this.throttle(updateActiveNav, 100));
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
        if (!this.productModal) return;

        // Close button
        const closeButton = this.productModal.querySelector('.product-modal__close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeModal());
        }

        // Backdrop click to close
        const backdrop = this.productModal.querySelector('.product-modal__backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeModal());
        }

        // ESC key to close
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.productModal.open) {
                this.closeModal();
            }
        });

        // Modal favorite button
        const modalFavoriteButton = this.productModal.querySelector('.product-modal__favorite');
        if (modalFavoriteButton) {
            modalFavoriteButton.addEventListener('click', (event) => {
                this.toggleModalFavorite(event);
            });
        }

        // Modal CTA button
        const modalCTA = this.productModal.querySelector('.product-modal__cta');
        if (modalCTA) {
            modalCTA.addEventListener('click', () => {
                console.log('🎯 Product details page would open here');
                this.closeModal();
            });
        }
    }

    /**
     * Show product modal
     */
    showProductModal(product) {
        if (!this.productModal) return;

        // Update modal content
        const modalImage = this.productModal.querySelector('.product-modal__image');
        const modalTitle = this.productModal.querySelector('.product-modal__title');
        const modalId = this.productModal.querySelector('.product-modal__id');
        const modalPrice = this.productModal.querySelector('.product-modal__price');
        const modalFavorite = this.productModal.querySelector('.product-modal__favorite');
        const modalFavoriteText = this.productModal.querySelector('.product-modal__favorite-text');

        if (modalImage) {
            modalImage.src = product.image;
            modalImage.alt = product.title;
        }

        if (modalTitle) {
            modalTitle.textContent = product.title;
        }

        if (modalId) {
            modalId.textContent = product.id;
        }

        if (modalPrice) {
            modalPrice.textContent = product.price;
        }

        if (modalFavorite) {
            modalFavorite.classList.toggle('is-favorite', product.isFavorite);
            modalFavorite.setAttribute('data-product-id', product.id);
            modalFavorite.setAttribute('data-product-title', product.title);
        }

        if (modalFavoriteText) {
            modalFavoriteText.textContent = product.isFavorite ? 'Remove from favorites' : 'Add to favorites';
        }

        // Show modal
        this.productModal.showModal();
        document.body.style.overflow = 'hidden';

        console.log('📱 Product modal opened');
    }

    /**
     * Close modal
     */
    closeModal() {
        if (!this.productModal) return;

        this.productModal.close();
        document.body.style.overflow = '';

        console.log('❌ Product modal closed');
    }

    /**
     * Toggle favorite in modal
     */
    toggleModalFavorite(event) {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const productId = button.getAttribute('data-product-id');
        const productTitle = button.getAttribute('data-product-title');
        const isFavorite = button.classList.contains('is-favorite');

        button.classList.toggle('is-favorite');

        // Update text
        const favoriteText = button.querySelector('.product-modal__favorite-text');
        if (favoriteText) {
            favoriteText.textContent = isFavorite ? 'Add to favorites' : 'Remove from favorites';
        }

        // Add animation
        button.classList.add('favorite-animate');
        setTimeout(() => {
            button.classList.remove('favorite-animate');
        }, 300);

        // Update the corresponding card in the grid
        this.updateGridFavoriteState(productId, productTitle, !isFavorite);

        // Save state
        this.saveModalFavoriteState(productId, productTitle, !isFavorite);
    }

    /**
     * Update favorite state in the product grid
     */
    updateGridFavoriteState(productId, productTitle, isFavorite) {
        const productCards = document.querySelectorAll('.product-card--grid');

        productCards.forEach(card => {
            const cardId = card.querySelector('.product-card__id')?.textContent;
            const cardTitle = card.querySelector('.product-card__title')?.textContent;

            if (cardId === productId || cardTitle === productTitle) {
                const favoriteButton = card.querySelector('.product-card__favorite');
                if (favoriteButton) {
                    favoriteButton.classList.toggle('is-favorite', isFavorite);
                    favoriteButton.setAttribute('aria-label', isFavorite ? 'Remove from favorites' : 'Add to favorites');
                }
            }
        });
    }

    /**
     * Save modal favorite state
     */
    saveModalFavoriteState(productId, productTitle, isFavorite) {
        const identifier = productTitle || productId || 'unknown';
        const favorites = JSON.parse(localStorage.getItem('formasint-favorites') || '[]');

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

        // Render products
        products.forEach((product, index) => {
            // Insert promo banner after specified position
            if (index === this.promoInsertPosition && promoBanner) {
                productGrid.appendChild(promoBanner);
            }

            const productElement = this.createProductCard(product, index + 1);
            productGrid.appendChild(productElement);
        });

        // If we haven't inserted the promo banner yet (less products than insert position)
        if (products.length <= this.promoInsertPosition && promoBanner) {
            productGrid.appendChild(promoBanner);
        }

        // Setup animations for new product cards
        this.setupProductCardAnimations();
        this.staggerProductCards();

        // Setup intersection observer for new elements
        const newProductCards = productGrid.querySelectorAll('.product-card--grid');
        newProductCards.forEach(card => {
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
            <div class="product-card__id">ID: ${String(displayIndex).padStart(2, '0')}</div>
            <div class="product-card__image-container">
                <img src="${product.image}" alt="${product.text}" class="product-card__image" loading="lazy">
                <button class="product-card__favorite" aria-label="Add to favorites">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" stroke="currentColor" stroke-width="2" fill="none"/>
                    </svg>
                </button>
            </div>
            <div class="product-card__content">
                <h3 class="product-card__title">${product.text}</h3>
                <p class="product-card__price">€${(Math.random() * 200 + 100).toFixed(2)} EUR</p>
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
        console.log(`📊 Pagination info - Current: ${data.currentPage || this.currentPage}, Total: ${data.totalPages || 'Unknown'}`);
    }

    /**
     * Recalculate product grid layout
     */
    recalculateProductGrid() {
        // Force reflow for CSS Grid
        const grids = document.querySelectorAll('.products-grid');
        grids.forEach(grid => {
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
        const productTitle = productCard?.querySelector('.product-card__title')?.textContent;
        const productId = productCard?.querySelector('.product-card__id')?.textContent;
        const identifier = productTitle || productId || 'unknown';

        const favorites = JSON.parse(localStorage.getItem('formasint-favorites') || '[]');
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
        const favorites = JSON.parse(localStorage.getItem('formasint-favorites') || '[]');
        const favoriteButtons = document.querySelectorAll('.product-card__favorite');

        favoriteButtons.forEach(button => {
            const productCard = button.closest('.product-card');
            const productTitle = productCard?.querySelector('.product-card__title')?.textContent;
            const productId = productCard?.querySelector('.product-card__id')?.textContent;
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
                setTimeout(() => inThrottle = false, limit);
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
