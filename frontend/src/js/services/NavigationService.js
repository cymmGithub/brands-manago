/**
 * Navigation Service - Handles navigation behavior and mobile menu
 */
const NavigationService = (() => {
	// Private variables
	let isHovering = false;
	let navLinks = null;
	let sections = null;
	let homeLink = null;
	let mobileMenu = null;
	let mobileMenuBackdrop = null;
	let navToggle = null;

	// Private methods
	function updateActiveStates(scrollPosition) {
		if (isHovering || !sections || !navLinks) return;

		let activeSection = null;

		// Check which section is currently in view
		sections.forEach((section) => {
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

		// Remove active class from all nav links
		navLinks.forEach((link) => {
			link.classList.remove('active');
		});

		// Remove active class from all mobile menu links
		const mobileMenuLinks = document.querySelectorAll('.mobile-menu__link');
		mobileMenuLinks.forEach((link) => {
			link.classList.remove('active');
		});

		if (activeSection) {
			// Set active class for the corresponding section link
			const activeLink = document.querySelector(`.nav__link[href="#${activeSection}"]`);
			const activeMobileLink = document.querySelector(`.mobile-menu__link[href="#${activeSection}"]`);

			if (activeLink) {
				activeLink.classList.add('active');
			}
			if (activeMobileLink) {
				activeMobileLink.classList.add('active');
			}
		} else {
			// If no section is active (at top of page), activate HOME link
			if (homeLink) {
				homeLink.classList.add('active');
			}
			const homeMobileLink = document.querySelector('.mobile-menu__link[href="#"]');
			if (homeMobileLink) {
				homeMobileLink.classList.add('active');
			}
		}
	}

	function setupHoverBehavior() {
		if (!navLinks) return;

		navLinks.forEach((link) => {
			link.addEventListener('mouseenter', () => {
				isHovering = true;
				// Remove active class from all links when hovering starts
				navLinks.forEach((navLink) => {
					navLink.classList.remove('active');
				});
			});

			link.addEventListener('mouseleave', () => {
				isHovering = false;
				// Restore active state after hover ends
				controller.updateNavigationState();
			});
		});
	}

	function setupSmoothScrolling() {
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
						controller.updateNavigationState();
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
							controller.updateNavigationState();
						}, 500); // Longer delay for smooth scroll animation
					}
				}

				// Close mobile menu if open
				controller.closeMobileMenu();
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
					controller.updateNavigationState();
				}, 100);

				// Close mobile menu if open
				controller.closeMobileMenu();
			});
		}
	}

	// Public controller
	const controller = {
		// Initialize navigation
		init() {
			navLinks = document.querySelectorAll('.nav__link');
			sections = document.querySelectorAll('section[id]');
			homeLink = document.querySelector('.nav__link[href="#"]');
			mobileMenu = document.getElementById('mobile-menu');
			mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');
			navToggle = document.querySelector('.nav__toggle');

			// Set HOME link as active initially
			if (homeLink) {
				homeLink.classList.add('active');
			}

			setupHoverBehavior();
			setupSmoothScrolling();
			controller.setupMobileMenu();
		},

		// Update navigation active state based on scroll position
		updateNavigationState() {
			const scrollPosition = window.scrollY + 100;
			updateActiveStates(scrollPosition);
		},

		// Update navigation state for optimized scroll (with cached scroll position)
		updateNavigationStateFromScroll(scrollPosition) {
			updateActiveStates(scrollPosition + 100);
		},

		// Mobile menu controls
		openMobileMenu() {
			if (mobileMenu) {
				mobileMenu.classList.add('mobile-menu--open');
			}

			if (mobileMenuBackdrop) {
				mobileMenuBackdrop.classList.add('mobile-menu-backdrop--open');
			}

			if (navToggle) {
				navToggle.setAttribute('aria-expanded', 'true');
			}

			// Prevent body scroll when menu is open
			document.body.style.overflow = 'hidden';
		},

		closeMobileMenu() {
			if (mobileMenu) {
				mobileMenu.classList.remove('mobile-menu--open');
			}

			if (mobileMenuBackdrop) {
				mobileMenuBackdrop.classList.remove('mobile-menu-backdrop--open');
			}

			if (navToggle) {
				navToggle.setAttribute('aria-expanded', 'false');
			}

			document.body.style.overflow = '';
		},

		setupMobileMenu() {
			const mobileMenuClose = document.querySelector('.mobile-menu__close');

			if (navToggle) {
				navToggle.addEventListener('click', controller.openMobileMenu);
			}

			if (mobileMenuClose) {
				mobileMenuClose.addEventListener('click', controller.closeMobileMenu);
			}

			if (mobileMenuBackdrop) {
				mobileMenuBackdrop.addEventListener('click', controller.closeMobileMenu);
			}

			// Mobile menu links
			const mobileMenuLinks = document.querySelectorAll('.mobile-menu__link');
			mobileMenuLinks.forEach((link) => {
				link.addEventListener('click', () => {
					controller.closeMobileMenu();
				});
			});

			// ESC key to close mobile menu
			document.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					if (mobileMenu && mobileMenu.classList.contains('mobile-menu--open')) {
						controller.closeMobileMenu();
					}
				}
			});
		},
	};

	return controller;
})();
