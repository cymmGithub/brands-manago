module.exports = {
	port: process.env.PORT || 3000,
	env: process.env.NODE_ENV || 'development',
	host: process.env.APP_HOST || 'localhost', // For URLs and external references
	bindHost: process.env.BIND_HOST || '0.0.0.0', // For server binding (Docker needs 0.0.0.0)
	mongodb: {
		uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/brands-manago',
		dbName: process.env.MONGODB_DB_NAME || 'brands-manago',
	},
};
