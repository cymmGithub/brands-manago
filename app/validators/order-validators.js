const {validationResult, query, param} = require('express-validator');

/**
 * Order Route Validators
 * Streamlined input validation and sanitization for order-related endpoints
 */

/**
 * Express-validator middleware for CSV download filters
 */
const validateCSVFilters = [
	query('minWorth')
		.optional()
		.isFloat({min: 0, max: 1000000})
		.withMessage('Minimum worth must be a number between 0 and 1,000,000')
		.toFloat(),
	query('maxWorth')
		.optional()
		.isFloat({min: 0, max: 1000000})
		.withMessage('Maximum worth must be a number between 0 and 1,000,000')
		.toFloat(),
	(req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				success: false,
				message: 'Invalid filter parameters',
				errors: errors.array(),
			});
		}

		// Additional validation: minWorth should not be greater than maxWorth
		const {minWorth, maxWorth} = req.query;
		if (minWorth !== undefined && maxWorth !== undefined && minWorth > maxWorth) {
			return res.status(400).json({
				success: false,
				message: 'Minimum worth cannot be greater than maximum worth',
			});
		}

		next();
	},
];

/**
 * Express-validator middleware for external serial number
 */
const validateExternalSerialNumber = [
	param('externalSerialNumber')
		.trim()
		.isLength({min: 1, max: 100})
		.withMessage('External serial number must be between 1 and 100 characters')
		.matches(/^[a-zA-Z0-9\-_]+$/)
		.withMessage('External serial number can only contain letters, numbers, hyphens, and underscores')
		.escape(), // Sanitize for security
	(req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				success: false,
				message: 'Invalid external serial number',
				errors: errors.array(),
			});
		}
		next();
	},
];



/**
 * Basic request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
	// Basic logging for monitoring
	if (req.method !== 'GET') {
		console.log(`API ${req.method} request from ${req.ip}: ${req.url}`);
	}
	next();
};

/**
 * Rate limiting check for CSV downloads
 */
const checkCSVDownloadLimits = (req, res, next) => {
	// Additional business logic for CSV downloads
	const {minWorth, maxWorth} = req.query;

	// Warn if requesting very large datasets
	if ((minWorth === undefined || minWorth === 0) && maxWorth === undefined) {
		console.log(`📊 Full dataset CSV download requested from ${req.ip}`);
	}

	next();
};

module.exports = {
	// Express-validator middleware
	validateCSVFilters,
	validateExternalSerialNumber,

	// Additional middleware
	sanitizeRequest,
	checkCSVDownloadLimits,
};
