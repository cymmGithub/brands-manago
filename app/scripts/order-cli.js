#!/usr/bin/env node

/**
 * Order Management CLI Tool
 *
 * Usage examples:
 * node scripts/order-cli.js download --serial-numbers 123,456,789
 * node scripts/order-cli.js download --date-range 2023-12-01 2023-12-31
 * node scripts/order-cli.js list --status pending
 * node scripts/order-cli.js status
 */

const ExternalApiService = require('../services/external-api-service');
const orderModel = require('../models/order-model');
const mongodb = require('../database/mongodb');

// Load environment variables from .env file if available
try {
	require('dotenv').config();
} catch (_e) {
	// dotenv not available, that's okay
}

class OrderCLI {
	constructor() {
		this.externalApiService = new ExternalApiService();
	}

	async init() {
		try {
			await mongodb.connect();
			console.log('✅ Connected to MongoDB');
		} catch (error) {
			console.error('❌ Failed to connect to MongoDB:', error.message);
			process.exit(1);
		}
	}

	async cleanup() {
		try {
			await mongodb.close();
			console.log('✅ MongoDB connection closed');
		} catch (error) {
			console.error('❌ Error closing MongoDB:', error.message);
		}
	}

	async downloadBySerialNumbers(serialNumbers, updateExisting = true) {
		try {
			const numbers = serialNumbers
				.split(',')
				.map((num) => parseInt(num.trim(), 10));
			console.log(
				`📥 Downloading orders with serial numbers: ${numbers.join(', ')}`,
			);

			const results =
				await this.externalApiService.downloadAndSaveOrdersBySerialNumbers(
					numbers,
					{updateExisting},
				);

			console.log('\n📊 Results:');
			console.log(`   Downloaded: ${results.downloaded}`);
			console.log(`   Created: ${results.created}`);
			console.log(`   Updated: ${results.updated}`);
			console.log(`   Skipped: ${results.skipped}`);

			if (results.errors.length > 0) {
				console.log(`   Errors: ${results.errors.length}`);
				results.errors.forEach((error) => console.log(`     - ${error}`));
			}
		} catch (error) {
			console.error('❌ Download failed:', error.message);
		}
	}

	async downloadByDateRange(
		dateFrom,
		dateTo,
		dateType = 'add',
		updateExisting = true,
	) {
		try {
			console.log(
				`📥 Downloading orders from ${dateFrom} to ${dateTo} (${dateType} date)`,
			);

			const results =
				await this.externalApiService.downloadAndSaveOrdersByDateRange(
					dateFrom,
					dateTo,
					{dateType, updateExisting},
				);

			console.log('\n📊 Results:');
			console.log(`   Downloaded: ${results.downloaded}`);
			console.log(`   Created: ${results.created}`);
			console.log(`   Updated: ${results.updated}`);
			console.log(`   Skipped: ${results.skipped}`);

			if (results.errors.length > 0) {
				console.log(`   Errors: ${results.errors.length}`);
				results.errors.forEach((error) => console.log(`     - ${error}`));
			}
		} catch (error) {
			console.error('❌ Download failed:', error.message);
		}
	}

	async listOrders(filters = {}) {
		try {
			const orders = await orderModel.getAll(filters);
			const count = await orderModel.getCount(filters);

			console.log(`\n📋 Found ${count} orders:`);

			if (orders.length === 0) {
				console.log('   No orders found');
				return;
			}

			orders.forEach((order) => {
				console.log(
					`   📦 ${order.orderNumber || order.externalId} - ${
						order.customerName || order.customerEmail
					}`,
				);
				console.log(
					`      Status: ${order.status} | Total: ${order.totalAmount} ${order.currency}`,
				);
				console.log(
					`      Date: ${order.orderDate.toISOString().split('T')[0]}`,
				);
				console.log('');
			});
		} catch (error) {
			console.error('❌ Failed to list orders:', error.message);
		}
	}

	async showStatus() {
		try {
			const isReady = this.externalApiService.isReady();
			const config = {
				shopUrl: process.env.IDOSELL_SHOP_URL,
				apiKey: process.env.IDOSELL_API_KEY
					? '***configured***'
					: 'not configured',
				apiVersion: this.externalApiService.apiVersion,
			};

			console.log('\n🔧 External API Service Status:');
			console.log(`   Ready: ${isReady ? '✅ Yes' : '❌ No'}`);
			console.log(`   Shop URL: ${config.shopUrl || 'not configured'}`);
			console.log(`   API Key: ${config.apiKey}`);
			console.log(`   API Version: ${config.apiVersion}`);

			if (!isReady) {
				console.log('\n⚠️  To configure the external API service:');
				console.log('   1. Set IDOSELL_SHOP_URL environment variable');
				console.log('   2. Set IDOSELL_API_KEY environment variable');
				console.log('   3. Optionally set IDOSELL_API_VERSION (default: v6)');
			}

			// Show database status
			const orderCount = await orderModel.getCount();
			console.log('\n🗄️  Database Status:');
			console.log(`   Total orders in database: ${orderCount}`);
		} catch (error) {
			console.error('❌ Failed to show status:', error.message);
		}
	}

	printUsage() {
		console.log(`
📋 Order Management CLI

Usage: node scripts/order-cli.js <command> [options]

Commands:
  download --serial-numbers <numbers>     Download orders by serial numbers (comma-separated)
  download --date-range <from> <to>       Download orders by date range (YYYY-MM-DD format)
  list [--status <status>]                List orders in database
  status                                  Show service and database status
  help                                    Show this help message

Examples:
  node scripts/order-cli.js download --serial-numbers 123,456,789
  node scripts/order-cli.js download --date-range 2023-12-01 2023-12-31
  node scripts/order-cli.js download --date-range 2023-12-01 2023-12-31 --date-type dispatch
  node scripts/order-cli.js list --status pending
  node scripts/order-cli.js list --limit 10
  node scripts/order-cli.js status

Options:
  --serial-numbers <numbers>    Comma-separated list of order serial numbers
  --date-range <from> <to>      Date range (YYYY-MM-DD format)
  --date-type <type>            Date type: add, modify, dispatch (default: add)
  --status <status>             Filter by order status
  --limit <number>              Limit number of results
  --no-update                   Don't update existing orders (only create new ones)
		`);
	}

	async run() {
		const args = process.argv.slice(2);

		if (args.length === 0 || args[0] === 'help') {
			this.printUsage();
			return;
		}

		await this.init();

		try {
			const command = args[0];

			switch (command) {
				case 'download': {
					const serialNumbersIndex = args.indexOf('--serial-numbers');
					const dateRangeIndex = args.indexOf('--date-range');
					const dateTypeIndex = args.indexOf('--date-type');
					const noUpdateIndex = args.indexOf('--no-update');

					const updateExisting = noUpdateIndex === -1;

					if (serialNumbersIndex !== -1 && args[serialNumbersIndex + 1]) {
						await this.downloadBySerialNumbers(
							args[serialNumbersIndex + 1],
							updateExisting,
						);
					} else if (
						dateRangeIndex !== -1 &&
						args[dateRangeIndex + 1] &&
						args[dateRangeIndex + 2]
					) {
						const dateFrom = args[dateRangeIndex + 1];
						const dateTo = args[dateRangeIndex + 2];
						const dateType =
							dateTypeIndex !== -1 && args[dateTypeIndex + 1]
								? args[dateTypeIndex + 1]
								: 'add';
						await this.downloadByDateRange(
							dateFrom,
							dateTo,
							dateType,
							updateExisting,
						);
					} else {
						console.error(
							'❌ Invalid download command. Use --serial-numbers or --date-range',
						);
						this.printUsage();
					}
					break;
				}

				case 'list': {
					const statusIndex = args.indexOf('--status');
					const limitIndex = args.indexOf('--limit');

					const filters = {};
					if (statusIndex !== -1 && args[statusIndex + 1]) {
						filters.status = args[statusIndex + 1];
					}
					if (limitIndex !== -1 && args[limitIndex + 1]) {
						filters.limit = args[limitIndex + 1];
					}

					await this.listOrders(filters);
					break;
				}

				case 'status': {
					await this.showStatus();
					break;
				}

				default: {
					console.error(`❌ Unknown command: ${command}`);
					this.printUsage();
					break;
				}
			}
		} catch (error) {
			console.error('❌ CLI error:', error.message);
		} finally {
			await this.cleanup();
		}
	}
}

// Run CLI if this file is executed directly
if (require.main === module) {
	const cli = new OrderCLI();
	cli.run().catch((error) => {
		console.error('❌ Unhandled error:', error);
		process.exit(1);
	});
}

module.exports = OrderCLI;
