const express = require('express');
const path = require('path');
const config = require('./config');
const mongodb = require('./database/mongodb');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'src', 'js')));

// API Routes
const productRoutes = require('./routes/product-routes');
app.use('/api', productRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({
		status: 'OK',
		timestamp: new Date().toISOString(),
		database: mongodb.isConnected() ? 'connected' : 'disconnected',
		environment: config.env,
	});
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// Global error handler
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
			console.log(`🗄️  MongoDB connected to: ${config.mongodb.dbName}`);
			console.log(`🌍 Environment: ${config.env}`);
		});

		// Graceful shutdown handling
		process.on('SIGTERM', async () => {
			console.log('🛑 SIGTERM received, shutting down gracefully...');
			server.close(async () => {
				await mongodb.close();
				process.exit(0);
			});
		});

		process.on('SIGINT', async () => {
			console.log('🛑 SIGINT received, shutting down gracefully...');
			server.close(async () => {
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
