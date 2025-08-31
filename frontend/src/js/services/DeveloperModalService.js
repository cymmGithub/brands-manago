/**
 * Developer Modal Service - Handles the developer tools modal functionality
 */
const DeveloperModalService = (() => {
	// Private variables
	let isInitialized = false;
	let isModalOpen = false;

	// Private DOM elements
	let developerButton = null;
	let modal = null;
	let backdrop = null;
	let closeButton = null;
	let apiStatusElement = null;

	// Private methods
	function bindElements() {
		developerButton = document.getElementById('developer-tools-btn');
		modal = document.getElementById('developer-modal');
		backdrop = document.getElementById('developer-modal-backdrop');
		closeButton = document.getElementById('developer-modal-close');
		apiStatusElement = document.getElementById('api-status');
	}

	function setupEventListeners() {
		if (!developerButton || !modal || !backdrop || !closeButton) {
			console.error('Developer modal elements not found');
			return;
		}

		// Open modal when developer button is clicked
		developerButton.addEventListener('click', (e) => {
			e.preventDefault();
			controller.openModal();
		});

		// Close modal when close button is clicked
		closeButton.addEventListener('click', (e) => {
			e.preventDefault();
			controller.closeModal();
		});

		// Close modal when backdrop is clicked
		backdrop.addEventListener('click', (e) => {
			if (e.target === backdrop) {
				controller.closeModal();
			}
		});

		// Close modal on Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && isModalOpen) {
				controller.closeModal();
			}
		});

		// Prevent scroll when modal is open
		document.addEventListener('keydown', (e) => {
			if (
				isModalOpen &&
				(e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ')
			) {
				// Allow scrolling within modal content
				if (!modal.contains(e.target)) {
					e.preventDefault();
				}
			}
		});
	}

	function updateBodyScroll(disable) {
		if (disable) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	async function checkApiStatus() {
		if (!apiStatusElement) return;

		try {
			apiStatusElement.textContent = 'Checking...';
			apiStatusElement.className = 'developer-info__value api-status';

			const response = await fetch('/api/orders/download-csv', {
				method: 'HEAD', // Just check if endpoint exists
			});

			if (response.ok || response.status === 405) {
				// 405 means method not allowed but endpoint exists
				apiStatusElement.textContent = 'Online';
				apiStatusElement.className = 'developer-info__value api-status online';
			} else {
				throw new Error(`HTTP ${response.status}`);
			}
		} catch (_error) {
			apiStatusElement.textContent = 'Offline';
			apiStatusElement.className = 'developer-info__value api-status offline';
		}
	}

	// Public controller
	const controller = {
		// Initialize the service
		init() {
			if (isInitialized) {
				return;
			}

			bindElements();
			setupEventListeners();

			isInitialized = true;
		},

		// Open the developer modal
		openModal() {
			if (!modal || !backdrop) return;

			isModalOpen = true;

			// Add active classes
			backdrop.classList.add('active');
			modal.classList.add('active');

			// Disable body scroll
			updateBodyScroll(true);

			// Focus on close button for accessibility
			setTimeout(() => {
				closeButton?.focus();
			}, 300);

			// Check API status when modal opens
			checkApiStatus();

			console.log('Developer tools modal opened');
		},

		// Close the developer modal
		closeModal() {
			if (!modal || !backdrop) return;

			isModalOpen = false;

			// Remove active classes
			backdrop.classList.remove('active');
			modal.classList.remove('active');

			// Re-enable body scroll
			updateBodyScroll(false);

			// Return focus to the developer button
			developerButton?.focus();

			console.log('Developer tools modal closed');
		},

		// Check if modal is currently open
		isOpen() {
			return isModalOpen;
		},
	};

	return controller;
})();
