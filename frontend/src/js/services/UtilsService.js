/**
 * Utils Service - Provides utility functions used throughout the application
 */
const UtilsService = (() => {
	// Public controller
	const controller = {
		// Throttle function for performance
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
		},

		// Animation helpers
		addClickAnimation(element, className = 'clicked', duration = 300) {
			element.classList.add(className);
			setTimeout(() => {
				element.classList.remove(className);
			}, duration);
		},
	};

	return controller;
})();
