const express = require('express');
const path = require('path');
const config = require('./config');
const mongodb = require('./database/mongodb');
const OrderSchedulerService = require('./services/order-scheduler-service');
const {setupSecurity} = require('./middleware/security-middleware');

const app = express();
const orderScheduler = new OrderSchedulerService();

// Setup security middleware first
setupSecurity(app);

// Body parsing middleware (with size limits for security)
app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true, limit: '1mb'}));

// Static file serving
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'src', 'js')));

// API Routes with additional security
const orderRoutes = require('./routes/order-routes');
const {getAPISecurityMiddleware} = require('./middleware/security-middleware');
app.use('/api', getAPISecurityMiddleware(), orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({
		status: 'OK',
		timestamp: new Date().toISOString(),
		database: mongodb.isConnected() ? 'connected' : 'disconnected',
		environment: config.env,
		scheduler: orderScheduler.getStatus(),
	});
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	console.error('Global error handler:', err.stack);
	res.status(500).json({
		success: false,
		message: 'Something went wrong!',
		error: config.env === 'development' ? err.message : undefined,
	});
});

/**
 * Start the server with MongoDB connection
 */
async function startServer() {
	try {
		await mongodb.connect();

		const server = app.listen(config.port, config.bindHost, () => {
			console.log(`App running at http://${config.host}:${config.port}`);
			orderScheduler.start();
		});

		// Graceful shutdown handling
		process.on('SIGTERM', async() => {
			console.log('🛑 SIGTERM received, shutting down gracefully...');
			orderScheduler.stop();
			server.close(async() => {
				await mongodb.close();
				process.exit(0);
			});
		});

		process.on('SIGINT', async() => {
			console.log('🛑 SIGINT received, shutting down gracefully...');
			orderScheduler.stop();
			server.close(async() => {
				await mongodb.close();
				process.exit(0);
			});
		});

	} catch (error) {
		console.error('❌ Failed to start server:', error.message);
		process.exit(1);
	}
}

startServer();

module.exports = app;
