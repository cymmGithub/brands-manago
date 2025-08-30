const { MongoClient } = require('mongodb');
const config = require('../config');

let db = null;
let client = null;

/**
 * Connect to MongoDB database
 * @returns {Promise<Object>} Database connection
 */
async function connect() {
	try {
		if (db) {
			console.log('MongoDB: Using existing connection');
			return db;
		}

		console.log('MongoDB: Connecting to database...');
		client = new MongoClient(config.mongodb.uri, {
			maxPoolSize: 10,
			serverSelectionTimeoutMS: 5000,
		});

		await client.connect();
		db = client.db(config.mongodb.dbName);

		console.log(`MongoDB: Connected successfully to database: ${config.mongodb.dbName}`);
		return db;
	} catch (error) {
		console.error('MongoDB: Connection failed:', error.message);
		throw error;
	}
}

/**
 * Get the database connection
 * @returns {Object} Database connection
 */
function getDb() {
	if (!db) {
		throw new Error('MongoDB: Database not connected. Call connect() first.');
	}
	return db;
}

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
async function close() {
	try {
		if (client) {
			await client.close();
			client = null;
			db = null;
			console.log('MongoDB: Connection closed');
		}
	} catch (error) {
		console.error('MongoDB: Error closing connection:', error.message);
		throw error;
	}
}

/**
 * Check if database is connected
 * @returns {boolean} Connection status
 */
function isConnected() {
	return db !== null;
}

module.exports = {
	connect,
	getDb,
	close,
	isConnected,
};
