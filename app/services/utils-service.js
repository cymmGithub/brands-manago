const ProgressBar = require('progress');
const _ = require('lodash');

/**
 * Utility Service - Common utilities and helpers
 */
class UtilsService {

	/**
	 * Default progress bar configuration
	 */
	static get DEFAULT_PROGRESS_CONFIG() {
		return {
			complete: '=',
			incomplete: ' ',
			width: 30,
		};
	}

	/**
	 * Create a progress bar for downloading operations
	 * @param {number} total - Total number of items to process
	 * @param {string} label - Optional custom label (default: 'Downloading')
	 * @param {Object} customConfig - Optional custom progress bar configuration
	 * @returns {ProgressBar} Configured progress bar instance
	 */
	static createDownloadProgressBar(total, label = 'Downloading', customConfig = {}) {
		if (!_.isNumber(total) || total <= 0) {
			throw new Error('Total must be a positive number');
		}

		const config = _.assign({}, this.DEFAULT_PROGRESS_CONFIG, customConfig, {total});
		const format = `${label} [:bar] :current/:total :percent :etas`;

		return new ProgressBar(format, config);
	}

	/**
	 * Create a progress bar for saving operations with custom tokens
	 * @param {number} total - Total number of items to process
	 * @param {string} label - Optional custom label (default: 'Saving')
	 * @param {Object} customConfig - Optional custom progress bar configuration
	 * @returns {ProgressBar} Configured progress bar instance
	 */
	static createSaveProgressBar(total, label = 'Saving', customConfig = {}) {
		if (!_.isNumber(total) || total <= 0) {
			throw new Error('Total must be a positive number');
		}

		const config = _.assign({}, this.DEFAULT_PROGRESS_CONFIG, customConfig, {total});
		const format = `${label} [:bar] :current/:total :percent (:created created, :updated updated)`;

		return new ProgressBar(format, config);
	}

	/**
	 * Create a generic progress bar with custom format
	 * @param {number} total - Total number of items to process
	 * @param {string} format - Progress bar format string
	 * @param {Object} customConfig - Optional custom progress bar configuration
	 * @returns {ProgressBar} Configured progress bar instance
	 */
	static createProgressBar(total, format, customConfig = {}) {
		if (!_.isNumber(total) || total <= 0) {
			throw new Error('Total must be a positive number');
		}

		if (_.isEmpty(format)) {
			throw new Error('Format string is required');
		}

		const config = _.assign({}, this.DEFAULT_PROGRESS_CONFIG, customConfig, {total});

		return new ProgressBar(format, config);
	}

	/**
	 * Create a progress bar for processing operations (generic)
	 * @param {number} total - Total number of items to process
	 * @param {string} operation - Operation name (e.g., 'Processing', 'Transforming')
	 * @param {Object} customConfig - Optional custom progress bar configuration
	 * @returns {ProgressBar} Configured progress bar instance
	 */
	static createProcessingProgressBar(total, operation = 'Processing', customConfig = {}) {
		if (!_.isNumber(total) || total <= 0) {
			throw new Error('Total must be a positive number');
		}

		const config = _.assign({}, this.DEFAULT_PROGRESS_CONFIG, customConfig, {total});
		const format = `${operation} [:bar] :current/:total :percent :etas`;

		return new ProgressBar(format, config);
	}

	/**
	 * Safely increment progress bar with error handling
	 * @param {ProgressBar} progressBar - Progress bar instance
	 * @param {Object} tokens - Optional custom tokens for the progress bar
	 */
	static tickProgress(progressBar, tokens = {}) {
		if (!progressBar || typeof progressBar.tick !== 'function') {
			console.warn('Invalid progress bar instance provided to tickProgress');
			return;
		}

		try {
			if (_.isEmpty(tokens)) {
				progressBar.tick();
			} else {
				progressBar.tick(tokens);
			}
		} catch (error) {
			console.warn('Error updating progress bar:', error.message);
		}
	}

	/**
	 * Check if progress bar is complete
	 * @param {ProgressBar} progressBar - Progress bar instance
	 * @returns {boolean} True if progress bar is complete
	 */
	static isProgressComplete(progressBar) {
		if (!progressBar || typeof progressBar.complete === 'undefined') {
			return false;
		}
		return progressBar.complete;
	}

	/**
	 * Get current progress percentage
	 * @param {ProgressBar} progressBar - Progress bar instance
	 * @returns {number} Progress percentage (0-100)
	 */
	static getProgressPercentage(progressBar) {
		if (!progressBar || typeof progressBar.ratio === 'undefined') {
			return 0;
		}
		return Math.round(progressBar.ratio * 100);
	}
}

module.exports = UtilsService;
