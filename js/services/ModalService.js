/**
 * Modal Service - Manages modal dialogs throughout the application
 */
const ModalService = (() => {
	// Private variables
	let currentModal = null;

	// Private methods
	function setupModalEventListeners(modal) {
		if (!modal) return;

		const closeButton = modal.querySelector('.product-modal__close');

		// Close button
		if (closeButton) {
			closeButton.addEventListener('click', () => controller.close());
		}

		// ESC key to close
		const handleEscape = (event) => {
			if (event.key === 'Escape' && modal.open) {
				controller.close();
			}
		};

		// Click outside to close
		const handleClickOutside = (event) => {
			if (event.target === modal) {
				controller.close();
			}
		};

		document.addEventListener('keydown', handleEscape);
		modal.addEventListener('click', handleClickOutside);

		// Store cleanup functions
		modal._cleanupFunctions = [
			() => document.removeEventListener('keydown', handleEscape),
			() => modal.removeEventListener('click', handleClickOutside),
		];
	}

	function cleanupModalEventListeners(modal) {
		if (modal && modal._cleanupFunctions) {
			modal._cleanupFunctions.forEach(cleanup => cleanup());
			delete modal._cleanupFunctions;
		}
	}

	// Public controller
	const controller = {
		// Show product modal
		showProduct(product) {
			const modal = document.getElementById('product-modal');
			if (!modal) {
				return;
			}

			// Update modal content
			const modalImage = modal.querySelector('.product-modal__image');
			const modalId = modal.querySelector('.product-modal__id');

			if (modalImage) {
				modalImage.src = product.image;
				modalImage.alt = product.title || product.id;
			}

			if (modalId) {
				modalId.textContent = product.id;
			}

			// Setup event listeners if not already done
			if (!modal._cleanupFunctions) {
				setupModalEventListeners(modal);
			}

			// Show modal using native showModal
			if (typeof modal.showModal === 'function') {
				modal.showModal();
			} else {
				// Fallback for older browsers
				modal.setAttribute('open', '');
			}

			currentModal = modal;
			document.body.style.overflow = 'hidden';
		},

		// Close current modal
		close() {
			if (!currentModal) return;

			if (typeof currentModal.close === 'function') {
				currentModal.close();
			} else {
				// Fallback for older browsers
				currentModal.removeAttribute('open');
			}

			document.body.style.overflow = '';

			// Clean up event listeners
			cleanupModalEventListeners(currentModal);
			currentModal = null;
		},
	};

	return controller;
})();
