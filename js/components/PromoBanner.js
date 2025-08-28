/**
 * Promo Banner Component - Manages the promotional banner in the product grid
 */
const PromoBanner = (() => {
	// Private variables
	let intersectionObserver = null;
	const STORAGE_KEY = 'formasint_promo_banner_seen';

	// Promo banner data - can be easily updated or made dynamic
	const promoBannerData = {
		brand: "FORMA'SINT",
		title: "You'll look and feel like the champion.",
		ctaText: 'Check this out →',
		video: 'assets/videos/promo-banner-skis.mp4',
		fallbackImage: 'assets/images/promo-banner-skis.jpg',
		videoAlt: "Climber in action wearing Forma'Sint gear",
	};

	// Local storage methods
	function hasBeenSeen() {
		try {
			return localStorage.getItem(STORAGE_KEY) === 'true';
		} catch (error) {
			console.warn('LocalStorage not available:', error);
			return false;
		}
	}

	function markAsSeen() {
		try {
			localStorage.setItem(STORAGE_KEY, 'true');
		} catch (error) {
			console.warn('Could not save to LocalStorage:', error);
		}
	}

	function resetSeenStatus() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.warn('Could not remove from LocalStorage:', error);
		}
	}

	function shouldShowBanner() {
		return !hasBeenSeen();
	}

	// Private methods
	function createPromoBanner() {
		const promoBannerHtml = `
			<div class="promo-banner">
				<div class="promo-banner__content">
					<p class="promo-banner__brand">${promoBannerData.brand}</p>
					<h3 class="promo-banner__title">
						${promoBannerData.title}
					</h3>
					<button class="promo-banner__cta">${promoBannerData.ctaText}</button>
				</div>
				<div class="promo-banner__video-container">
					<video
						src="${promoBannerData.video}"
						class="promo-banner__video"
						autoplay
						muted
						loop
						playsinline
						preload="metadata"
						aria-label="${promoBannerData.videoAlt}"
					></video>
					<div class="promo-banner__video-mask"></div>
					<img
						src="${promoBannerData.fallbackImage}"
						alt="${promoBannerData.videoAlt}"
						class="promo-banner__fallback-image"
						style="display: none;"
					/>
				</div>
			</div>
		`;

		return promoBannerHtml;
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
					// Mark as seen when the banner comes into view
					markAsSeen();
				}
			});
		}, observerOptions);
	}

	function handleCtaClick(event) {
		event.preventDefault();

		const button = event.currentTarget;

		// Mark banner as seen when CTA is clicked
		markAsSeen();

		// Add click animation
		UtilsService.addClickAnimation(button, 'cta-clicked');

		// Add your custom action here (e.g., navigation, modal, etc.)
		alert('Promo banner clicked! This can be customized to any action.');
	}

	function handleVideoError() {
		const video = document.querySelector('.promo-banner__video');
		const fallbackImage = document.querySelector('.promo-banner__fallback-image');

		if (video && fallbackImage) {
			video.style.display = 'none';
			fallbackImage.style.display = 'block';
		}
	}

	function setupEventListeners() {
		const ctaButton = document.querySelector('.promo-banner__cta');
		const video = document.querySelector('.promo-banner__video');

		if (ctaButton) {
			ctaButton.addEventListener('click', handleCtaClick);
		}

		if (video) {
			video.addEventListener('canplaythrough', () => {
				video.classList.add('loaded');
			});

			video.addEventListener('error', handleVideoError);

			// Pause video when not in view for performance
			const observerOptions = {
				threshold: 0.1,
				rootMargin: '50px 0px 50px 0px',
			};

			const videoObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && video.style.display !== 'none') {
						video.play().catch(handleVideoError);
					} else {
						video.pause();
					}
				});
			}, observerOptions);

			videoObserver.observe(video);
		}
	}

	function insertPromoBanner(container) {
		if (!container) return null;

		const promoBannerHtml = createPromoBanner();
		container.insertAdjacentHTML('beforeend', promoBannerHtml);

		// Setup event listeners after inserting
		setupEventListeners();

		// Setup intersection observer
		const promoBannerElement = container.querySelector('.promo-banner');
		if (promoBannerElement && intersectionObserver) {
			intersectionObserver.observe(promoBannerElement);
		}

		return promoBannerElement;
	}

	// Public controller
	const controller = {
		// Initialize promo banner component
		init() {
			setupIntersectionObserver();
		},

		// Render promo banner in specified container
		render(container) {
			if (!container) {
				console.warn('PromoBanner.render: No container provided');
				return null;
			}

			// Check if banner should be shown
			if (!shouldShowBanner()) {
				return null;
			}

			return insertPromoBanner(container);
		},

		// Get promo banner element if it exists
		getElement() {
			return document.querySelector('.promo-banner');
		},

		// Update promo banner data
		updateData(newData) {
			Object.assign(promoBannerData, newData);

			// If banner exists, update it
			const existingBanner = this.getElement();
			if (existingBanner) {
				const container = existingBanner.parentElement;
				existingBanner.remove();
				this.render(container);
			}
		},

		// Get current promo banner data
		getData() {
			return {...promoBannerData};
		},

		// Remove promo banner
		remove() {
			const promoBannerElement = this.getElement();
			if (promoBannerElement) {
				promoBannerElement.remove();
			}
		},

		// Show/hide promo banner
		setVisibility(isVisible) {
			const promoBannerElement = this.getElement();
			if (promoBannerElement) {
				promoBannerElement.style.display = isVisible ? 'grid' : 'none';
			}
		},

		// Refresh event listeners (useful after dynamic updates)
		refreshEventListeners() {
			setupEventListeners();
		},

		// Check if promo banner has been seen
		hasBeenSeen() {
			return hasBeenSeen();
		},

		// Check if promo banner should be shown
		shouldShow() {
			return shouldShowBanner();
		},

		// Force show the banner (ignores seen status)
		forceRender(container) {
			if (!container) {
				console.warn('PromoBanner.forceRender: No container provided');
				return null;
			}

			return insertPromoBanner(container);
		},

		// Reset the seen status (for testing or admin purposes)
		resetSeenStatus() {
			resetSeenStatus();
		},

		// Manually mark as seen
		markAsSeen() {
			markAsSeen();
		},
	};

	return controller;
})();
