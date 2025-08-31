/**
 * Order Service - Handles order-related functionality including CSV download
 */
const OrderService = (() => {
	// Private variables
	const API_BASE_URL = '/api';
	let isDownloading = false;

	// Private methods
	function showNotification(message, type = 'info') {
		// Simple notification system - you can enhance this as needed
		console.log(`${type.toUpperCase()}: ${message}`);

		// Create a simple toast notification
		const toast = document.createElement('div');
		toast.className = `toast toast--${type}`;
		toast.textContent = message;
		toast.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 12px 20px;
			background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
			color: white;
			border-radius: 4px;
			z-index: 9999;
			font-family: Inter, sans-serif;
			font-size: 14px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			transition: opacity 0.3s ease;
		`;

		document.body.appendChild(toast);

		// Auto-remove after 3 seconds
		setTimeout(() => {
			toast.style.opacity = '0';
			setTimeout(() => {
				if (document.body.contains(toast)) {
					document.body.removeChild(toast);
				}
			}, 300);
		}, 3000);
	}

	function updateDownloadButton(downloading) {
		const button = document.getElementById('download-orders-btn');
		if (!button) return;

		const buttonText = button.querySelector('.download-btn-text');
		const buttonIcon = button.querySelector('.developer-tool__button-icon');

		if (downloading) {
			button.disabled = true;
			button.classList.add('downloading');
			if (buttonText) buttonText.textContent = 'Downloading...';
			if (buttonIcon) {
				buttonIcon.style.animation = 'spin 1s linear infinite';
			}
		} else {
			button.disabled = false;
			button.classList.remove('downloading');
			if (buttonText) buttonText.textContent = 'Download All Orders CSV';
			if (buttonIcon) {
				buttonIcon.style.animation = '';
			}
		}
	}

	function updateSingleDownloadButton(downloading) {
		const button = document.getElementById('download-single-order-btn');
		if (!button) return;

		const buttonText = button.querySelector('.download-single-btn-text');
		const buttonIcon = button.querySelector('.developer-tool__button-icon');

		if (downloading) {
			button.disabled = true;
			button.classList.add('downloading');
			if (buttonText) buttonText.textContent = 'Downloading...';
			if (buttonIcon) {
				buttonIcon.style.animation = 'spin 1s linear infinite';
			}
		} else {
			const input = document.getElementById('order-serial-input');
			const hasValue = input && input.value.trim().length > 0;
			button.disabled = !hasValue;
			button.classList.remove('downloading');
			if (buttonText) buttonText.textContent = 'Download Order CSV';
			if (buttonIcon) {
				buttonIcon.style.animation = '';
			}
		}
	}

	// Public controller
	const controller = {
		// Initialize the service
		init() {
			// Setup download button event listeners
			const downloadBtn = document.getElementById('download-orders-btn');
			if (downloadBtn) {
				downloadBtn.addEventListener('click', controller.downloadOrdersCSV);
			}

			const singleDownloadBtn = document.getElementById('download-single-order-btn');
			if (singleDownloadBtn) {
				singleDownloadBtn.addEventListener('click', controller.downloadSingleOrderCSV);
			}

			// Setup input validation for single order download
			const orderInput = document.getElementById('order-serial-input');
			if (orderInput) {
				orderInput.addEventListener('input', controller.handleInputChange);
				orderInput.addEventListener('keypress', (e) => {
					if (e.key === 'Enter' && !singleDownloadBtn.disabled) {
						controller.downloadSingleOrderCSV();
					}
				});
			}
		},

		// Handle input change to enable/disable download button
		handleInputChange() {
			updateSingleDownloadButton(false);
		},

		// Download orders as CSV
		async downloadOrdersCSV() {
			if (isDownloading) {
				return;
			}

			try {
				isDownloading = true;
				updateDownloadButton(true);

				showNotification('Preparing CSV download...', 'info');

				const response = await fetch(`${API_BASE_URL}/orders/download-csv`, {
					method: 'GET',
					headers: {
						Accept: 'text/csv',
					},
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				// Get the CSV content
				const csvContent = await response.text();

				// Get filename from Content-Disposition header or use default
				const contentDisposition = response.headers.get('Content-Disposition');
				let filename = 'orders-export.csv';
				if (contentDisposition) {
					const filenameMatch = contentDisposition.match(/filename="(.+)"/);
					if (filenameMatch) {
						filename = filenameMatch[1];
					}
				}

				// Create blob and download link
				const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
				const link = document.createElement('a');

				// Create download URL
				const url = URL.createObjectURL(blob);
				link.href = url;
				link.download = filename;

				// Trigger download
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				// Clean up
				URL.revokeObjectURL(url);

				showNotification('CSV file downloaded successfully!', 'success');

			} catch (error) {
				console.error('Error downloading CSV:', error);
				showNotification('Failed to download CSV file. Please try again.', 'error');
			} finally {
				isDownloading = false;
				updateDownloadButton(false);
			}
		},

		// Download single order as CSV
		async downloadSingleOrderCSV() {
			if (isDownloading) {
				return;
			}

			const orderInput = document.getElementById('order-serial-input');
			if (!orderInput) {
				showNotification('Input field not found', 'error');
				return;
			}

			const externalSerialNumber = orderInput.value.trim();
			if (!externalSerialNumber) {
				showNotification('Please enter an external serial number', 'error');
				return;
			}

			try {
				isDownloading = true;
				updateSingleDownloadButton(true);

				showNotification(`Searching for order: ${externalSerialNumber}...`, 'info');

				const response = await fetch(`${API_BASE_URL}/orders/download-csv/${encodeURIComponent(externalSerialNumber)}`, {
					method: 'GET',
					headers: {
						Accept: 'text/csv',
					},
				});

				if (response.status === 404) {
					throw new Error(`Order with serial number '${externalSerialNumber}' not found`);
				}

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				// Get the CSV content
				const csvContent = await response.text();

				// Get filename from Content-Disposition header or use default
				const contentDisposition = response.headers.get('Content-Disposition');
				let filename = `order-${externalSerialNumber}.csv`;
				if (contentDisposition) {
					const filenameMatch = contentDisposition.match(/filename="(.+)"/);
					if (filenameMatch) {
						filename = filenameMatch[1];
					}
				}

				// Create blob and download link
				const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
				const link = document.createElement('a');

				// Create download URL
				const url = URL.createObjectURL(blob);
				link.href = url;
				link.download = filename;

				// Trigger download
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				// Clean up
				URL.revokeObjectURL(url);

				showNotification(`Order ${externalSerialNumber} downloaded successfully!`, 'success');

				// Clear the input field after successful download
				orderInput.value = '';
				updateSingleDownloadButton(false);

			} catch (error) {
				console.error('Error downloading single order CSV:', error);
				showNotification(error.message || 'Failed to download order CSV. Please try again.', 'error');
			} finally {
				isDownloading = false;
				updateSingleDownloadButton(false);
			}
		},
	};

	return controller;
})();

