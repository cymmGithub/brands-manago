/**
 * Scroll Service - Handles scroll-based effects like parallax and header states
 */
const ScrollService = (() => {
	// Private variables
	let ticking = false;
	let lastKnownScrollPosition = 0;
	let isHeroVisible = true;
	let headerHeight = null;
	let heroImageContainerTop = null;
	let windowHeight = null;

	// Private methods
	function updateHeroParallax(scrollY) {
		const heroImage = document.querySelector('.hero__image');
		const heroImageContainer = document.querySelector('.hero__image-container');
		const header = document.querySelector('.header');

		if (heroImage && heroImageContainer && header) {
			// Cache these values to avoid repeated DOM queries
			if (!headerHeight) {
				headerHeight = header.offsetHeight;
			}
			if (!heroImageContainerTop) {
				heroImageContainerTop = heroImageContainer.offsetTop;
			}
			if (!windowHeight) {
				windowHeight = window.innerHeight;
			}

			const startParallaxAt = heroImageContainerTop - headerHeight;

			// Only apply parallax when container starts touching navbar and while still in viewport
			if (scrollY >= startParallaxAt && scrollY < windowHeight) {
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

	function updateHeaderState(scrollY) {
		const header = document.querySelector('.header');

		// Add/remove header shadow based on scroll
		if (scrollY > 50) {
			header?.classList.add('header--scrolled');
		} else {
			header?.classList.remove('header--scrolled');
		}
	}

	function setupHeroVisibilityObserver() {
		const heroSection = document.querySelector('.hero');
		if (!heroSection) return;

		const heroObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				isHeroVisible = entry.isIntersecting;
			});
		}, {
			threshold: 0,
			rootMargin: '50px 0px 50px 0px',
		});

		heroObserver.observe(heroSection);
	}

	// Public controller
	const controller = {
		// Initialize scroll service
		init() {
			setupHeroVisibilityObserver();

			// Setup scroll event listener with requestAnimationFrame optimization
			window.addEventListener('scroll', controller.handleScrollEvent, {passive: true});

			// Setup resize listener
			window.addEventListener(
				'resize',
				UtilsService.throttle(controller.handleResize, 250),
			);
		},

		// Handle scroll events with requestAnimationFrame optimization
		handleScrollEvent() {
			lastKnownScrollPosition = window.scrollY;

			if (!ticking) {
				requestAnimationFrame(controller.updateScrollEffects);
				ticking = true;
			}
		},

		// Update scroll effects using requestAnimationFrame
		updateScrollEffects() {
			const scrollY = lastKnownScrollPosition;

			updateHeaderState(scrollY);

			// Only run parallax if hero section is visible
			if (isHeroVisible) {
				updateHeroParallax(scrollY);
			}

			// Update navigation state
			NavigationService.updateNavigationStateFromScroll(scrollY);

			ticking = false;
		},

		// Handle window resize
		handleResize() {
			// Reset cached values on resize
			headerHeight = null;
			heroImageContainerTop = null;
			windowHeight = null;

			// Close mobile menu on resize to desktop
			if (window.innerWidth > 768) {
				NavigationService.closeMobileMenu();
			}
		},

		// Get current scroll position
		getScrollPosition() {
			return lastKnownScrollPosition;
		},

		// Check if hero is visible
		isHeroVisible() {
			return isHeroVisible;
		},
	};

	return controller;
})();
