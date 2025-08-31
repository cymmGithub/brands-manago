const express = require('express');
const path = require('path');
const config = require('./config');
const mongodb = require('./database/mongodb');
const OrderSchedulerService = require('./services/order-scheduler-service');

const app = express();
const orderScheduler = new OrderSchedulerService();

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Static file serving
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'src', 'js')));

// API Routes
const orderRoutes = require('./routes/order-routes');
app.use('/api', orderRoutes);

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
			console.log(`🚀 Forma'Sint server running at http://${config.host}:${config.port}`);
			console.log(`📁 Serving static files from: ${path.join(__dirname, '..', 'frontend', 'public')}`);
			console.log(`🔌 API endpoints available at: http://${config.host}:${config.port}/api`);
			console.log(`🏥 Health check available at: http://${config.host}:${config.port}/health`);

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
