import Bull, { Queue, Job } from 'bull';
import IORedis from 'ioredis';
import { config } from '../config/config';
import logger from '../utils/logger';
import { NotificationJob, NotificationPriority } from '../types/notification.types';

export class QueueService {
    private static notificationQueue: Queue | null = null;
    private static deadLetterQueue: Queue | null = null;
    private static redis: IORedis | null = null;
    private static initialized = false;

    /**
     * Initialize the queue service
     */
    static initialize(): void {
        if (this.initialized) return;

        try {
            // Create Redis connection
            this.redis = new IORedis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
            });

            // Create notification queue
            this.notificationQueue = new Bull('notification-queue', {
                redis: {
                    host: config.redis.host,
                    port: config.redis.port,
                    password: config.redis.password,
                },
                defaultJobOptions: {
                    removeOnComplete: 100, // Keep 100 completed jobs
                    removeOnFail: 50, // Keep 50 failed jobs
                    attempts: config.notification.maxRetries,
                    backoff: {
                        type: 'exponential',
                        delay: config.notification.retryDelay,
                    },
                },
            });

            // Create dead letter queue for failed jobs
            this.deadLetterQueue = new Bull('dead-letter-queue', {
                redis: {
                    host: config.redis.host,
                    port: config.redis.port,
                    password: config.redis.password,
                },
                defaultJobOptions: {
                    removeOnComplete: 10,
                    removeOnFail: 100,
                },
            });

            this.setupEventHandlers();
            this.initialized = true;

            logger.info('Queue service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize queue service', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            this.initialized = true; // Set to true to prevent retry loops
        }
    }

    /**
     * Queue a notification for immediate processing
     */
    static async queueNotification(notificationJob: NotificationJob): Promise<void> {
        this.initialize();

        if (!this.notificationQueue) {
            logger.warn('Queue not available, processing notification immediately');
            // Fallback to immediate processing if queue is not available
            await this.processNotificationDirectly(notificationJob);
            return;
        }

        try {
            const priority = this.getPriorityValue(notificationJob.priority);

            await this.notificationQueue.add('process-notification', notificationJob, {
                priority,
                delay: 0,
                attempts: notificationJob.maxAttempts,
                jobId: notificationJob.id,
            });

            logger.info('Notification queued successfully', {
                jobId: notificationJob.id,
                type: notificationJob.type,
                channel: notificationJob.channel,
                priority: notificationJob.priority,
            });
        } catch (error) {
            logger.error('Failed to queue notification', {
                jobId: notificationJob.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            // Fallback to immediate processing
            await this.processNotificationDirectly(notificationJob);
        }
    }

    /**
     * Schedule a notification for future processing
     */
    static async scheduleNotification(
        notificationJob: NotificationJob,
        scheduledAt: Date,
    ): Promise<void> {
        this.initialize();

        if (!this.notificationQueue) {
            logger.warn('Queue not available, cannot schedule notification');
            return;
        }

        try {
            const delay = scheduledAt.getTime() - Date.now();
            const priority = this.getPriorityValue(notificationJob.priority);

            await this.notificationQueue.add('process-notification', notificationJob, {
                priority,
                delay: Math.max(0, delay),
                attempts: notificationJob.maxAttempts,
                jobId: notificationJob.id,
            });

            logger.info('Notification scheduled successfully', {
                jobId: notificationJob.id,
                scheduledAt: scheduledAt.toISOString(),
                delay,
            });
        } catch (error) {
            logger.error('Failed to schedule notification', {
                jobId: notificationJob.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Process notification jobs in batches
     */
    static async processBatchNotifications(jobs: NotificationJob[]): Promise<void> {
        this.initialize();

        if (!this.notificationQueue) {
            logger.warn('Queue not available, processing batch immediately');
            for (const job of jobs) {
                await this.processNotificationDirectly(job);
            }
            return;
        }

        try {
            const batchSize = config.notification.batchSize;

            for (let i = 0; i < jobs.length; i += batchSize) {
                const batch = jobs.slice(i, i + batchSize);

                const queueJobs = batch.map((notificationJob) => ({
                    name: 'process-notification',
                    data: notificationJob,
                    opts: {
                        priority: this.getPriorityValue(notificationJob.priority),
                        attempts: notificationJob.maxAttempts,
                        jobId: notificationJob.id,
                    },
                }));

                await this.notificationQueue.addBulk(queueJobs);
            }

            logger.info('Batch notifications queued successfully', {
                totalJobs: jobs.length,
                batchSize,
                batches: Math.ceil(jobs.length / batchSize),
            });
        } catch (error) {
            logger.error('Failed to queue batch notifications', {
                error: error instanceof Error ? error.message : 'Unknown error',
                jobCount: jobs.length,
            });
        }
    }

    /**
     * Get queue statistics
     */
    static async getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }> {
        this.initialize();

        if (!this.notificationQueue) {
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }

        try {
            const [waiting, active, completed, failed, delayed] = await Promise.all([
                this.notificationQueue.getWaiting(),
                this.notificationQueue.getActive(),
                this.notificationQueue.getCompleted(),
                this.notificationQueue.getFailed(),
                this.notificationQueue.getDelayed(),
            ]);

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
            };
        } catch (error) {
            logger.error('Failed to get queue stats', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
    }

    /**
     * Retry failed jobs
     */
    static async retryFailedJobs(limit: number = 10): Promise<number> {
        this.initialize();

        if (!this.notificationQueue) {
            return 0;
        }

        try {
            const failedJobs = await this.notificationQueue.getFailed(0, limit - 1);
            let retriedCount = 0;

            for (const job of failedJobs) {
                try {
                    await job.retry();
                    retriedCount++;
                    logger.info('Retried failed notification job', { jobId: job.id });
                } catch (error) {
                    logger.error('Failed to retry job', {
                        jobId: job.id,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }

            return retriedCount;
        } catch (error) {
            logger.error('Failed to retry failed jobs', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return 0;
        }
    }

    /**
     * Clean old completed and failed jobs
     */
    static async cleanOldJobs(): Promise<void> {
        this.initialize();

        if (!this.notificationQueue) {
            return;
        }

        try {
            // Clean jobs older than 7 days
            const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

            await this.notificationQueue.clean(gracePeriod, 'completed');
            await this.notificationQueue.clean(gracePeriod, 'failed');

            logger.info('Cleaned old queue jobs');
        } catch (error) {
            logger.error('Failed to clean old jobs', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Pause queue processing
     */
    static async pauseQueue(): Promise<void> {
        this.initialize();

        if (!this.notificationQueue) {
            return;
        }

        try {
            await this.notificationQueue.pause();
            logger.info('Notification queue paused');
        } catch (error) {
            logger.error('Failed to pause queue', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Resume queue processing
     */
    static async resumeQueue(): Promise<void> {
        this.initialize();

        if (!this.notificationQueue) {
            return;
        }

        try {
            await this.notificationQueue.resume();
            logger.info('Notification queue resumed');
        } catch (error) {
            logger.error('Failed to resume queue', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Start processing queue jobs
     */
    static startProcessing(): void {
        this.initialize();

        if (!this.notificationQueue) {
            logger.warn('Queue not available, cannot start processing');
            return;
        }

        // Process jobs with concurrency based on priority
        this.notificationQueue.process('process-notification', 10, async (job: Job) => {
            return await this.processQueueJob(job);
        });

        logger.info('Started processing notification queue');
    }

    // Private helper methods

    private static setupEventHandlers(): void {
        if (!this.notificationQueue) return;

        this.notificationQueue.on('completed', (job: Job, result: any) => {
            logger.info('Notification job completed', {
                jobId: job.id,
                type: job.data.type,
                result,
            });
        });

        this.notificationQueue.on('failed', async (job: Job, error: Error) => {
            logger.error('Notification job failed', {
                jobId: job.id,
                type: job.data.type,
                error: error.message,
                attempts: job.attemptsMade,
                maxAttempts: job.opts.attempts,
            });

            // Move to dead letter queue if max attempts reached
            if (job.attemptsMade >= (job.opts.attempts || 1)) {
                await this.moveToDeadLetterQueue(job);
            }
        });

        this.notificationQueue.on('stalled', (job: Job) => {
            logger.warn('Notification job stalled', {
                jobId: job.id,
                type: job.data.type,
            });
        });

        this.notificationQueue.on('progress', (job: Job, progress: number) => {
            logger.debug('Notification job progress', {
                jobId: job.id,
                progress,
            });
        });
    }

    private static async processQueueJob(job: Job): Promise<any> {
        const notificationJob: NotificationJob = job.data;

        try {
            // Import NotificationService dynamically to avoid circular dependency
            const { NotificationService } = await import('./notification.service');
            const success = await NotificationService.processNotificationJob(notificationJob);

            if (!success) {
                throw new Error('Notification processing failed');
            }

            return { success: true, jobId: notificationJob.id };
        } catch (error) {
            throw new Error(
                `Failed to process notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    private static async processNotificationDirectly(
        notificationJob: NotificationJob,
    ): Promise<void> {
        try {
            // Import NotificationService dynamically to avoid circular dependency
            const { NotificationService } = await import('./notification.service');
            await NotificationService.processNotificationJob(notificationJob);
        } catch (error) {
            logger.error('Failed to process notification directly', {
                jobId: notificationJob.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    private static getPriorityValue(priority: NotificationPriority): number {
        switch (priority) {
            case NotificationPriority.CRITICAL:
                return 1;
            case NotificationPriority.HIGH:
                return 2;
            case NotificationPriority.NORMAL:
                return 3;
            case NotificationPriority.LOW:
                return 4;
            default:
                return 3;
        }
    }

    private static async moveToDeadLetterQueue(job: Job): Promise<void> {
        if (!this.deadLetterQueue) return;

        try {
            await this.deadLetterQueue.add('failed-notification', {
                originalJobId: job.id,
                originalData: job.data,
                failureReason: job.failedReason,
                attempts: job.attemptsMade,
                timestamp: new Date().toISOString(),
            });

            logger.info('Moved job to dead letter queue', {
                jobId: job.id,
                type: job.data.type,
            });
        } catch (error) {
            logger.error('Failed to move job to dead letter queue', {
                jobId: job.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get jobs from dead letter queue
     */
    static async getDeadLetterJobs(limit: number = 50): Promise<any[]> {
        this.initialize();

        if (!this.deadLetterQueue) {
            return [];
        }

        try {
            const jobs = await this.deadLetterQueue.getCompleted(0, limit - 1);
            return jobs.map((job) => job.data);
        } catch (error) {
            logger.error('Failed to get dead letter jobs', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return [];
        }
    }

    /**
     * Health check for queue service
     */
    static async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
        try {
            this.initialize();

            if (!this.notificationQueue || !this.redis) {
                return { healthy: false, error: 'Queue service not initialized' };
            }

            // Test Redis connection
            await this.redis.ping();

            // Test queue connection
            await this.notificationQueue.getWaiting();

            return { healthy: true };
        } catch (error) {
            return {
                healthy: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Graceful shutdown
     */
    static async shutdown(): Promise<void> {
        try {
            if (this.notificationQueue) {
                await this.notificationQueue.close();
            }

            if (this.deadLetterQueue) {
                await this.deadLetterQueue.close();
            }

            if (this.redis) {
                await this.redis.disconnect();
            }

            logger.info('Queue service shutdown completed');
        } catch (error) {
            logger.error('Error during queue service shutdown', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}

// Initialize and start processing when the module is loaded
QueueService.initialize();
QueueService.startProcessing();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down queue service gracefully');
    await QueueService.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down queue service gracefully');
    await QueueService.shutdown();
    process.exit(0);
});
