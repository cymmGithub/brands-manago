require('dotenv').config();
module.exports = {
	port: process.env.PORT,
	env: process.env.NODE_ENV,
	host: process.env.APP_HOST, // For URLs and external references
	bindHost: process.env.BIND_HOST, // For server binding (Docker needs 0.0.0.0)
	mongodb: {
		uri: process.env.MONGODB_URI,
		dbName: process.env.MONGODB_DB_NAME,
	},
	idosell: {
		shopUrl: process.env.IDOSELL_SHOP_URL,
		apiKey: process.env.IDOSELL_API_KEY,
		apiVersion: process.env.IDOSELL_API_VERSION,
	},
	scheduler: {
		intervalMinutes: +process.env.SCHEDULER_INTERVAL_MINUTES,
		lookbackMinutes: +process.env.SCHEDULER_LOOKBACK_MINUTES,
	},
};
