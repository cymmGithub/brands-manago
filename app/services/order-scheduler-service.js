const cron = require('node-cron');
const config = require('../config');
const ExternalApiService = require('./external-api-service');
/**
 * Order Scheduler Service - Scheduler for checking newly added orders at regular intervals
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
		console.log(`✅ Scheduler started: every ${intervalMinutes} minute(s)`);
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
	 */
	async runScheduledTask() {
		if (this.isRunning) {
			console.log('⏭️  Skipping run - previous task still running');
			return;
		}

		this.isRunning = true;

		try {
			const results = await this.externalApiService
				.downloadAndSaveNewlyAddedOrdersFromScheduler({
					minutes: this.lookbackMinutes,
					dateType: this.externalApiService.DATE_TYPES.ADD,
					updateExisting: true,
				});

			console.log(`✅ Scheduler run completed: ${results.downloaded} downloaded, ${results.created} created, ${results.updated} updated`);
		} catch (error) {
			console.error('❌ Scheduler run failed:', error.message);
		} finally {
			this.isRunning = false;
		}
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

	/**
	 * Run the order status monitoring task
	 * Checks incomplete orders and updates their statuses
	 */
	async runStatusMonitoringTask() {
		if (this.isRunning) {
			console.log('⏭️  Skipping status monitoring - previous task still running');
			return;
		}

		this.isRunning = true;

		try {
			const results = await this.externalApiService.runStatusMonitoringJob({
				lookbackMinutes: 15, // Don't check orders updated in last 15 minutes
				modifiedLookbackHours: 1, // Check for orders modified in last hour
			});

			if (results.checked > 0) {
				console.log(`🔄 Status monitoring completed: ${results.checked} checked, ${results.updated} updated, ${results.completed} completed`);
			}

		} catch (error) {
			console.error('❌ Status monitoring failed:', error.message);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Run status monitoring immediately (for debugging)
	 */
	async runStatusMonitoringNow() {
		console.log('🔍 Running status monitoring now...');
		await this.runStatusMonitoringTask();
	}

	/**
	 * Run download immediately (for debugging)
	 * Uses the configured lookbackMinutes value
	 */
	async runNow() {
		console.log('🚀 Running download now...');
		await this.runScheduledTask();
	}
}

module.exports = OrderSchedulerService;
