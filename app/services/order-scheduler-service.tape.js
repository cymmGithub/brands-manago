const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

/**
 * Test setup - Creates OrderSchedulerService with mocked dependencies
 */
function createTestScheduler(customMocks = {}) {
	// Clear require cache
	const servicePath = path.resolve(__dirname, './order-scheduler-service.js');
	delete require.cache[servicePath];

	// Create mocks
	const mockCron = customMocks.cron || {
		schedule: (schedule, callback, options) => {
			const task = {
				start: () => {
					task.started = true;
				},
				stop: () => {
					task.started = false;
				},
				started: false,
				callback,
				schedule,
				options,
			};
			mockCron.lastScheduledTask = task;
			return task;
		},
		lastScheduledTask: null,
	};

	const mockExternalApiService = customMocks.externalApiService || {
		isReady: () => true,
		downloadAndSaveNewlyAddedOrdersFromScheduler: async() => ({
			downloaded: 5,
			created: 3,
			updated: 2,
		}),
		runStatusMonitoringJob: async() => ({
			checked: 10,
			updated: 2,
		}),
		DATE_TYPES: {ADD: 'add'},
	};

	const mockConfig = customMocks.config || {
		scheduler: {
			intervalMinutes: 10,
			lookbackMinutes: 30,
		},
	};

	// Mock the dependencies
	const Module = require('module');
	const originalRequire = Module.prototype.require;

	Module.prototype.require = function(id) {
		if (id === 'node-cron') {
			return mockCron;
		}
		if (id === '../config') {
			return mockConfig;
		}
		if (id === './external-api-service') {
			return function MockExternalApiService() {
				return mockExternalApiService;
			};
		}
		return originalRequire.apply(this, arguments);
	};

	// Import the service with mocks in place
	const OrderSchedulerService = require('./order-scheduler-service');

	// Restore original require
	Module.prototype.require = originalRequire;

	return {
		service: new OrderSchedulerService(),
		mocks: {
			cron: mockCron,
			externalApiService: mockExternalApiService,
			config: mockConfig,
		},
	};
}

/**
 * Test Suite
 */
test('OrderSchedulerService - Initialization Tests', async(t) => {

	await t.test('should initialize with default config', async() => {
		const {service, mocks} = createTestScheduler();

		assert.strictEqual(service.isRunning, false);
		assert.strictEqual(service.scheduledTask, null);
		assert.strictEqual(service.lookbackMinutes, mocks.config.scheduler.lookbackMinutes);
	});

	await t.test('should initialize external API service', async() => {
		const {service} = createTestScheduler();

		assert(service.externalApiService);
		assert.strictEqual(typeof service.externalApiService.isReady, 'function');
	});
});

test('OrderSchedulerService - Scheduler Lifecycle Tests', async(t) => {

	await t.test('should start scheduler with default options', async() => {
		const {service, mocks} = createTestScheduler();

		service.start();

		assert(service.scheduledTask);
		assert.strictEqual(service.scheduledTask.started, true);
		assert.strictEqual(mocks.cron.lastScheduledTask.schedule, '*/10 * * * *');
		assert.strictEqual(mocks.cron.lastScheduledTask.options.timezone, 'Europe/Warsaw');
	});

	await t.test('should start scheduler with custom options', async() => {
		const {service, mocks} = createTestScheduler();

		service.start({intervalMinutes: 5, timezone: 'UTC'});

		assert.strictEqual(mocks.cron.lastScheduledTask.schedule, '*/5 * * * *');
		assert.strictEqual(mocks.cron.lastScheduledTask.options.timezone, 'UTC');
	});

	await t.test('should not start scheduler if already running', async() => {
		const {service} = createTestScheduler();

		service.start();
		const firstTask = service.scheduledTask;

		service.start(); // Try to start again

		assert.strictEqual(service.scheduledTask, firstTask); // Should be the same task
	});

	await t.test('should not start scheduler if API not ready', async() => {
		const mockExternalApiService = {
			isReady: () => false,
		};
		const {service} = createTestScheduler({externalApiService: mockExternalApiService});

		service.start();

		assert.strictEqual(service.scheduledTask, null);
	});

	await t.test('should stop scheduler', async() => {
		const {service} = createTestScheduler();

		service.start();
		assert(service.scheduledTask);

		service.stop();

		assert.strictEqual(service.scheduledTask, null);
	});

	await t.test('should handle stop when not running', async() => {
		const {service} = createTestScheduler();

		// Should not throw
		service.stop();

		assert.strictEqual(service.scheduledTask, null);
	});
});

test('OrderSchedulerService - Task Execution Tests', async(t) => {

	await t.test('should run scheduled task successfully', async() => {
		const {service, mocks} = createTestScheduler();

		let downloadCalled = false;
		let statusMonitoringCalled = false;

		mocks.externalApiService.downloadAndSaveNewlyAddedOrdersFromScheduler = async() => {
			downloadCalled = true;
			return {downloaded: 3, created: 2, updated: 1};
		};

		mocks.externalApiService.runStatusMonitoringJob = async() => {
			statusMonitoringCalled = true;
			return {checked: 5, updated: 1};
		};

		await service.runScheduledTask();

		assert.strictEqual(downloadCalled, true);
		assert.strictEqual(statusMonitoringCalled, true);
		assert.strictEqual(service.isRunning, false); // Should reset after completion
	});

	await t.test('should skip execution if already running', async() => {
		const {service, mocks} = createTestScheduler();

		service.isRunning = true;

		let downloadCalled = false;
		mocks.externalApiService.downloadAndSaveNewlyAddedOrdersFromScheduler = async() => {
			downloadCalled = true;
			return {downloaded: 0, created: 0, updated: 0};
		};

		await service.runScheduledTask();

		assert.strictEqual(downloadCalled, false);
		assert.strictEqual(service.isRunning, true); // Should remain true
	});

	await t.test('should handle errors in scheduled task', async() => {
		const {service, mocks} = createTestScheduler();

		mocks.externalApiService.downloadAndSaveNewlyAddedOrdersFromScheduler = async() => {
			throw new Error('API error');
		};

		// Should not throw, but handle gracefully
		await service.runScheduledTask();

		assert.strictEqual(service.isRunning, false); // Should reset even after error
	});

	await t.test('should run download task with correct parameters', async() => {
		const {service, mocks} = createTestScheduler();

		let capturedParams = null;
		mocks.externalApiService.downloadAndSaveNewlyAddedOrdersFromScheduler = async(params) => {
			capturedParams = params;
			return {downloaded: 1, created: 1, updated: 0};
		};

		await service.downloadNewOrders();

		assert.strictEqual(capturedParams.minutes, mocks.config.scheduler.lookbackMinutes);
		assert.strictEqual(capturedParams.dateType, 'add');
		assert.strictEqual(capturedParams.updateExisting, true);
	});
});

test('OrderSchedulerService - Status Monitoring Tests', async(t) => {

	await t.test('should run status monitoring task', async() => {
		const {service, mocks} = createTestScheduler();

		let capturedParams = null;
		mocks.externalApiService.runStatusMonitoringJob = async(params) => {
			capturedParams = params;
			return {checked: 8, updated: 3};
		};

		await service.runStatusMonitoringTask();

		assert.strictEqual(capturedParams.lookbackMinutes, 15);
		assert.strictEqual(capturedParams.modifiedLookbackHours, 1);
	});

	await t.test('should handle status monitoring errors', async() => {
		const {service, mocks} = createTestScheduler();

		mocks.externalApiService.runStatusMonitoringJob = async() => {
			throw new Error('Status monitoring failed');
		};

		await assert.rejects(
			() => service.runStatusMonitoringTask(),
			/Status monitoring failed/,
		);
	});

	await t.test('should run status monitoring immediately', async() => {
		const {service, mocks} = createTestScheduler();

		let monitoringCalled = false;
		mocks.externalApiService.runStatusMonitoringJob = async() => {
			monitoringCalled = true;
			return {checked: 5, updated: 1};
		};

		await service.runStatusMonitoringNow();

		assert.strictEqual(monitoringCalled, true);
		assert.strictEqual(service.isRunning, false);
	});

	await t.test('should skip status monitoring if scheduler is running', async() => {
		const {service, mocks} = createTestScheduler();

		service.isRunning = true;

		let monitoringCalled = false;
		mocks.externalApiService.runStatusMonitoringJob = async() => {
			monitoringCalled = true;
			return {checked: 5, updated: 1};
		};

		await service.runStatusMonitoringNow();

		assert.strictEqual(monitoringCalled, false);
	});
});

test('OrderSchedulerService - Status and Utility Tests', async(t) => {

	await t.test('should return correct status when not scheduled', async() => {
		const {service, mocks} = createTestScheduler();

		const status = service.getStatus();

		assert.strictEqual(status.isScheduled, false);
		assert.strictEqual(status.isRunning, false);
		assert.strictEqual(status.intervalMinutes, mocks.config.scheduler.intervalMinutes);
		assert.strictEqual(status.lookbackMinutes, mocks.config.scheduler.lookbackMinutes);
		assert.strictEqual(status.apiReady, true);
	});

	await t.test('should return correct status when scheduled', async() => {
		const {service} = createTestScheduler();

		service.start();
		const status = service.getStatus();

		assert.strictEqual(status.isScheduled, true);
		assert.strictEqual(status.isRunning, false);
	});

	await t.test('should return correct status when running', async() => {
		const {service} = createTestScheduler();

		service.isRunning = true;
		const status = service.getStatus();

		assert.strictEqual(status.isRunning, true);
	});

	await t.test('should run all tasks now', async() => {
		const {service} = createTestScheduler();

		let taskExecuted = false;
		// Mock the runScheduledTask method
		service.runScheduledTask = async() => {
			taskExecuted = true;
		};

		await service.runNow();

		assert.strictEqual(taskExecuted, true);
	});

	await t.test('should run all tasks immediately', async() => {
		const {service} = createTestScheduler();

		let taskExecuted = false;
		// Mock the runScheduledTasks method (note: there's a typo in the original code)
		service.runScheduledTasks = async() => {
			taskExecuted = true;
		};

		await service.runAllTasksNow();

		assert.strictEqual(taskExecuted, true);
	});

	await t.test('should skip run all tasks if already running', async() => {
		const {service} = createTestScheduler();

		service.isRunning = true;

		let taskExecuted = false;
		service.runScheduledTasks = async() => {
			taskExecuted = true;
		};

		await service.runAllTasksNow();

		assert.strictEqual(taskExecuted, false);
	});
});

test('OrderSchedulerService - Error Handling Tests', async(t) => {

	await t.test('should handle external API service errors gracefully', async() => {
		const mockExternalApiService = {
			isReady: () => true,
			downloadAndSaveNewlyAddedOrdersFromScheduler: async() => {
				throw new Error('Network timeout');
			},
			runStatusMonitoringJob: async() => {
				throw new Error('Database error');
			},
			DATE_TYPES: {ADD: 'add'},
		};

		const {service} = createTestScheduler({externalApiService: mockExternalApiService});

		// Should not throw
		await service.runScheduledTask();
		assert.strictEqual(service.isRunning, false);
	});

	await t.test('should handle download errors separately from status monitoring', async() => {
		const {service, mocks} = createTestScheduler();

		let statusMonitoringCalled = false;

		mocks.externalApiService.downloadAndSaveNewlyAddedOrdersFromScheduler = async() => {
			throw new Error('Download failed');
		};

		mocks.externalApiService.runStatusMonitoringJob = async() => {
			statusMonitoringCalled = true;
			return {checked: 3, updated: 1};
		};

		await service.runScheduledTask();

		// Status monitoring should still run even if download fails
		assert.strictEqual(statusMonitoringCalled, true);
		assert.strictEqual(service.isRunning, false);
	});
});

// Clean up require cache after tests
test.after(() => {
	const servicePath = path.resolve(__dirname, './order-scheduler-service.js');
	delete require.cache[servicePath];
});
