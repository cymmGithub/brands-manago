const cron = require('node-cron');
const config = require('../config');
const ExternalApiService = require('./external-api-service');
/**
 * Order Scheduler Service - Scheduler for downloading orders at regular intervals
 */
class OrderSchedulerService {
	constructor() {
		this.externalApiService = new ExternalApiService();
		this.isRunning = false;
		this.scheduledTask = null;
		this.lookbackMinutes = config.scheduler.lookbackMinutes;
	}

	/**
	 * Start the scheduler
	 * @param {Object} options - Scheduling options
	 * @param {number} [options.intervalMinutes] - Run every X minutes (defaults to env var or 10)
	 * @param {string} [options.timezone='Europe/Warsaw'] - Timezone for scheduling
	 */
	start(options = {}) {
		const intervalMinutes = options.intervalMinutes || config.scheduler.intervalMinutes;
		const timezone = options.timezone || 'Europe/Warsaw';

		if (this.scheduledTask) {
			console.log('⚠️  Scheduler already running');
			return;
		}

		if (!this.externalApiService.isReady()) {
			console.log('⚠️  API not configured. Scheduler will not start.');
			return;
		}

		const schedule = `*/${intervalMinutes} * * * *`;

		this.scheduledTask = cron.schedule(schedule, async() => {
			await this.runScheduledTask();
		}, {
			scheduled: false,
			timezone,
		});

		this.scheduledTask.start();
		console.log(`✅ Scheduler started: every ${intervalMinutes} minutes`);
	}

	/**
	 * Stop the scheduler
	 */
	stop() {
		if (this.scheduledTask) {
			this.scheduledTask.stop();
			this.scheduledTask = null;
			console.log('🛑 Scheduler stopped');
		}
	}

	/**
	 * Run the scheduled download task
	 * Uses the configured lookbackMinutes to determine how far back to look for orders
	 */
	async runScheduledTask() {
		if (this.isRunning) {
			console.log('⏭️  Skipping run - previous task still running');
			return;
		}

		this.isRunning = true;

		try {
			const dateFrom = this.getDateFromMinutesAgo(this.lookbackMinutes);
			const dateTo = this.getCurrentDateString();

			const results = await this.externalApiService.downloadAndSaveOrdersByDateRange(
				dateFrom,
				dateTo,
				{
					dateType: 'add',
					updateExisting: true,
				},
			);

			console.log(`✅ Download completed: ${results.created} created, ${results.updated} updated`);

		} catch (error) {
			console.error('❌ Download failed:', error.message);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Run download immediately (for debugging)
	 * Uses the configured lookbackMinutes value
	 */
	async runNow() {
		console.log('🚀 Running download now...');
		await this.runScheduledTask();
	}

	/**
	 * Get date string from X minutes ago
	 * @param {number} minutes - Number of minutes ago
	 * @returns {string} Date string in YYYY-MM-DD format
	 */
	getDateFromMinutesAgo(minutes) {
		const date = new Date();
		date.setMinutes(date.getMinutes() - minutes);
		return date.toISOString().split('T')[0];
	}

	/**
	 * Get current date string
	 * @returns {string} Date string in YYYY-MM-DD format
	 */
	getCurrentDateString() {
		return new Date().toISOString().split('T')[0];
	}

	/**
	 * Set the lookback period
	 * @param {number} minutes - Minutes to look back for orders
	 */
	setLookbackMinutes(minutes) {
		this.lookbackMinutes = parseInt(minutes, 10);
		console.log(`📅 Lookback period set to ${this.lookbackMinutes} minutes`);
	}

	/**
	 * Get scheduler status
	 * @returns {Object} Status information
	 */
	getStatus() {
		return {
			isScheduled: !!this.scheduledTask,
			isRunning: this.isRunning,
			intervalMinutes: config.scheduler.intervalMinutes,
			lookbackMinutes: this.lookbackMinutes,
			apiReady: this.externalApiService.isReady(),
		};
	}
}

module.exports = OrderSchedulerService;
