/**
 * Order Management CLI Tool
 *
 * Usage examples:
 * node scripts/order-cli.js download --all
 * node scripts/order-cli.js list --status pending
 * node scripts/order-cli.js status
 * node scripts/order-cli.js scheduler:run-now
 * node scripts/order-cli.js scheduler:monitor-now
 */

const config = require('../config');
const ExternalApiService = require('../services/external-api-service');
const OrderSchedulerService = require('../services/order-scheduler-service');
const orderModel = require('../models/order-model');
const mongodb = require('../database/mongodb');

class OrderCLI {
	constructor() {
		this.externalApiService = new ExternalApiService();
		this.orderScheduler = new OrderSchedulerService();
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

	async downloadAllOrders() {
		try {
			console.log('📥 Downloading ALL orders from IdoSell...');
			await this.externalApiService.downloadAndSaveAllOrders();
		} catch (error) {
			console.error('❌ Download all orders failed:', error.message);
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
			const apiConfig = {
				shopUrl: config.idosell.shopUrl,
				apiKey: config.idosell.apiKey ? '***configured***' : 'not configured',
				apiVersion: this.externalApiService.apiVersion,
			};

			console.log('\n🔧 External API Service Status:');
			console.log(`   Ready: ${isReady ? '✅ Yes' : '❌ No'}`);
			console.log(`   Shop URL: ${apiConfig.shopUrl || 'not configured'}`);
			console.log(`   API Key: ${apiConfig.apiKey}`);
			console.log(`   API Version: ${apiConfig.apiVersion}`);

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
  download --all                          Download ALL orders from IdoSell (with pagination)
  list [--status <status>]                List orders in database
  status                                  Show service and database status
  scheduler:run-now                       Test scheduler download task immediately
  scheduler:monitor-now                   Test status monitoring task immediately
  help                                    Show this help message

Examples:
  node scripts/order-cli.js download --all
  node scripts/order-cli.js list --status pending
  node scripts/order-cli.js list --limit 10
  node scripts/order-cli.js scheduler:monitor-now

Options:
  --all                         Download ALL orders (no additional options)
  --limit <number>              Limit number of results (for list command)
		`);
	}

	/**
	 * Run scheduler download task now (for testing)
	 */
	async runSchedulerNow() {
		console.log('🚀 Testing scheduler download task...');
		try {
			await this.orderScheduler.runNow();
			console.log('✅ Scheduler download test completed');
		} catch (error) {
			console.error('❌ Scheduler download test failed:', error.message);
		}
	}

	/**
	 * Run status monitoring now (for testing)
	 */
	async runStatusMonitoringNow() {
		console.log('🔍 Testing status monitoring task...');
		try {
			await this.orderScheduler.runStatusMonitoringNow();
		} catch (error) {
			console.error('❌ Status monitoring test failed:', error.message);
		}
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
					const allIndex = args.indexOf('--all');

					if (allIndex !== -1) {
						await this.downloadAllOrders();
					} else {
						console.error(
							'❌ Invalid download command. Use --all to download all orders',
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

				case 'scheduler:run-now': {
					await this.runSchedulerNow();
					break;
				}

				case 'scheduler:monitor-now': {
					await this.runStatusMonitoringNow();
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
