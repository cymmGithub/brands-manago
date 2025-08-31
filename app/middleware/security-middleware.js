const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const config = require('../config');

/**
 * Security Middleware Configuration
 * Implements security best practices for Express.js APIs
 */

/**
 * CORS Configuration - Simplified for development and production
 */
const corsOptions = {
	origin: config.env === 'production'
		? [process.env.FRONTEND_URL || `https://${config.host}`]
		: ['http://localhost:3000', 'http://localhost:8080', `http://${config.host}:${config.port}`],
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
	credentials: true,
	optionsSuccessStatus: 200,
};

/**
 * Rate Limiting Configuration
 */
const createRateLimiter = (windowMs = 1 * 60 * 1000, max = 100, message = 'Too many requests') => {
	return rateLimit({
		windowMs,
		max,
		message: {
			success: false,
			message,
			retryAfter: Math.ceil(windowMs / 1000),
		},
		standardHeaders: true, // Return rate limit info in headers
		legacyHeaders: false, // Disable legacy headers
		// Skip successful requests in development
		skip: (req, res) => config.env === 'development' && res.statusCode < 400,
	});
};

/**
 * API-specific rate limiters
 */
const apiRateLimiter = createRateLimiter(
	15 * 60 * 1000, // 15 minutes
	100, // 100 requests per window
	'Too many API requests, please try again later',
);

const csvDownloadRateLimiter = createRateLimiter(
	5 * 60 * 1000, // 5 minutes
	10, // 10 downloads per window
	'Too many CSV download requests, please try again later',
);

/**
 * Helmet Configuration - Security Headers
 */
const helmetOptions = {
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
			scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
			imgSrc: ["'self'", 'data:', 'https:'],
			connectSrc: ["'self'", 'https://brandstestowy.smallhost.pl'],
			fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
			objectSrc: ["'none'"],
			mediaSrc: ["'self'"],
			frameSrc: ["'none'"],
		},
	},
	hsts: {
		maxAge: 31536000, // 1 year
		includeSubDomains: true,
		preload: true,
	},
	noSniff: true,
	frameguard: {action: 'deny'},
	xssFilter: true,
	referrerPolicy: {policy: 'same-origin'},
};



/**
 * Morgan Logging Configuration
 */
const morganFormat = config.env === 'production'
	? 'combined'
	: ':method :url :status :res[content-length] - :response-time ms';

/**
 * HTTPS Enforcement Middleware
 */
const enforceHTTPS = (req, res, next) => {
	// Skip in development
	if (config.env === 'development') {
		return next();
	}

	// Check if request is secure
	if (req.headers['x-forwarded-proto'] !== 'https' && req.headers.host !== 'localhost') {
		return res.redirect(301, `https://${req.headers.host}${req.url}`);
	}

	next();
};

/**
 * Request Validation Middleware
 */
const validateRequest = (req, res, next) => {
	if (req.method === 'POST' || req.method === 'PUT') {
		if (req.headers['content-type'] &&
			!req.headers['content-type'].includes('application/json') &&
			!req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
			return res.status(400).json({
				success: false,
				message: 'Invalid content type',
			});
		}
	}

	// Limit request size (already handled by express.json but adding explicit check)
	const contentLength = parseInt(req.headers['content-length'] || '0');
	if (contentLength > 1024 * 1024) { // 1MB limit
		return res.status(413).json({
			success: false,
			message: 'Request entity too large',
		});
	}

	next();
};

/**
 * Security Middleware Setup Function
 */
function setupSecurity(app) {
	app.set('trust proxy', 1);
	app.use(morgan(morganFormat));
	app.use(enforceHTTPS);
	app.use(helmet(helmetOptions));
	app.use(cors(corsOptions));
	app.use(validateRequest);
	app.use(apiRateLimiter);
}

/**
 * API-specific security middleware
 */
function getAPISecurityMiddleware() {
	return [
		apiRateLimiter,
	];
}

/**
 * CSV Download specific security middleware
 */
function getCSVDownloadMiddleware() {
	return [
		csvDownloadRateLimiter,
	];
}

module.exports = {
	setupSecurity,
	getAPISecurityMiddleware,
	getCSVDownloadMiddleware,
	corsOptions,
	enforceHTTPS,
	validateRequest,
};
